import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/db";
import { ApiError } from "../middleware/errorHandler";
import { generateChallanNumber } from "../utils/challanNumber";
import { streamChallanPdf } from "../utils/challanPdf";

export const challanItemInput = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
});

export const createChallanSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(challanItemInput).min(1, "At least one product is required"),
  status: z.enum(["Draft", "Confirmed"]).optional().default("Draft"), // convenience for create+confirm in one call
});

export const updateChallanItemsSchema = z.object({
  items: z.array(challanItemInput).min(1),
});

// GET /challans?status=&customerId=&page=&pageSize=
export async function listChallans(req: Request, res: Response) {
  const { status, customerId } = req.query as Record<string, string | undefined>;
  const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
  const pageSize = Math.min(Math.max(parseInt((req.query.pageSize as string) || "20", 10), 1), 100);

  const where: any = {};
  if (status) where.status = status.toUpperCase();
  if (customerId) where.customerId = customerId;

  const [total, challans] = await prisma.$transaction([
    prisma.challan.count({ where }),
    prisma.challan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { customer: { select: { name: true, mobile: true } }, items: true },
    }),
  ]);

  res.json({
    data: challans,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function getChallan(req: Request, res: Response) {
  const challan = await prisma.challan.findUnique({
    where: { id: req.params.id },
    include: { customer: true, items: { include: { product: { select: { name: true, sku: true } } } } },
  });
  if (!challan) throw new ApiError(404, "Challan not found");
  res.json({ data: challan });
}

// GET /challans/:id/pdf — streams a printable dispatch-note PDF for the challan.
export async function exportChallanPdf(req: Request, res: Response) {
  const challan = await prisma.challan.findUnique({
    where: { id: req.params.id },
    include: { customer: true, items: true },
  });
  if (!challan) throw new ApiError(404, "Challan not found");

  streamChallanPdf(challan, res);
}

// Creates a challan as a Draft (default) with product snapshot data.
// Draft creation never touches stock. Pass status: "Confirmed" to also
// confirm immediately (stock will be validated/reduced in the same call).
export async function createChallan(req: Request, res: Response) {
  const { customerId, items, status } = req.body as z.infer<typeof createChallanSchema>;

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new ApiError(404, "Customer not found");

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

  if (products.length !== new Set(productIds).size) {
    throw new ApiError(400, "One or more products could not be found");
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const challanNumber = await generateChallanNumber();

  const challan = await prisma.challan.create({
    data: {
      challanNumber,
      customerId,
      totalQuantity,
      status: "DRAFT",
      createdById: req.user?.userId,
      items: {
        create: items.map((i) => {
          const p = productMap.get(i.productId)!;
          return {
            productId: p.id,
            productNameSnapshot: p.name,
            skuSnapshot: p.sku,
            unitPriceSnapshot: p.unitPrice,
            quantity: i.quantity,
          };
        }),
      },
    },
    include: { items: true, customer: true },
  });

  if (status === "Confirmed") {
    const confirmed = await confirmChallanInternal(challan.id, req.user?.userId);
    return res.status(201).json({ data: confirmed });
  }

  res.status(201).json({ data: challan });
}

// Replace the item list on a Draft challan (Confirmed/Cancelled challans are locked).
export async function updateChallanItems(req: Request, res: Response) {
  const { items } = req.body as z.infer<typeof updateChallanItemsSchema>;

  const challan = await prisma.challan.findUnique({ where: { id: req.params.id } });
  if (!challan) throw new ApiError(404, "Challan not found");
  if (challan.status !== "DRAFT") {
    throw new ApiError(400, `Cannot edit items on a ${challan.status.toLowerCase()} challan`);
  }

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== new Set(productIds).size) {
    throw new ApiError(400, "One or more products could not be found");
  }
  const productMap = new Map(products.map((p) => [p.id, p]));
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.challanItem.deleteMany({ where: { challanId: challan.id } });
    return tx.challan.update({
      where: { id: challan.id },
      data: {
        totalQuantity,
        items: {
          create: items.map((i) => {
            const p = productMap.get(i.productId)!;
            return {
              productId: p.id,
              productNameSnapshot: p.name,
              skuSnapshot: p.sku,
              unitPriceSnapshot: p.unitPrice,
              quantity: i.quantity,
            };
          }),
        },
      },
      include: { items: true },
    });
  });

  res.json({ data: updated });
}

// Shared logic used both by "create with status=Confirmed" and the dedicated confirm endpoint.
async function confirmChallanInternal(challanId: string, userId?: string) {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUnique({
      where: { id: challanId },
      include: { items: true },
    });
    if (!challan) throw new ApiError(404, "Challan not found");
    if (challan.status !== "DRAFT") {
      throw new ApiError(400, `Challan is already ${challan.status.toLowerCase()}`);
    }

    // Validate stock for ALL items first, so we never partially confirm.
    const productIds = challan.items.map((i) => i.productId);
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const shortages: { productName: string; requested: number; available: number }[] = [];
    for (const item of challan.items) {
      const product = productMap.get(item.productId);
      if (!product || product.currentStock < item.quantity) {
        shortages.push({
          productName: item.productNameSnapshot,
          requested: item.quantity,
          available: product?.currentStock ?? 0,
        });
      }
    }
    if (shortages.length > 0) {
      throw new ApiError(400, "Insufficient stock for one or more products", { shortages });
    }

    // Reduce stock and log each movement.
    for (const item of challan.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          quantity: item.quantity,
          movementType: "OUT",
          reason: `Sales challan ${challan.challanNumber} confirmed`,
          createdById: userId,
        },
      });
    }

    return tx.challan.update({
      where: { id: challanId },
      data: { status: "CONFIRMED" },
      include: { items: true, customer: true },
    });
  });
}

export async function confirmChallan(req: Request, res: Response) {
  const result = await confirmChallanInternal(req.params.id, req.user?.userId);
  res.json({ data: result });
}

// Cancels a challan. If it was already Confirmed, stock is restored
// (each item's quantity is put back as an IN movement) so inventory stays accurate.
export async function cancelChallan(req: Request, res: Response) {
  const result = await prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!challan) throw new ApiError(404, "Challan not found");
    if (challan.status === "CANCELLED") {
      throw new ApiError(400, "Challan is already cancelled");
    }

    if (challan.status === "CONFIRMED") {
      for (const item of challan.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            movementType: "IN",
            reason: `Sales challan ${challan.challanNumber} cancelled - stock restored`,
            createdById: req.user?.userId,
          },
        });
      }
    }

    return tx.challan.update({
      where: { id: req.params.id },
      data: { status: "CANCELLED" },
      include: { items: true },
    });
  });

  res.json({ data: result });
}

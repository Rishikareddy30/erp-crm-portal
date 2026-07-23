import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/db";
import { ApiError } from "../middleware/errorHandler";
import { MovementType } from "@prisma/client";

export const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().optional().nullable(),
  unitPrice: z.coerce.number().nonnegative(),
  currentStock: z.coerce.number().int().nonnegative().default(0),
  minStockAlert: z.coerce.number().int().nonnegative().default(0),
  location: z.string().optional().nullable(),
});

export const productUpdateSchema = productSchema.partial();

export const stockMovementSchema = z.object({
  quantity: z.coerce.number().int().positive(),
  movementType: z.nativeEnum(MovementType),
  reason: z.string().min(1),
});

// GET /products?search=&category=&lowStock=true&page=&pageSize=
export async function listProducts(req: Request, res: Response) {
  const { search, category, lowStock } = req.query as Record<string, string | undefined>;
  const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
  const pageSize = Math.min(Math.max(parseInt((req.query.pageSize as string) || "20", 10), 1), 100);

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }
  if (category) where.category = category;

  let products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    ...(lowStock === "true" ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
  });

  if (lowStock === "true") {
    products = products.filter((p) => p.currentStock <= p.minStockAlert);
  }

  const total = await prisma.product.count({ where });

  res.json({
    data: products,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function getProduct(req: Request, res: Response) {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { stockMovements: { orderBy: { createdAt: "desc" }, take: 50 } },
  });
  if (!product) throw new ApiError(404, "Product not found");
  res.json({ data: product });
}

export async function createProduct(req: Request, res: Response) {
  const data = req.body as z.infer<typeof productSchema>;

  const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (existingSku) throw new ApiError(409, "A product with this SKU already exists");

  const product = await prisma.product.create({ data });

  // If created with initial stock, log it as an IN movement for audit purposes
  if (product.currentStock > 0) {
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        quantity: product.currentStock,
        movementType: "IN",
        reason: "Initial stock on product creation",
        createdById: req.user?.userId,
      },
    });
  }

  res.status(201).json({ data: product });
}

export async function updateProduct(req: Request, res: Response) {
  const data = req.body as z.infer<typeof productUpdateSchema>;
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Product not found");

  // Direct stock edits here are NOT allowed; use the stock-movement endpoint
  // so every stock change is logged.
  const { currentStock, ...rest } = data;

  const product = await prisma.product.update({ where: { id: req.params.id }, data: rest });
  res.json({ data: product });
}

// POST /products/:id/stock-movements
// The only sanctioned way to change currentStock — keeps stock and the audit log in sync.
export async function addStockMovement(req: Request, res: Response) {
  const { quantity, movementType, reason } = req.body as z.infer<typeof stockMovementSchema>;

  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) throw new ApiError(404, "Product not found");

  if (movementType === "OUT" && product.currentStock < quantity) {
    throw new ApiError(
      400,
      `Insufficient stock. Available: ${product.currentStock}, requested: ${quantity}`
    );
  }

  const newStock =
    movementType === "IN" ? product.currentStock + quantity : product.currentStock - quantity;

  const [, movement] = await prisma.$transaction([
    prisma.product.update({ where: { id: product.id }, data: { currentStock: newStock } }),
    prisma.stockMovement.create({
      data: {
        productId: product.id,
        quantity,
        movementType,
        reason,
        createdById: req.user?.userId,
      },
    }),
  ]);

  res.status(201).json({ data: movement, newStock });
}

import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/db";
import { ApiError } from "../middleware/errorHandler";
import { CustomerStatus, CustomerType } from "@prisma/client";

export const customerSchema = z.object({
  name: z.string().min(1),
  mobile: z.string().min(5),
  email: z.string().email().optional().nullable(),
  businessName: z.string().optional().nullable(),
  gstNumber: z.string().optional().nullable(),
  customerType: z.nativeEnum(CustomerType).default("RETAIL"),
  address: z.string().optional().nullable(),
  status: z.nativeEnum(CustomerStatus).default("LEAD"),
  followUpDate: z.coerce.date().optional().nullable(),
});

export const customerUpdateSchema = customerSchema.partial();

export const noteSchema = z.object({
  note: z.string().min(1),
});

// GET /customers?search=&status=&type=&page=&pageSize=
export async function listCustomers(req: Request, res: Response) {
  const { search, status, type } = req.query as Record<string, string | undefined>;
  const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
  const pageSize = Math.min(Math.max(parseInt((req.query.pageSize as string) || "20", 10), 1), 100);

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { mobile: { contains: search } },
      { businessName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;
  if (type) where.customerType = type;

  const [total, customers] = await prisma.$transaction([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  res.json({
    data: customers,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function getCustomer(req: Request, res: Response) {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      notes: { orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true } } } },
      challans: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!customer) throw new ApiError(404, "Customer not found");
  res.json({ data: customer });
}

export async function createCustomer(req: Request, res: Response) {
  const data = req.body as z.infer<typeof customerSchema>;
  const customer = await prisma.customer.create({ data });
  res.status(201).json({ data: customer });
}

export async function updateCustomer(req: Request, res: Response) {
  const data = req.body as z.infer<typeof customerUpdateSchema>;
  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Customer not found");

  const customer = await prisma.customer.update({ where: { id: req.params.id }, data });
  res.json({ data: customer });
}

export async function addCustomerNote(req: Request, res: Response) {
  const { note } = req.body as z.infer<typeof noteSchema>;
  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Customer not found");

  const created = await prisma.customerNote.create({
    data: { customerId: req.params.id, note, createdById: req.user?.userId },
  });
  res.status(201).json({ data: created });
}

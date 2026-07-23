import { prisma } from "../config/db";

// Generates a challan number like CH-2026-000123.
// Uses a per-year count of existing challans as the sequence source.
// NOTE: for very high concurrency this simple approach could theoretically
// produce a collision; the DB's unique constraint on challanNumber
// guarantees we'd never save a duplicate, and the caller can retry.
export async function generateChallanNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CH-${year}-`;

  const count = await prisma.challan.count({
    where: { challanNumber: { startsWith: prefix } },
  });

  const next = (count + 1).toString().padStart(6, "0");
  return `${prefix}${next}`;
}

import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient instance across the app (important in dev with hot reload)
export const prisma = new PrismaClient();

import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "./config/db";

async function main() {
  console.log("Seeding database...");

  const password = await bcrypt.hash("password123", 10);

  const users = [
    { name: "Admin User", email: "admin@erp.test", role: "ADMIN" as const },
    { name: "Sales User", email: "sales@erp.test", role: "SALES" as const },
    { name: "Warehouse User", email: "warehouse@erp.test", role: "WAREHOUSE" as const },
    { name: "Accounts User", email: "accounts@erp.test", role: "ACCOUNTS" as const },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: password },
    });
  }
  console.log("Users seeded. All passwords: password123");

  const customer = await prisma.customer.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ramesh Traders",
      mobile: "9876543210",
      email: "ramesh@example.com",
      businessName: "Ramesh Traders Pvt Ltd",
      customerType: "WHOLESALE",
      address: "MG Road, Hyderabad",
      status: "ACTIVE",
    },
  });
  console.log(`Sample customer: ${customer.name}`);

  const product = await prisma.product.upsert({
    where: { sku: "SKU-001" },
    update: {},
    create: {
      name: "Steel Bolt 8mm",
      sku: "SKU-001",
      category: "Hardware",
      unitPrice: 5.5,
      currentStock: 500,
      minStockAlert: 50,
      location: "Warehouse A - Rack 3",
    },
  });
  console.log(`Sample product: ${product.name} (stock: ${product.currentStock})`);

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

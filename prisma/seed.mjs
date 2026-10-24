import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.shopSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      shopName: "Prince Brass Trading Co.",
      city: "Ambala",
      stateName: "Haryana",
      stateCode: "06",
      invoicePrefix: "INV",
      challanPrefix: "DC",
      termsNote: "Goods once sold will not be taken back. Interest @18% p.a. on overdue payments.",
    },
  });

  const existing = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!existing) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        username: "admin",
        passwordHash,
        name: "Owner",
        role: "owner",
      },
    });
    console.log("Created admin user: admin / admin123");
  } else {
    console.log("admin user already exists — skipped");
  }

  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

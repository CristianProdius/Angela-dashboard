import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL environment variable is required");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Upsert default settings
  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      businessName: "Frizerie",
      timezone: "Europe/Chisinau",
      workStartHour: 8,
      workEndHour: 20,
      slotInterval: 30,
    },
  });

  // Seed default services
  const services = [
    { name: "Tuns", durationMinutes: 30, price: 150 },
    { name: "Barba", durationMinutes: 20, price: 100 },
    { name: "Tuns + Barba", durationMinutes: 45, price: 220 },
    { name: "Sprancene", durationMinutes: 10, price: 50 },
    { name: "Pigmentare", durationMinutes: 60, price: 300 },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { id: service.name.toLowerCase().replace(/\s+/g, "-") },
      update: {},
      create: {
        id: service.name.toLowerCase().replace(/\s+/g, "-"),
        ...service,
      },
    });
  }

  // Seed admin accounts
  const rawPassword = process.env.ADMIN_SEED_PASSWORD || "admin123";
  const adminPassword = await bcrypt.hash(rawPassword, 12);
  console.log("Admin accounts seeded (change password via Settings after first login)");
  const admins = [
    { phone: "37368200722", name: "Admin 1" },
    { phone: "37369165304", name: "Admin 2" },
  ];

  for (const admin of admins) {
    await prisma.client.upsert({
      where: { phone: admin.phone },
      update: { isAdmin: true, passwordHash: adminPassword },
      create: {
        name: admin.name,
        phone: admin.phone,
        passwordHash: adminPassword,
        isAdmin: true,
      },
    });
  }

  console.log("Seed completed successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

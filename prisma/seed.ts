import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://barber:barber123@localhost:5432/barberapp?schema=public";
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

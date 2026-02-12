import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const blockedDates = await prisma.blockedDate.findMany({
      where: {
        endDate: { gte: new Date() },
      },
      orderBy: { startDate: "asc" },
    });
    return NextResponse.json(blockedDates);
  } catch (error) {
    console.error("GET /api/client/blocked-dates error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

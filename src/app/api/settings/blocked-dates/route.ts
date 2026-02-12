import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { blockedDateSchema } from "@/lib/validators";

export async function GET() {
  try {
    const blockedDates = await prisma.blockedDate.findMany({
      orderBy: { startDate: "asc" },
    });
    return NextResponse.json(blockedDates);
  } catch (error) {
    console.error("GET /api/settings/blocked-dates error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = blockedDateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { startDate, endDate, reason } = parsed.data;

    const blockedDate = await prisma.blockedDate.create({
      data: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason || null,
      },
    });

    return NextResponse.json(blockedDate, { status: 201 });
  } catch (error) {
    console.error("POST /api/settings/blocked-dates error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

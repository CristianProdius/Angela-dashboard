import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search");

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
          ],
        }
      : {};

    const clients = await prisma.client.findMany({
      where,
      orderBy: { name: "asc" },
      take: 200,
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("GET /api/clients error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = clientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check for duplicate phone
    const existing = await prisma.client.findUnique({
      where: { phone: parsed.data.phone },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Exista deja un client cu acest numar de telefon" },
        { status: 409 }
      );
    }

    const client = await prisma.client.create({
      data: parsed.data,
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("POST /api/clients error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

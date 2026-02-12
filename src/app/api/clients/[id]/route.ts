import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        appointments: {
          include: {
            services: { include: { service: true } },
          },
          orderBy: { dateTime: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Clientul nu a fost gasit" },
        { status: 404 }
      );
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("GET /api/clients/[id] error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = clientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check for duplicate phone (exclude current client)
    const existing = await prisma.client.findFirst({
      where: { phone: parsed.data.phone, id: { not: id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Exista deja un client cu acest numar de telefon" },
        { status: 409 }
      );
    }

    const client = await prisma.client.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("PUT /api/clients/[id] error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if client has appointments
    const appointmentCount = await prisma.appointment.count({
      where: { clientId: id },
    });

    if (appointmentCount > 0) {
      return NextResponse.json(
        { error: "Nu se poate sterge un client cu programari" },
        { status: 400 }
      );
    }

    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/clients/[id] error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

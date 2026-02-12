import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appointmentSchema } from "@/lib/validators";
import { sendConfirmation } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    if (from || to) {
      where.dateTime = {};
      if (from) (where.dateTime as Record<string, unknown>).gte = new Date(from);
      if (to) (where.dateTime as Record<string, unknown>).lte = new Date(to);
    }

    if (status) {
      where.status = status;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: true,
        services: { include: { service: true } },
      },
      orderBy: { dateTime: "asc" },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("GET /api/appointments error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = appointmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { clientId, dateTime, serviceIds, notes } = parsed.data;

    // Fetch services to calculate total duration and end time
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds }, active: true },
    });

    if (services.length === 0) {
      return NextResponse.json(
        { error: "Niciun serviciu valid selectat" },
        { status: 400 }
      );
    }

    const totalDuration = services.reduce(
      (sum, s) => sum + s.durationMinutes,
      0
    );

    const startDate = new Date(dateTime);
    const endDate = new Date(startDate.getTime() + totalDuration * 60000);

    // Conflict detection: check for overlapping appointments
    const conflicts = await prisma.appointment.findMany({
      where: {
        status: { in: ["SCHEDULED", "PENDING"] },
        dateTime: { lt: endDate },
        endDateTime: { gt: startDate },
      },
    });

    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: "Conflict de orar cu alta programare" },
        { status: 409 }
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        dateTime: startDate,
        endDateTime: endDate,
        notes,
        services: {
          create: services.map((s) => ({
            serviceId: s.id,
            priceAtBooking: s.price,
          })),
        },
      },
      include: {
        client: true,
        services: { include: { service: true } },
      },
    });

    // Fire-and-forget WhatsApp confirmation
    sendConfirmation(appointment.id).catch((err) =>
      console.error("Notification error:", err)
    );

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("POST /api/appointments error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

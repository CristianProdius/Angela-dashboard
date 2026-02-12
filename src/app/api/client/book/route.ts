import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientBookingSchema } from "@/lib/validators";
import { getClientFromRequest } from "@/lib/client-auth";
import { startOfDay, endOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export async function POST(request: NextRequest) {
  try {
    const client = getClientFromRequest(request);
    if (!client) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = clientBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { serviceIds, dateTime } = parsed.data;

    // Validate services
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds }, active: true },
    });

    if (services.length === 0) {
      return NextResponse.json(
        { error: "Niciun serviciu valid selectat" },
        { status: 400 }
      );
    }

    if (services.length !== serviceIds.length) {
      return NextResponse.json(
        { error: "Unul sau mai multe servicii nu sunt disponibile" },
        { status: 400 }
      );
    }

    const totalDuration = services.reduce(
      (sum, s) => sum + s.durationMinutes,
      0
    );

    const startDate = new Date(dateTime);
    const endDate = new Date(startDate.getTime() + totalDuration * 60000);

    // Validate future date
    if (startDate <= new Date()) {
      return NextResponse.json(
        { error: "Programarea trebuie sa fie in viitor" },
        { status: 400 }
      );
    }

    // Check work hours
    const settings = await prisma.settings.findFirst();
    if (settings) {
      const tz = settings.timezone || "Europe/Chisinau";
      const zonedStart = toZonedTime(startDate, tz);
      const zonedEnd = toZonedTime(endDate, tz);
      const startHour = zonedStart.getHours() + zonedStart.getMinutes() / 60;
      const endHour = zonedEnd.getHours() + zonedEnd.getMinutes() / 60;
      if (startHour < settings.workStartHour || endHour > settings.workEndHour) {
        return NextResponse.json(
          { error: "Ora selectata este in afara programului de lucru" },
          { status: 400 }
        );
      }
    }

    // Check blocked dates (convert to business timezone before day boundary calc)
    const tz = settings?.timezone || "Europe/Chisinau";
    const zonedDate = toZonedTime(startDate, tz);
    const dayStart = startOfDay(zonedDate);
    const dayEnd = endOfDay(zonedDate);
    const blockedDate = await prisma.blockedDate.findFirst({
      where: {
        startDate: { lte: dayEnd },
        endDate: { gte: dayStart },
      },
    });

    if (blockedDate) {
      return NextResponse.json(
        { error: "Aceasta zi nu este disponibila" },
        { status: 400 }
      );
    }

    // Conflict detection + create in serializable transaction to prevent TOCTOU race
    const appointment = await prisma.$transaction(async (tx) => {
      const conflicts = await tx.appointment.findMany({
        where: {
          status: { in: ["SCHEDULED", "PENDING"] },
          dateTime: { lt: endDate },
          endDateTime: { gt: startDate },
        },
      });

      if (conflicts.length > 0) {
        throw new Error("CONFLICT");
      }

      return tx.appointment.create({
        data: {
          clientId: client.clientId,
          dateTime: startDate,
          endDateTime: endDate,
          status: "PENDING",
          services: {
            create: services.map((s) => ({
              serviceId: s.id,
              priceAtBooking: s.price,
            })),
          },
        },
        include: {
          services: { include: { service: true } },
        },
      });
    }, { isolationLevel: "Serializable" }).catch((err) => {
      if (err.message === "CONFLICT") return null;
      throw err;
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Acest slot nu mai este disponibil" },
        { status: 409 }
      );
    }

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("POST /api/client/book error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

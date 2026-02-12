import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, addMinutes, parse, isBefore } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const dateStr = searchParams.get("date");
    const serviceIdsStr = searchParams.get("serviceIds");

    if (!dateStr || !serviceIdsStr) {
      return NextResponse.json(
        { error: "date si serviceIds sunt obligatorii" },
        { status: 400 }
      );
    }

    const serviceIds = serviceIdsStr.split(",").filter(Boolean);
    if (serviceIds.length === 0) {
      return NextResponse.json(
        { error: "Selectati cel putin un serviciu" },
        { status: 400 }
      );
    }

    // Fetch settings
    const settings = await prisma.settings.findFirst();
    if (!settings) {
      return NextResponse.json(
        { error: "Setarile nu sunt configurate" },
        { status: 500 }
      );
    }

    // Fetch services to calculate total duration
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

    // Parse the date
    const date = new Date(dateStr + "T00:00:00");
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // Check if date is blocked
    const blockedDate = await prisma.blockedDate.findFirst({
      where: {
        startDate: { lte: dayEnd },
        endDate: { gte: dayStart },
      },
    });

    if (blockedDate) {
      return NextResponse.json([]);
    }

    // Fetch existing appointments for this day
    const appointments = await prisma.appointment.findMany({
      where: {
        dateTime: { gte: dayStart, lte: dayEnd },
        status: { in: ["SCHEDULED", "PENDING"] },
      },
    });

    const timezone = settings.timezone || "Europe/Chisinau";
    const nowInTz = toZonedTime(new Date(), timezone);

    // Generate slots
    const slots: string[] = [];
    const start = settings.workStartHour * 60;
    const end = settings.workEndHour * 60;

    for (let m = start; m < end; m += settings.slotInterval) {
      const hours = Math.floor(m / 60);
      const mins = m % 60;
      const timeStr = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;

      const slotStart = parse(timeStr, "HH:mm", date);
      const slotEnd = addMinutes(slotStart, totalDuration);

      // Skip past times if today
      const slotInTz = toZonedTime(slotStart, timezone);
      if (isBefore(slotInTz, nowInTz)) continue;

      // Skip if slot end exceeds work hours
      const endMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();
      if (endMinutes > settings.workEndHour * 60) continue;

      // Check for conflicts
      const hasConflict = appointments.some((apt) => {
        const aptStart = new Date(apt.dateTime);
        const aptEnd = new Date(apt.endDateTime);
        return slotStart < aptEnd && slotEnd > aptStart;
      });

      if (!hasConflict) {
        slots.push(timeStr);
      }
    }

    return NextResponse.json(slots);
  } catch (error) {
    console.error("GET /api/client/slots error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

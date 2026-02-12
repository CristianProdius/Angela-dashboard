import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addMinutes, isBefore } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

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

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json(
        { error: "Format data invalid (asteptat: YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const testDate = new Date(dateStr + "T12:00:00Z");
    if (isNaN(testDate.getTime())) {
      return NextResponse.json(
        { error: "Data invalida" },
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

    const timezone = settings.timezone || "Europe/Chisinau";

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

    // Construct day boundaries in the business timezone, then convert to UTC for DB queries
    // dateStr is "YYYY-MM-DD" — treat as a date in the business timezone
    const dayStartUtc = fromZonedTime(new Date(dateStr + "T00:00:00"), timezone);
    const dayEndUtc = fromZonedTime(new Date(dateStr + "T23:59:59.999"), timezone);

    // Check if date is blocked
    const blockedDate = await prisma.blockedDate.findFirst({
      where: {
        startDate: { lte: dayEndUtc },
        endDate: { gte: dayStartUtc },
      },
    });

    if (blockedDate) {
      return NextResponse.json([]);
    }

    // Fetch existing appointments for this day (UTC range)
    const appointments = await prisma.appointment.findMany({
      where: {
        dateTime: { gte: dayStartUtc, lte: dayEndUtc },
        status: { in: ["SCHEDULED", "PENDING"] },
      },
    });

    // Current time in business timezone for "is past?" filtering
    const nowInTz = toZonedTime(new Date(), timezone);

    // Generate slots — all times constructed in business timezone, then converted to UTC
    const slots: string[] = [];
    const startMinutes = settings.workStartHour * 60;
    const endMinutes = settings.workEndHour * 60;

    for (let m = startMinutes; m < endMinutes; m += settings.slotInterval) {
      const hours = Math.floor(m / 60);
      const mins = m % 60;
      const timeStr = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;

      // Construct slot start as business-TZ wall clock, then get UTC for comparison
      const slotStartUtc = fromZonedTime(
        new Date(`${dateStr}T${timeStr}:00`),
        timezone
      );
      const slotEndUtc = addMinutes(slotStartUtc, totalDuration);

      // Skip past times if today (compare in business timezone)
      const slotInTz = toZonedTime(slotStartUtc, timezone);
      if (isBefore(slotInTz, nowInTz)) continue;

      // Skip if slot end exceeds work hours (check in business timezone)
      const slotEndInTz = toZonedTime(slotEndUtc, timezone);
      const slotEndMinutes = slotEndInTz.getHours() * 60 + slotEndInTz.getMinutes();
      if (slotEndMinutes > endMinutes) continue;

      // Check for conflicts against UTC appointment times
      const hasConflict = appointments.some((apt) => {
        const aptStart = new Date(apt.dateTime);
        const aptEnd = new Date(apt.endDateTime);
        return slotStartUtc < aptEnd && slotEndUtc > aptStart;
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

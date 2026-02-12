import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReminder } from "@/lib/notifications";
import { addDays, startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export async function GET() {
  try {
    const settings = await prisma.settings.findFirst();
    const timezone = settings?.timezone || "Europe/Chisinau";

    const nowInTz = toZonedTime(new Date(), timezone);
    const tomorrowInTz = addDays(nowInTz, 1);
    const tomorrowStart = fromZonedTime(startOfDay(tomorrowInTz), timezone);
    const tomorrowEnd = fromZonedTime(endOfDay(tomorrowInTz), timezone);

    const appointments = await prisma.appointment.findMany({
      where: {
        dateTime: {
          gte: tomorrowStart,
          lte: tomorrowEnd,
        },
        status: "SCHEDULED",
        reminderSent: false,
      },
    });

    let sent = 0;
    for (const appointment of appointments) {
      await sendReminder(appointment.id);
      sent++;
    }

    return NextResponse.json({
      success: true,
      reminders_sent: sent,
      total_found: appointments.length,
    });
  } catch (error) {
    console.error("Cron reminder error:", error);
    return NextResponse.json(
      { error: "Failed to send reminders" },
      { status: 500 }
    );
  }
}

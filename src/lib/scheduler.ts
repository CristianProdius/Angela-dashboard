import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { sendReminder } from "@/lib/notifications";
import { addDays, startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export function startScheduler() {
  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    console.log("[Scheduler] Running reminder check...");
    try {
      const settings = await prisma.settings.findFirst();
      const timezone = settings?.timezone || "Europe/Chisinau";

      // Calculate "tomorrow" in the business timezone
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

      console.log(
        `[Scheduler] Found ${appointments.length} appointments needing reminders`
      );

      for (const appointment of appointments) {
        await sendReminder(appointment.id);
      }
    } catch (error) {
      console.error("[Scheduler] Error:", error);
    }
  });

  console.log("[Scheduler] Reminder scheduler started (runs every hour)");
}

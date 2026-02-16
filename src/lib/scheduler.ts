import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { sendReminder } from "@/lib/notifications";
import { sendTextMessage } from "@/lib/waha";
import { addDays, startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export function startScheduler() {
  // Run every hour at minute 0 — send reminders
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
      console.error("[Scheduler] Reminder error:", error);
    }
  });

  console.log("[Scheduler] Reminder scheduler started (runs every hour)");

  // Run every 15 minutes — process queued messages (quiet hours)
  cron.schedule("*/15 * * * *", async () => {
    try {
      const now = new Date();
      const pending = await prisma.pendingMessage.findMany({
        where: {
          sent: false,
          scheduledFor: { lte: now },
        },
        take: 50,
        orderBy: { scheduledFor: "asc" },
      });

      if (pending.length === 0) return;

      console.log(`[Scheduler] Processing ${pending.length} queued messages`);

      for (const msg of pending) {
        try {
          await sendTextMessage(msg.phone, msg.message);
          await prisma.pendingMessage.update({
            where: { id: msg.id },
            data: { sent: true },
          });
        } catch (error) {
          console.error(`[Scheduler] Failed to send queued message ${msg.id}:`, error);
          // Leave sent=false for retry on next cycle
        }
      }
    } catch (error) {
      console.error("[Scheduler] Pending message error:", error);
    }
  });

  console.log("[Scheduler] Pending message processor started (runs every 15 min)");
}

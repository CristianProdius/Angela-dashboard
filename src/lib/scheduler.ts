import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { sendReminder } from "@/lib/notifications";
import { sendTextMessage } from "@/lib/waha";
import { addDays, startOfDay, endOfDay, subDays } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const MAX_RETRIES = 5;
let pendingMessageLock = false;

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
    if (pendingMessageLock) {
      console.log("[Scheduler] Pending message processor already running, skipping");
      return;
    }

    pendingMessageLock = true;
    try {
      const now = new Date();
      const pending = await prisma.pendingMessage.findMany({
        where: {
          sent: false,
          retryCount: { lt: MAX_RETRIES },
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
            data: { sent: true, sentAt: new Date() },
          });
        } catch (error) {
          console.error(`[Scheduler] Failed to send queued message ${msg.id} (retry ${msg.retryCount + 1}/${MAX_RETRIES}):`, error);
          await prisma.pendingMessage.update({
            where: { id: msg.id },
            data: { retryCount: { increment: 1 } },
          });
        }
      }
    } catch (error) {
      console.error("[Scheduler] Pending message error:", error);
    } finally {
      pendingMessageLock = false;
    }
  });

  console.log("[Scheduler] Pending message processor started (runs every 15 min)");

  // Run daily at 3am — clean up sent messages older than 30 days
  cron.schedule("0 3 * * *", async () => {
    try {
      const cutoff = subDays(new Date(), 30);
      const result = await prisma.pendingMessage.deleteMany({
        where: {
          sent: true,
          sentAt: { lt: cutoff },
        },
      });
      if (result.count > 0) {
        console.log(`[Scheduler] Cleaned up ${result.count} old sent messages`);
      }
    } catch (error) {
      console.error("[Scheduler] Cleanup error:", error);
    }
  });

  console.log("[Scheduler] Sent message cleanup scheduled (runs daily at 3am)");
}

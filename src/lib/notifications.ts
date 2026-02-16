import { prisma } from "@/lib/prisma";
import { sendTextMessage } from "@/lib/waha";
import { format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { ro } from "date-fns/locale";
import type { MessageTemplate } from "@/generated/prisma/client";
import type { MessageTemplateType } from "@/generated/prisma/enums";

// --- Timezone helpers ---

async function getTimezone(): Promise<string> {
  const settings = await prisma.settings.findFirst();
  return settings?.timezone || "Europe/Chisinau";
}

function formatDateTime(date: Date, timezone: string): string {
  const zonedDate = toZonedTime(date, timezone);
  return format(zonedDate, "dd/MM/yyyy 'la' HH:mm", { locale: ro });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Template cache (5-min TTL) ---

let templateCache: Map<MessageTemplateType, MessageTemplate> | null = null;
let templateCacheTime = 0;
const TEMPLATE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getTemplates(): Promise<Map<MessageTemplateType, MessageTemplate>> {
  const now = Date.now();
  if (templateCache && now - templateCacheTime < TEMPLATE_CACHE_TTL) {
    return templateCache;
  }

  const templates = await prisma.messageTemplate.findMany();
  const map = new Map<MessageTemplateType, MessageTemplate>();
  for (const t of templates) {
    map.set(t.type as MessageTemplateType, t);
  }
  templateCache = map;
  templateCacheTime = now;
  return map;
}

function replaceVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

export function invalidateTemplateCache() {
  templateCache = null;
  templateCacheTime = 0;
}

// --- Quiet hours ---

export interface QuietHoursConfig {
  enabled: boolean;
  start: number; // 0-23
  end: number;   // 0-23
  timezone: string;
}

export async function getQuietHoursConfig(): Promise<QuietHoursConfig> {
  const settings = await prisma.settings.findFirst();
  return {
    enabled: settings?.quietHoursEnabled ?? false,
    start: settings?.quietHoursStart ?? 22,
    end: settings?.quietHoursEnd ?? 8,
    timezone: settings?.timezone || "Europe/Chisinau",
  };
}

export function isInQuietHours(config: QuietHoursConfig): boolean {
  if (!config.enabled) return false;

  const now = toZonedTime(new Date(), config.timezone);
  const currentHour = now.getHours();

  if (config.start > config.end) {
    // Wraps midnight: e.g. 22:00 - 08:00
    return currentHour >= config.start || currentHour < config.end;
  } else {
    // Same day: e.g. 13:00 - 15:00
    return currentHour >= config.start && currentHour < config.end;
  }
}

export function getQuietHoursEndTime(config: QuietHoursConfig): Date {
  const now = toZonedTime(new Date(), config.timezone);
  const endToday = new Date(now);
  endToday.setHours(config.end, 0, 0, 0);

  // If quiet end is in the future today, use it
  if (endToday > now) {
    return fromZonedTime(endToday, config.timezone);
  }

  // Otherwise, it's tomorrow
  endToday.setDate(endToday.getDate() + 1);
  return fromZonedTime(endToday, config.timezone);
}

// --- Send or queue ---

async function sendOrQueue(phone: string, message: string, bypassQuietHours = false): Promise<void> {
  const config = await getQuietHoursConfig();

  if (bypassQuietHours || !isInQuietHours(config)) {
    await sendTextMessage(phone, message);
  } else {
    const scheduledFor = getQuietHoursEndTime(config);
    await prisma.pendingMessage.create({
      data: {
        phone,
        message,
        scheduledFor,
      },
    });
    console.log(`[QuietHours] Queued message for ${phone}, scheduled for ${scheduledFor.toISOString()}`);
  }
}

// --- Notification functions ---

export async function sendFirstTimeIntro(phone: string, clientName: string) {
  const templates = await getTemplates();
  const template = templates.get("FIRST_TIME_INTRO");

  if (template && !template.active) return;

  const message = template
    ? replaceVariables(template.content, { clientName })
    : `Salut ${clientName}! 💇‍♀️ Asta-i Angela!\nDe acum o sa-ti trimit confirmarile si reminder-ele pentru programari pe aici. 😊`;

  await sendOrQueue(phone, message);
}

export async function sendConfirmation(appointmentId: string) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        services: { include: { service: true } },
      },
    });

    if (!appointment) return;

    // Check if this is a first-time client
    if (!appointment.client.firstMessageSent) {
      await sendFirstTimeIntro(
        appointment.client.phone,
        appointment.client.name
      );
      await sleep(2000);
      await prisma.client.update({
        where: { id: appointment.client.id },
        data: { firstMessageSent: true },
      });
    }

    const templates = await getTemplates();
    const template = templates.get("CONFIRMATION");

    if (template && !template.active) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { notificationSent: true },
      });
      return;
    }

    const timezone = await getTimezone();

    const serviceList = appointment.services
      .map((s) => `- ${s.service.name}`)
      .join("\n");

    const total = appointment.services.reduce(
      (sum, s) => sum + s.priceAtBooking,
      0
    );

    const message = template
      ? replaceVariables(template.content, {
          clientName: appointment.client.name,
          dateTime: formatDateTime(appointment.dateTime, timezone),
          serviceList,
          total: total.toFixed(2),
        })
      : `Buna ${appointment.client.name}! ✂️\n\nProgramarea ta a fost confirmata:\n\n📅 ${formatDateTime(appointment.dateTime, timezone)}\n\nServicii:\n${serviceList}\n\n💰 Total: ${total.toFixed(2)} MDL\n\nPe curand! 👋`;

    await sendOrQueue(appointment.client.phone, message);

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { notificationSent: true },
    });
  } catch (error) {
    console.error("Failed to send confirmation:", error);
  }
}

export async function sendReminder(appointmentId: string) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        services: { include: { service: true } },
      },
    });

    if (!appointment) return;

    const templates = await getTemplates();
    const template = templates.get("REMINDER");

    if (template && !template.active) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { reminderSent: true },
      });
      return;
    }

    const timezone = await getTimezone();

    const serviceList = appointment.services
      .map((s) => `- ${s.service.name}`)
      .join("\n");

    const message = template
      ? replaceVariables(template.content, {
          clientName: appointment.client.name,
          dateTime: formatDateTime(appointment.dateTime, timezone),
          serviceList,
        })
      : `Reminder! 📋\n\nBuna ${appointment.client.name}, ai o programare maine:\n\n📅 ${formatDateTime(appointment.dateTime, timezone)}\n\nServicii:\n${serviceList}\n\nDaca doresti sa anulezi sau sa reprogramezi, da-mi un mesaj. Pe maine! 👋`;

    await sendOrQueue(appointment.client.phone, message);

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { reminderSent: true },
    });
  } catch (error) {
    console.error("Failed to send reminder:", error);
  }
}

export async function sendAppointmentDeclined(appointmentId: string) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        services: { include: { service: true } },
      },
    });

    if (!appointment) return;

    const templates = await getTemplates();
    const template = templates.get("APPOINTMENT_DECLINED");

    if (template && !template.active) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { cancellationSent: true },
      });
      return;
    }

    const timezone = await getTimezone();

    const message = template
      ? replaceVariables(template.content, {
          clientName: appointment.client.name,
          dateTime: formatDateTime(appointment.dateTime, timezone),
        })
      : `Buna ${appointment.client.name},\n\nDin pacate, programarea ta din ${formatDateTime(appointment.dateTime, timezone)} nu a putut fi confirmata.\n\nTe rugam sa alegi un alt interval orar. Ne cerem scuze pentru inconvenient! 🙏`;

    await sendOrQueue(appointment.client.phone, message);

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { cancellationSent: true },
    });
  } catch (error) {
    console.error("Failed to send decline notification:", error);
  }
}

export async function sendPasswordResetOTP(phone: string, code: string) {
  try {
    const templates = await getTemplates();
    const template = templates.get("PASSWORD_RESET_OTP");

    if (template && !template.active) return;

    const message = template
      ? replaceVariables(template.content, { code })
      : `Codul tau de resetare a parolei este: ${code}\n\nCodul expira in 15 minute. Daca nu ai cerut resetarea parolei, ignora acest mesaj.`;

    // OTPs bypass quiet hours (time-sensitive, 15-min expiry)
    await sendOrQueue(phone, message, true);
  } catch (error) {
    console.error("Failed to send password reset OTP:", error);
  }
}

export async function sendReschedule(
  appointmentId: string,
  oldDateTime: Date
) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        services: { include: { service: true } },
      },
    });

    if (!appointment) return;

    const templates = await getTemplates();
    const template = templates.get("RESCHEDULE");

    if (template && !template.active) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { rescheduleSent: true, reminderSent: false },
      });
      return;
    }

    const timezone = await getTimezone();

    const serviceList = appointment.services
      .map((s) => `- ${s.service.name}`)
      .join("\n");

    const message = template
      ? replaceVariables(template.content, {
          clientName: appointment.client.name,
          oldDateTime: formatDateTime(oldDateTime, timezone),
          newDateTime: formatDateTime(appointment.dateTime, timezone),
          serviceList,
        })
      : `Hei ${appointment.client.name}! 📅 Programarea ta a fost reprogramata:\n\n❌ Vechea data: ${formatDateTime(oldDateTime, timezone)}\n✅ Noua data: ${formatDateTime(appointment.dateTime, timezone)}\n\nServicii:\n${serviceList}\n\nPe curand! 👋`;

    await sendOrQueue(appointment.client.phone, message);

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { rescheduleSent: true, reminderSent: false },
    });
  } catch (error) {
    console.error("Failed to send reschedule notification:", error);
  }
}

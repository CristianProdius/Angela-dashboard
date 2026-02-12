import { prisma } from "@/lib/prisma";
import { sendTextMessage } from "@/lib/waha";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ro } from "date-fns/locale";

async function getTimezone(): Promise<string> {
  const settings = await prisma.settings.findFirst();
  return settings?.timezone || "Europe/Chisinau";
}

function formatDateTime(date: Date, timezone: string): string {
  const zonedDate = toZonedTime(date, timezone);
  return format(zonedDate, "dd/MM/yyyy 'la' HH:mm", { locale: ro });
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

    const timezone = await getTimezone();
    const settings = await prisma.settings.findFirst();
    const businessName = settings?.businessName || "Frizerie";

    const serviceList = appointment.services
      .map((s) => `- ${s.service.name}`)
      .join("\n");

    const total = appointment.services.reduce(
      (sum, s) => sum + s.priceAtBooking,
      0
    );

    const message = `Buna ${appointment.client.name}! ✂️

Programarea ta la *${businessName}* a fost confirmata:

📅 ${formatDateTime(appointment.dateTime, timezone)}

Servicii:
${serviceList}

💰 Total: ${total.toFixed(2)} MDL

Pe curand! 👋`;

    await sendTextMessage(appointment.client.phone, message);

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

    const timezone = await getTimezone();
    const settings = await prisma.settings.findFirst();
    const businessName = settings?.businessName || "Frizerie";

    const message = `Reminder! 📋

Buna ${appointment.client.name}, ai o programare maine la *${businessName}*:

📅 ${formatDateTime(appointment.dateTime, timezone)}

Servicii:
${appointment.services.map((s) => `- ${s.service.name}`).join("\n")}

Daca doresti sa anulezi sau sa reprogramezi, te rugam sa ne contactezi. Pe maine! 👋`;

    await sendTextMessage(appointment.client.phone, message);

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { reminderSent: true },
    });
  } catch (error) {
    console.error("Failed to send reminder:", error);
  }
}

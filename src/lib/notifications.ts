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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendFirstTimeIntro(phone: string, clientName: string) {
  const message = `Salut ${clientName}! 💇‍♀️ Asta-i Angela!
De acum o sa-ti trimit confirmarile si reminder-ele pentru programari pe aici. 😊`;
  await sendTextMessage(phone, message);
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

    const timezone = await getTimezone();

    const serviceList = appointment.services
      .map((s) => `- ${s.service.name}`)
      .join("\n");

    const total = appointment.services.reduce(
      (sum, s) => sum + s.priceAtBooking,
      0
    );

    const message = `Buna ${appointment.client.name}! ✂️

Programarea ta a fost confirmata:

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

    const message = `Reminder! 📋

Buna ${appointment.client.name}, ai o programare maine:

📅 ${formatDateTime(appointment.dateTime, timezone)}

Servicii:
${appointment.services.map((s) => `- ${s.service.name}`).join("\n")}

Daca doresti sa anulezi sau sa reprogramezi, da-mi un mesaj. Pe maine! 👋`;

    await sendTextMessage(appointment.client.phone, message);

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

    const timezone = await getTimezone();

    const message = `Buna ${appointment.client.name},

Din pacate, programarea ta din ${formatDateTime(appointment.dateTime, timezone)} nu a putut fi confirmata.

Te rugam sa alegi un alt interval orar. Ne cerem scuze pentru inconvenient! 🙏`;

    await sendTextMessage(appointment.client.phone, message);

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { cancellationSent: true },
    });
  } catch (error) {
    console.error("Failed to send decline notification:", error);
  }
}

export async function sendPasswordResetOTP(phone: string, code: string) {
  const message = `Codul tau de resetare a parolei este: ${code}

Codul expira in 15 minute. Daca nu ai cerut resetarea parolei, ignora acest mesaj.`;

  await sendTextMessage(phone, message);
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

    const timezone = await getTimezone();

    const serviceList = appointment.services
      .map((s) => `- ${s.service.name}`)
      .join("\n");

    const message = `Hei ${appointment.client.name}! 📅 Programarea ta a fost reprogramata:

❌ Vechea data: ${formatDateTime(oldDateTime, timezone)}
✅ Noua data: ${formatDateTime(appointment.dateTime, timezone)}

Servicii:
${serviceList}

Pe curand! 👋`;

    await sendTextMessage(appointment.client.phone, message);

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { rescheduleSent: true },
    });
  } catch (error) {
    console.error("Failed to send reschedule notification:", error);
  }
}

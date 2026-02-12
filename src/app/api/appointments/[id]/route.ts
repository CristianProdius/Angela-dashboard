import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReschedule, sendConfirmation, sendAppointmentDeclined } from "@/lib/notifications";

const VALID_STATUSES = ["PENDING", "SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: true,
        services: { include: { service: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Programarea nu a fost gasita" },
        { status: 404 }
      );
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("GET /api/appointments/[id] error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Programarea nu a fost gasita" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    let dateTimeChanged = false;
    const oldDateTime = existing.dateTime;

    if (body.status) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: "Status invalid" },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    if (body.dateTime) {
      const newStart = new Date(body.dateTime);
      if (isNaN(newStart.getTime())) {
        return NextResponse.json(
          { error: "Data invalida" },
          { status: 400 }
        );
      }
      // Recalculate end time based on existing services
      const services = await prisma.appointmentService.findMany({
        where: { appointmentId: id },
        include: { service: true },
      });
      const totalDuration = services.reduce(
        (sum, s) => sum + s.service.durationMinutes,
        0
      );
      const newEnd = new Date(newStart.getTime() + totalDuration * 60000);

      // Conflict check excluding current appointment
      const conflicts = await prisma.appointment.findMany({
        where: {
          id: { not: id },
          status: { in: ["SCHEDULED", "PENDING"] },
          dateTime: { lt: newEnd },
          endDateTime: { gt: newStart },
        },
      });

      if (conflicts.length > 0) {
        return NextResponse.json(
          { error: "Conflict de orar cu alta programare" },
          { status: 409 }
        );
      }

      updateData.dateTime = newStart;
      updateData.endDateTime = newEnd;
      updateData.rescheduleSent = false;
      dateTimeChanged = newStart.getTime() !== existing.dateTime.getTime();
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        services: { include: { service: true } },
      },
    });

    // Fire-and-forget notifications
    if (dateTimeChanged) {
      sendReschedule(id, oldDateTime).catch((err) =>
        console.error("Reschedule notification error:", err)
      );
    }

    // Notify client when PENDING appointment is accepted or declined
    if (body.status && existing.status === "PENDING") {
      if (body.status === "SCHEDULED") {
        sendConfirmation(id).catch((err) =>
          console.error("Accept notification error:", err)
        );
      } else if (body.status === "CANCELLED") {
        sendAppointmentDeclined(id).catch((err) =>
          console.error("Decline notification error:", err)
        );
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/appointments/[id] error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Programarea nu a fost gasita" },
        { status: 404 }
      );
    }

    await prisma.appointment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/appointments/[id] error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

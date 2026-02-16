import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { messageTemplateSchema } from "@/lib/validators";
import { invalidateTemplateCache } from "@/lib/notifications";
import type { MessageTemplateType } from "@/generated/prisma/enums";

const VALID_TYPES: MessageTemplateType[] = [
  "FIRST_TIME_INTRO",
  "CONFIRMATION",
  "REMINDER",
  "APPOINTMENT_DECLINED",
  "PASSWORD_RESET_OTP",
  "RESCHEDULE",
];

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const admin = await prisma.client.findUnique({
    where: { id: session.user.id },
  });
  if (!admin?.isAdmin) return null;
  return admin;
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.messageTemplate.findMany({
      orderBy: { type: "asc" },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("GET /api/settings/message-templates error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, ...data } = body;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Tip de sablon invalid" },
        { status: 400 }
      );
    }

    const parsed = messageTemplateSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const template = await prisma.messageTemplate.upsert({
      where: { type },
      update: {
        content: parsed.data.content,
        active: parsed.data.active,
      },
      create: {
        type,
        content: parsed.data.content,
        active: parsed.data.active,
      },
    });

    invalidateTemplateCache();

    return NextResponse.json(template);
  } catch (error) {
    console.error("PUT /api/settings/message-templates error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { passwordResetSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/password";
import { createClientSession } from "@/lib/client-auth";

const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = passwordResetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { phone, code, newPassword } = parsed.data;

    const client = await prisma.client.findUnique({ where: { phone } });
    if (!client) {
      return NextResponse.json(
        { error: "Cod invalid sau expirat" },
        { status: 400 }
      );
    }

    // Find the most recent unused, non-expired reset for this client
    const reset = await prisma.passwordReset.findFirst({
      where: {
        clientId: client.id,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!reset) {
      return NextResponse.json(
        { error: "Cod invalid sau expirat" },
        { status: 400 }
      );
    }

    // Check if max attempts exceeded
    if (reset.attempts >= MAX_ATTEMPTS) {
      // Invalidate the code
      await prisma.passwordReset.update({
        where: { id: reset.id },
        data: { used: true },
      });
      return NextResponse.json(
        { error: "Prea multe incercari. Solicita un cod nou." },
        { status: 429 }
      );
    }

    // Verify the code
    if (reset.code !== code) {
      // Increment attempt counter
      await prisma.passwordReset.update({
        where: { id: reset.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = MAX_ATTEMPTS - reset.attempts - 1;
      return NextResponse.json(
        {
          error:
            remaining > 0
              ? `Cod incorect. Mai ai ${remaining} incercari.`
              : "Cod incorect. Solicita un cod nou.",
        },
        { status: 400 }
      );
    }

    // Mark code as used and update password
    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.passwordReset.update({
        where: { id: reset.id },
        data: { used: true },
      }),
      prisma.client.update({
        where: { id: client.id },
        data: { passwordHash },
      }),
    ]);

    // Auto-login
    const setCookie = await createClientSession(client.id, client.phone);
    const response = NextResponse.json({
      id: client.id,
      name: client.name,
      phone: client.phone,
    });
    response.headers.append("Set-Cookie", setCookie);
    return response;
  } catch (error) {
    console.error("POST /api/client/auth/reset-password error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

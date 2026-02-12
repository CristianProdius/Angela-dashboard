import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetOTP } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Numarul de telefon este obligatoriu" },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({ where: { phone } });

    if (!client || !client.passwordHash) {
      // Don't reveal whether account exists
      return NextResponse.json({ success: true });
    }

    // Generate 6-digit OTP using cryptographically secure randomness
    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalidate previous unused codes for this client
    await prisma.passwordReset.updateMany({
      where: { clientId: client.id, used: false },
      data: { used: true },
    });

    await prisma.passwordReset.create({
      data: {
        clientId: client.id,
        code,
        expiresAt,
      },
    });

    // Send OTP via WhatsApp
    sendPasswordResetOTP(client.phone, code).catch((err) =>
      console.error("Failed to send OTP:", err)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/client/auth/forgot-password error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

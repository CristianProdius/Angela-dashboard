import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/password";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Parola curenta si noua parola sunt obligatorii" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Noua parola trebuie sa aiba cel putin 6 caractere" },
        { status: 400 }
      );
    }

    const admin = await prisma.client.findUnique({
      where: { id: session.user.id },
    });

    if (!admin || !admin.isAdmin || !admin.passwordHash) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const valid = await verifyPassword(currentPassword, admin.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Parola curenta este incorecta" },
        { status: 401 }
      );
    }

    const newHash = await hashPassword(newPassword);
    await prisma.client.update({
      where: { id: admin.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/change-password error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

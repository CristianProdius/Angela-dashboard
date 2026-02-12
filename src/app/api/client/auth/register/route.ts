import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientRegisterSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/password";
import { createClientSession } from "@/lib/client-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = clientRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, phone, password } = parsed.data;

    const existing = await prisma.client.findUnique({ where: { phone } });

    if (existing) {
      // If already has a password, account is claimed
      if (existing.passwordHash) {
        return NextResponse.json(
          { error: "Un cont cu acest numar exista deja" },
          { status: 409 }
        );
      }

      // Admin-created client without password — let them claim it
      const passwordHash = await hashPassword(password);
      await prisma.client.update({
        where: { id: existing.id },
        data: { passwordHash, name },
      });

      const setCookie = await createClientSession(existing.id, existing.phone);
      const response = NextResponse.json(
        { id: existing.id, name, phone },
        { status: 200 }
      );
      response.headers.append("Set-Cookie", setCookie);
      return response;
    }

    // Create new client
    const passwordHash = await hashPassword(password);
    const client = await prisma.client.create({
      data: { name, phone, passwordHash },
    });

    const setCookie = await createClientSession(client.id, client.phone);
    const response = NextResponse.json(
      { id: client.id, name: client.name, phone: client.phone },
      { status: 201 }
    );
    response.headers.append("Set-Cookie", setCookie);
    return response;
  } catch (error) {
    console.error("POST /api/client/auth/register error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

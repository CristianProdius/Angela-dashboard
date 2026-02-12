import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientLoginSchema } from "@/lib/validators";
import { verifyPassword } from "@/lib/password";
import { createClientSession } from "@/lib/client-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = clientLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { phone, password } = parsed.data;

    const client = await prisma.client.findUnique({ where: { phone } });

    if (!client || !client.passwordHash) {
      return NextResponse.json(
        { error: "Numar de telefon sau parola incorecta" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, client.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Numar de telefon sau parola incorecta" },
        { status: 401 }
      );
    }

    const setCookie = await createClientSession(client.id, client.phone);
    const response = NextResponse.json({
      id: client.id,
      name: client.name,
      phone: client.phone,
    });
    response.headers.append("Set-Cookie", setCookie);
    return response;
  } catch (error) {
    console.error("POST /api/client/auth/login error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

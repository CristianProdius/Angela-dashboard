import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientFromRequest } from "@/lib/client-auth";

export async function GET(request: NextRequest) {
  try {
    const client = getClientFromRequest(request);
    if (!client) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.client.findUnique({
      where: { id: client.clientId },
      select: {
        id: true,
        name: true,
        phone: true,
        createdAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Client negasit" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("GET /api/client/profile error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

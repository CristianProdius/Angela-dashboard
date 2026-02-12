import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.blockedDate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Zi blocata nu a fost gasita" },
        { status: 404 }
      );
    }

    await prisma.blockedDate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/settings/blocked-dates/[id] error:", error);
    return NextResponse.json({ error: "Eroare interna" }, { status: 500 });
  }
}

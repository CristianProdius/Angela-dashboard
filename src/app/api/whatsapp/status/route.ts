import { NextResponse } from "next/server";
import { getSessionStatus } from "@/lib/waha";

export async function GET() {
  try {
    const status = await getSessionStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("GET /api/whatsapp/status error:", error);
    return NextResponse.json({ status: "DISCONNECTED" });
  }
}

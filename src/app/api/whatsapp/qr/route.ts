import { NextResponse } from "next/server";
import { getQRCode, startSession } from "@/lib/waha";

export async function GET() {
  try {
    // Ensure session is started
    await startSession();
    const result = await getQRCode();
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/whatsapp/qr error:", error);
    return NextResponse.json(
      { error: "Eroare la obtinerea QR Code" },
      { status: 500 }
    );
  }
}

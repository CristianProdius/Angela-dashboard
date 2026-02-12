import { NextResponse } from "next/server";
import { deleteClientCookie } from "@/lib/client-auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.append("Set-Cookie", deleteClientCookie());
  return response;
}

import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "secret");
const COOKIE_NAME = "client-token";
const EXPIRY_DAYS = 30;

interface ClientTokenPayload {
  sub: string;
  phone: string;
  role: "client";
}

export async function createClientSession(
  clientId: string,
  phone: string
): Promise<string> {
  const token = await new SignJWT({ phone, role: "client" } as Omit<ClientTokenPayload, "sub">)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(clientId)
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_DAYS}d`)
    .sign(SECRET);

  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${EXPIRY_DAYS * 86400}`;
}

export async function verifyClientSession(
  token: string
): Promise<ClientTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.role !== "client" || !payload.sub || !payload.phone) {
      return null;
    }
    return {
      sub: payload.sub,
      phone: payload.phone as string,
      role: "client",
    };
  } catch {
    return null;
  }
}

export function getClientFromRequest(request: NextRequest): {
  clientId: string;
  phone: string;
} | null {
  const clientId = request.headers.get("x-client-id");
  const phone = request.headers.get("x-client-phone");
  if (!clientId || !phone) return null;
  return { clientId, phone };
}

export function deleteClientCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export { COOKIE_NAME };

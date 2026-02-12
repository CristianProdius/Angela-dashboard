import { auth } from "@/auth";
import { verifyClientSession, COOKIE_NAME } from "@/lib/client-auth";
import { NextResponse } from "next/server";

export default auth(async (req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Public routes
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/sw.js") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/icons") ||
    pathname === "/offline"
  ) {
    return;
  }

  // Client public routes (login, register, forgot-password)
  if (
    pathname === "/client/login" ||
    pathname === "/client/register" ||
    pathname === "/client/forgot-password"
  ) {
    return;
  }

  // Client auth API routes (register, login, logout, forgot-password, reset-password)
  if (pathname.startsWith("/api/client/auth/")) {
    return;
  }

  // Protected client API routes - verify client-token cookie
  if (pathname.startsWith("/api/client/")) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await verifyClientSession(token);
    if (!payload) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Set headers for downstream routes
    const response = NextResponse.next();
    response.headers.set("x-client-id", payload.sub);
    response.headers.set("x-client-phone", payload.phone);
    return response;
  }

  // Protected client pages - verify client-token cookie
  if (pathname.startsWith("/client/")) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return Response.redirect(new URL("/client/login", req.nextUrl));
    }
    const payload = await verifyClientSession(token);
    if (!payload) {
      return Response.redirect(new URL("/client/login", req.nextUrl));
    }
    const response = NextResponse.next();
    response.headers.set("x-client-id", payload.sub);
    response.headers.set("x-client-phone", payload.phone);
    return response;
  }

  // Protected API route for cron - uses bearer token
  if (pathname.startsWith("/api/cron")) {
    const authHeader = req.headers.get("authorization");
    if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
      return;
    }
    if (isLoggedIn) return;
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|sw.js).*)"],
};

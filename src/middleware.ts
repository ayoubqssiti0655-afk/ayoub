import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "masar_session";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? "insecure-dev-secret-change-me");

const AREA_ROLES: [string, string[]][] = [
  ["/admin", ["ADMIN"]],
  ["/app", ["MERCHANT", "MERCHANT_STAFF"]],
  ["/courier", ["COURIER"]],
];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const area = AREA_ROLES.find(([prefix]) => pathname.startsWith(prefix));
  if (!area) return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname + search);

  if (!token) return NextResponse.redirect(loginUrl);
  try {
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;
    if (!area[1].includes(role)) {
      // signed in but wrong area → send to their own console
      const home = role === "ADMIN" ? "/admin" : role === "COURIER" ? "/courier" : "/app";
      return NextResponse.redirect(new URL(home, req.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/admin/:path*", "/app/:path*", "/courier/:path*"],
};

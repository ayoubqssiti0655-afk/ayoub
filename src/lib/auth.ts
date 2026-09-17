import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import * as bcrypt from "bcryptjs";
import { db } from "@/server/db";
import type { Role } from "@/lib/constants";

const COOKIE = "masar_session";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? "insecure-dev-secret-change-me");

export type SessionPayload = {
  sub: string;
  role: Role;
  merchantId?: string;
  courierId?: string;
  name: string;
};

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Session claims from cookie (no DB hit). Works in RSC & route handlers. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const SESSION_COOKIE = COOKIE;

import { cache } from "react";

/** Fresh user + profile from DB. Returns null if user vanished or was deactivated. Memoized per-request. */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.sub },
    include: { staffProfile: true, courierProfile: true },
  });
  if (!user || !user.isActive) return null;
  return user;
});

/** Merchant context for MERCHANT / MERCHANT_STAFF users. Memoized per-request. */
export const getMerchantContext = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.staffProfile) {
    const merchant = await db.merchant.findUnique({ where: { id: user.staffProfile.merchantId } });
    return merchant ? { user, merchant, staffRole: user.staffProfile.staffRole } : null;
  }
  return null;
});

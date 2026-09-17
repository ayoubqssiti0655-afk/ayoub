import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/server/db";
import { getSession, type SessionPayload } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import type { Role } from "@/lib/constants";
import * as bcrypt from "bcryptjs";

// ── Errors ────────────────────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
export const badRequest = (msg = "Invalid request", details?: unknown) => new ApiError(400, "BAD_REQUEST", msg, details);
export const unauthorized = (msg = "Authentication required") => new ApiError(401, "UNAUTHORIZED", msg);
export const forbidden = (msg = "You do not have permission to perform this action") => new ApiError(403, "FORBIDDEN", msg);
export const notFound = (msg = "Resource not found") => new ApiError(404, "NOT_FOUND", msg);
export const conflict = (msg = "Resource conflict") => new ApiError(409, "CONFLICT", msg);

export function jsonError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status }
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "The request payload is invalid.",
          details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
      },
      { status: 422 }
    );
  }
  console.error("[api] unhandled error:", err);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
    { status: 500 }
  );
}

// ── Context passed to handlers ────────────────────────────────────
export type ApiContext = {
  session: SessionPayload | null;
  merchantId: string | null; // resolved from session or API key
  authType: "session" | "api_key" | null;
  ip: string;
};

type ApiOptions = {
  /** Require auth; optionally restrict roles. */
  auth?: Role[];
  /** Allow merchant API-key auth (Bearer msk_live_…). */
  apiKey?: boolean;
  /** No authentication required (public endpoints). */
  public?: boolean;
  rate?: { limit: number; windowMs: number };
};

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
}

/** Wrap a route handler with rate limiting, auth, RBAC and error handling. */
export function api<C = unknown>(
  handler: (req: NextRequest, ctx: ApiContext & { params: C }) => Promise<Response>,
  opts: ApiOptions = {}
) {
  return async (req: NextRequest, route: { params: Promise<C> }): Promise<Response> => {
    const ip = clientIp(req);
    try {
      if (opts.rate) {
        const rl = rateLimit(`${ip}:${req.nextUrl.pathname}`, opts.rate.limit, opts.rate.windowMs);
        if (!rl.ok) {
          return NextResponse.json(
            { error: { code: "RATE_LIMITED", message: "Too many requests. Please slow down." } },
            { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
          );
        }
      }

      let session: SessionPayload | null = null;
      let merchantId: string | null = null;
      let authType: "session" | "api_key" | null = null;

      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer msk_")) {
        if (!opts.apiKey) throw unauthorized("API keys are not accepted on this endpoint");
        const rawKey = authHeader.slice(7).trim();
        const key = await db.apiKey.findFirst({
          where: { revokedAt: null, prefix: rawKey.slice(0, 16) },
          include: { merchant: true },
        });
        if (!key || key.hashedKey !== bcrypt.hashSync(rawKey, 8)) throw unauthorized("Invalid API key");
        if (key.merchant.status === "SUSPENDED") throw forbidden("This merchant account is suspended");
        merchantId = key.merchantId;
        authType = "api_key";
        await db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
      } else {
        session = await getSession();
        if (!session && !opts.public) throw unauthorized();
        if (session && opts.auth && !opts.auth.includes(session.role)) throw forbidden();
        merchantId = session?.merchantId ?? null;
        authType = session ? "session" : null;
      }

      const params = route?.params ? await route.params : ({} as C);
      return await handler(req, { session, merchantId, authType, ip, params });
    } catch (err) {
      return jsonError(err);
    }
  };
}

/** Parse and validate a JSON body with a Zod schema. */
export async function parseBody<T>(req: NextRequest, schema: { parse: (v: unknown) => T }): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("Request body must be valid JSON");
  }
  return schema.parse(body);
}

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

/** Standard pagination params from search params. */
export function pagination(req: NextRequest, defaultPer = 25) {
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1) || 1);
  const per = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("per") ?? defaultPer) || defaultPer));
  return { page, per, skip: (page - 1) * per, take: per };
}

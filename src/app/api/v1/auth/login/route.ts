import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { api, parseBody, ok, unauthorized, forbidden, ApiError } from "@/lib/api";
import type { Role } from "@/lib/constants";

const loginSchema = z.object({
  email: z.string().min(3).max(200),
  password: z.string().min(1).max(200),
});

export const POST = api(
  async (req: NextRequest) => {
    const { email, password } = await parseBody(req, loginSchema);
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { staffProfile: true, courierProfile: true },
    });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw unauthorized("Incorrect email or password");
    }
    if (!user.isActive) throw forbidden("This account is deactivated");
    if (user.staffProfile) {
      const merchant = await db.merchant.findUnique({ where: { id: user.staffProfile.merchantId } });
      if (merchant?.status === "SUSPENDED") throw new ApiError(403, "SUSPENDED", "This merchant account is suspended. Contact support.");
    }

    await createSession({
      sub: user.id,
      role: user.role as Role,
      name: user.name,
      merchantId: user.staffProfile?.merchantId,
      courierId: user.courierProfile?.id,
    });
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});

    const home = user.role === "ADMIN" ? "/admin" : user.role === "COURIER" ? "/courier" : "/app";
    return ok({ user: { name: user.name, role: user.role }, redirect: home });
  },
  { public: true, rate: { limit: 20, windowMs: 60000 } }
);

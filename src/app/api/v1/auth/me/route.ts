import { getCurrentUser } from "@/lib/auth";
import { api, ok, unauthorized } from "@/lib/api";
import { NextRequest } from "next/server";

export const GET = api(
  async () => {
    const user = await getCurrentUser();
    if (!user) throw unauthorized();
    return ok({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      merchantId: user.staffProfile?.merchantId ?? null,
      courierId: user.courierProfile?.id ?? null,
    });
  },
  { auth: ["ADMIN", "MERCHANT", "MERCHANT_STAFF", "COURIER"] }
);

import { db } from "@/server/db";
import { api, ok } from "@/lib/api";

export const GET = api(
  async (_req, { session }) => {
    const notifications = await db.notification.findMany({
      where: { userId: session!.sub, channel: "IN_APP" },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return ok(notifications);
  },
  { auth: ["ADMIN", "MERCHANT", "MERCHANT_STAFF", "COURIER"] }
);

export const POST = api(
  async (_req, { session }) => {
    await db.notification.updateMany({ where: { userId: session!.sub, readAt: null }, data: { readAt: new Date() } });
    return ok({ read: true });
  },
  { auth: ["ADMIN", "MERCHANT", "MERCHANT_STAFF", "COURIER"] }
);

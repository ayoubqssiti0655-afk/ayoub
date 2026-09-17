import { db } from "@/server/db";
import { api, ok, forbidden } from "@/lib/api";

/** Polling target for the courier PWA: unread parcel-assignment alerts. */
export const GET = api(
  async (_req, { session }) => {
    const userId = session!.sub;
    const [count, latest] = await Promise.all([
      db.notification.count({ where: { userId, readAt: null, type: "COURIER_ASSIGNED" } }),
      db.notification.findFirst({ where: { userId, type: "COURIER_ASSIGNED" }, orderBy: { createdAt: "desc" } }),
    ]);
    return ok({ count, latest: latest ? { title: latest.title, body: latest.body, createdAt: latest.createdAt } : null });
  },
  { auth: ["COURIER"], rate: { limit: 120, windowMs: 60000 } }
);

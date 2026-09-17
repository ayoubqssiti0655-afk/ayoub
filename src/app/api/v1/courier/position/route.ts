import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { api, parseBody, ok, forbidden } from "@/lib/api";

/** Courier position beacon — throttled client-side (≈ every 20s / significant move). */
export const POST = api(
  async (req: NextRequest, { session }) => {
    const courierId = session!.courierId;
    if (!courierId) throw forbidden();
    const body = await parseBody(req, z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }));
    await db.courier.update({
      where: { id: courierId },
      data: { lastLat: body.lat, lastLng: body.lng, lastSeenAt: new Date() },
    });
    return ok({ recorded: true });
  },
  { auth: ["COURIER"], rate: { limit: 30, windowMs: 60000 } }
);

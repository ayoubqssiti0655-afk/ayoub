import { db } from "@/server/db";
import { api, ok, notFound, forbidden } from "@/lib/api";
import { recordAttempt, advanceDelivery, type AttemptInput } from "@/server/orders";
import { z } from "zod";

const attemptSchema = z.object({
  result: z.enum(["DELIVERED", "FAILED", "POSTPONED"]),
  reason: z.string().max(40).optional(),
  note: z.string().max(500).optional(),
  otp: z.string().max(6).optional(),
  proofType: z.enum(["OTP", "SIGNATURE", "PHOTO"]).optional(),
  signature: z.string().max(200000).optional(),
  photo: z.string().max(400000).optional(),
  gpsLat: z.number().optional(),
  gpsLng: z.number().optional(),
  nextActionAt: z.string().optional(),
  exchangePickedUp: z.boolean().optional(),
});

export const POST = api<{ id: string }>(
  async (req, { params, session }) => {
    const courierId = session!.courierId;
    if (!courierId) throw forbidden();
    const { id } = params;
    const delivery = await db.delivery.findUnique({ where: { id } });
    if (!delivery || delivery.courierId !== courierId) throw notFound("Delivery not found");

    const body = (await req.json()) as AttemptInput & { nextActionAt?: string };
    const result = await recordAttempt(id, {
      ...body,
      nextActionAt: body.nextActionAt ? new Date(body.nextActionAt) : undefined,
    }, { id: courierId, name: session!.name, type: "COURIER" });
    return ok(result);
  },
  { auth: ["COURIER"], rate: { limit: 60, windowMs: 60000 } }
);

export const PUT = api<{ id: string }>(
  async (req, { params, session }) => {
    const courierId = session!.courierId;
    if (!courierId) throw forbidden();
    const { id } = params;
    const delivery = await db.delivery.findUnique({ where: { id } });
    if (!delivery || delivery.courierId !== courierId) throw notFound("Delivery not found");
    const body = (await req.json()) as { to: "PICKED_UP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" };
    const result = await advanceDelivery(id, body.to, { id: courierId, name: session!.name, type: "COURIER" });
    return ok(result);
  },
  { auth: ["COURIER"], rate: { limit: 60, windowMs: 60000 } }
);

import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { api, parseBody, ok, forbidden, notFound } from "@/lib/api";
import { isFeatureEnabled, FEATURE_DISABLED_MSG } from "@/server/features";
import { chooseSlot, rateDelivery, setPickupPoint } from "@/server/orders";

const slotSchema = z.object({ action: z.literal("slot"), date: z.string(), window: z.string() });
const ratingSchema = z.object({ action: z.literal("rating"), stars: z.number().int().min(1).max(5), comment: z.string().max(300).optional() });
const relaisSchema = z.object({ action: z.literal("relais"), pickupPointId: z.string() });

/** Public customer actions from the tracking page: slot, rating, pickup point. */
export const POST = api<{ reference: string }>(
  async (req: NextRequest, { params }) => {
    const body = await parseBody(req, z.discriminatedUnion("action", [slotSchema, ratingSchema, relaisSchema]));
    const ref = decodeURIComponent(params.reference).toUpperCase();

    const order = await db.order.findUnique({ where: { reference: ref }, select: { id: true } });
    if (!order) throw notFound("Order not found");

    if (body.action === "slot") {
      if (!(await isFeatureEnabled("delivery_slots"))) throw forbidden(FEATURE_DISABLED_MSG);
      return ok(await chooseSlot(ref, body.date, body.window));
    }
    if (body.action === "rating") {
      if (!(await isFeatureEnabled("post_delivery_rating"))) throw forbidden(FEATURE_DISABLED_MSG);
      return ok(await rateDelivery(ref, body.stars, body.comment));
    }
    if (!(await isFeatureEnabled("pickup_points"))) throw forbidden(FEATURE_DISABLED_MSG);
    return ok(await setPickupPoint(ref, body.pickupPointId));
  },
  { public: true, rate: { limit: 20, windowMs: 60000 } }
);

/** Pickup points available in the order's city. */
export const GET = api<{ reference: string }>(
  async (_req, { params }) => {
    const ref = decodeURIComponent(params.reference).toUpperCase();
    const order = await db.order.findUnique({ where: { reference: ref }, select: { deliveryCity: true } });
    if (!order) throw notFound("Order not found");
    const points = await db.pickupPoint.findMany({ where: { city: order.deliveryCity, isActive: true } });
    return ok({ points });
  },
  { public: true, rate: { limit: 60, windowMs: 60000 } }
);

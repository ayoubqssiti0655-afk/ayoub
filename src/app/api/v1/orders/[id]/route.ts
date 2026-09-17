import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { api, ok, notFound, parseBody } from "@/lib/api";
import { transitionOrder, assignCourier } from "@/server/orders";

const patchSchema = z.object({
  action: z.enum(["confirm", "ready", "cancel", "assign", "note"]),
  courierId: z.string().optional(),
  note: z.string().max(500).optional(),
});

export const GET = api<{ id: string }>(
  async (_req, { params, merchantId, session }) => {
    const order = await db.order.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        items: true,
        events: { orderBy: { createdAt: "asc" }, take: 50 },
        delivery: { include: { attemptsLog: { orderBy: { number: "asc" } } } },
        returns: true,
        courier: { include: { user: { select: { name: true } } } },
        merchant: { select: { name: true } },
      },
    });
    if (!order) throw notFound("Order not found");
    if (merchantId && order.merchantId !== merchantId) throw notFound("Order not found");
    if (session?.role === "MERCHANT" && order.merchantId !== session.merchantId) throw notFound("Order not found");
    return ok(order);
  },
  { auth: ["MERCHANT", "MERCHANT_STAFF", "ADMIN"], apiKey: true }
);

export const PATCH = api<{ id: string }>(
  async (req: NextRequest, { params, merchantId, session }) => {
    const where = merchantId ? { id: params.id, merchantId } : { id: params.id };
    const order = await db.order.findFirst({ where });
    if (!order) throw notFound("Order not found");
    const body = await parseBody(req, patchSchema);
    const actor = { id: session?.sub, name: session?.name ?? "API", type: (session ? "MERCHANT" : "API") as "MERCHANT" | "API" };

    if (body.action === "confirm") await transitionOrder(order.id, "CONFIRMED", actor);
    else if (body.action === "ready") await transitionOrder(order.id, "READY_FOR_PICKUP", actor);
    else if (body.action === "cancel") await transitionOrder(order.id, "CANCELLED", actor);
    else if (body.action === "assign") {
      if (!body.courierId) throw notFound("courierId required");
      await assignCourier(order.id, body.courierId, actor);
    } else if (body.action === "note") {
      await db.order.update({ where: { id: order.id }, data: { internalNote: body.note ?? "" } });
      await db.orderEvent.create({ data: { orderId: order.id, type: "NOTE", actorType: actor.type, actorName: actor.name, message: body.note } });
    }
    return ok({ id: order.id, action: body.action });
  },
  { auth: ["MERCHANT", "MERCHANT_STAFF"], apiKey: true }
);

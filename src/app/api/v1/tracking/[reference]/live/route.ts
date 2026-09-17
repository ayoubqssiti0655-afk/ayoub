import { db } from "@/server/db";
import { isFeatureEnabled } from "@/server/features";

export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream for the public tracking page: pushes order status
 * and the courier's live position while the parcel is out for delivery.
 * Reconnects automatically via EventSource.
 */
export async function GET(req: Request, { params }: { params: Promise<{ reference: string }> }) {
  if (!(await isFeatureEnabled("live_tracking"))) {
    return new Response("Feature disabled", { status: 404 });
  }
  const { reference } = await params;
  const ref = decodeURIComponent(reference).toUpperCase();
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const tick = async () => {
        const order = await db.order.findUnique({
          where: { reference: ref },
          select: {
            status: true,
            updatedAt: true,
            courier: { select: { lastLat: true, lastLng: true, lastSeenAt: true, user: { select: { name: true } } } },
          },
        });
        if (!order) {
          send("gone", { error: "not_found" });
          close();
          return;
        }
        send("update", {
          status: order.status,
          updatedAt: order.updatedAt,
          courier:
            order.status === "OUT_FOR_DELIVERY" && order.courier
              ? {
                  name: order.courier.user.name,
                  lat: order.courier.lastLat,
                  lng: order.courier.lastLng,
                  lastSeenAt: order.courier.lastSeenAt,
                }
              : null,
        });
        if (["DELIVERED", "RETURNED", "CANCELLED"].includes(order.status)) close();
      };

      let timer: ReturnType<typeof setInterval> | null = null;
      const close = () => {
        if (closed) return;
        closed = true;
        if (timer) clearInterval(timer);
        try { controller.close(); } catch {}
      };

      req.signal.addEventListener("abort", close);
      await tick();
      timer = setInterval(tick, 5000);
      // hard stop after 10 minutes; EventSource reconnects
      setTimeout(close, 10 * 60000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

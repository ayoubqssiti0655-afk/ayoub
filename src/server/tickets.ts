import { db } from "@/server/db";
import { badRequest, notFound } from "@/lib/api";

/** Support tickets: merchant ↔ Masar team, tied to an order. */
export async function openTicket(input: {
  orderId: string; merchantId: string; subject: string; body: string; openedBy: "MERCHANT" | "ADMIN"; authorName: string;
}) {
  const order = await db.order.findFirst({ where: { id: input.orderId, merchantId: input.merchantId } });
  if (!order) throw notFound("Order not found");
  const open = await db.ticket.findFirst({ where: { orderId: order.id, status: { in: ["OPEN", "ANSWERED"] } } });
  if (open) throw badRequest("Une ticket est déjà ouverte pour cette commande");
  return db.ticket.create({
    data: {
      orderId: order.id, merchantId: input.merchantId, subject: input.subject,
      openedBy: input.openedBy,
      messages: { create: { authorType: input.openedBy, authorName: input.authorName, body: input.body } },
    },
    include: { messages: true },
  });
}

export async function replyTicket(ticketId: string, input: { authorType: "MERCHANT" | "ADMIN"; authorName: string; body: string }) {
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw notFound("Ticket not found");
  if (ticket.status === "RESOLVED") throw badRequest("Ticket is closed");
  await db.ticketMessage.create({ data: { ticketId, authorType: input.authorType, authorName: input.authorName, body: input.body } });
  // status flips: merchant reply → back to OPEN (waiting on us), admin reply → ANSWERED
  await db.ticket.update({ where: { id: ticketId }, data: { status: input.authorType === "ADMIN" ? "ANSWERED" : "OPEN", updatedAt: new Date() } });
  return { ok: true };
}

export async function resolveTicket(ticketId: string, authorName: string) {
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw notFound("Ticket not found");
  await db.ticket.update({ where: { id: ticketId }, data: { status: "RESOLVED", updatedAt: new Date() } });
  return { ok: true };
}

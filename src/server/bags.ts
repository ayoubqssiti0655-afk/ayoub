import { db } from "@/server/db";
import { badRequest, notFound } from "@/lib/api";
import { uid } from "@/lib/utils";

/**
 * Hub bag flow: sorting-center staff groups parcels per city/courier into
 * sealed bags with a manifest. Receiving a bag flips all its parcels to
 * ASSIGNED with the courier, in one scan.
 */
export async function createBag(city: string, courierId?: string) {
  const count = await db.bag.count();
  const reference = `BAG-${String(count + 1).padStart(4, "0")}`;
  return db.bag.create({
    data: {
      id: uid(), reference, city, courierId: courierId ?? null,
      status: "OPEN", parcelRefs: "[]",
    },
  });
}

export async function addParcelToBag(bagId: string, reference: string) {
  const bag = await db.bag.findUnique({ where: { id: bagId } });
  if (!bag) throw notFound("Bag not found");
  if (bag.status !== "OPEN") throw badRequest("Bag is already sealed");
  const order = await db.order.findUnique({ where: { reference: reference.toUpperCase() } });
  if (!order) throw notFound("Order not found");
  if (order.deliveryCity !== bag.city) throw badRequest(`This parcel goes to ${order.deliveryCity}, not ${bag.city}`);
  if (["DELIVERED", "CANCELLED"].includes(order.status)) throw badRequest("Order is already finalized");

  const refs = JSON.parse(bag.parcelRefs) as string[];
  if (!refs.includes(order.reference)) refs.push(order.reference);
  await db.bag.update({ where: { id: bagId }, data: { parcelRefs: JSON.stringify(refs) } });
  return { reference: order.reference, count: refs.length };
}

export async function sealBag(bagId: string) {
  const bag = await db.bag.findUnique({ where: { id: bagId } });
  if (!bag) throw notFound("Bag not found");
  const refs = JSON.parse(bag.parcelRefs) as string[];
  if (!refs.length) throw badRequest("Bag is empty");
  const sealCode = String(Math.floor(1000 + Math.random() * 9000));
  await db.bag.update({ where: { id: bagId }, data: { status: "SEALED", sealedAt: new Date(), sealCode } });
  return { reference: bag.reference, parcels: refs.length, sealCode };
}

/** Courier scans a sealed bag → all parcels become ASSIGNED to them. */
export async function receiveBag(bagId: string, sealCode: string, courierId: string, actor: { name: string }) {
  const bag = await db.bag.findUnique({ where: { id: bagId } });
  if (!bag) throw notFound("Bag not found");
  if (bag.status !== "SEALED") throw badRequest("Bag is not sealed");
  if (bag.sealCode !== sealCode.trim()) throw badRequest("Wrong seal code");
  const refs = JSON.parse(bag.parcelRefs) as string[];

  for (const ref of refs) {
    const order = await db.order.findUnique({ where: { reference: ref }, include: { delivery: true } });
    if (!order) continue;
    if (!order.delivery) {
      await db.delivery.create({
        data: {
          orderId: order.id, courierId, status: "ASSIGNED",
          otpCode: String(Math.floor(100000 + Math.random() * 900000)),
        },
      });
    } else {
      await db.delivery.update({
        where: { id: order.delivery.id },
        data: { courierId, bagId, status: order.delivery.status === "ASSIGNED" ? "ASSIGNED" : order.delivery.status },
      });
    }
    await db.order.update({ where: { id: order.id }, data: { courierId } });
    await db.orderEvent.create({
      data: { orderId: order.id, type: "ASSIGNED", actorType: "COURIER", actorName: actor.name, message: `Sac ${bag.reference}` },
    });
  }
  await db.bag.update({ where: { id: bagId }, data: { status: "RECEIVED", receivedAt: new Date(), courierId } });
  return { reference: bag.reference, parcels: refs.length };
}

export async function listBags(status?: string) {
  return db.bag.findMany({
    where: status ? { status } : {},
    include: { courier: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

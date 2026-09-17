import { db } from "@/server/db";
import { notFound, badRequest } from "@/lib/api";
import { createOrder } from "@/server/orders";
import { DH } from "@/lib/utils";

/** Public storefront: catalog + COD checkout for a merchant. */
export async function getStore(slug: string) {
  const merchant = await db.merchant.findFirst({
    where: { slug, status: "ACTIVE" },
    select: { id: true, name: true, slug: true, storeBio: true, city: true, brandColor: true },
  });
  if (!merchant) throw notFound("Store not found");
  const products = await db.product.findMany({
    where: { merchantId: merchant.id, isActive: true, stock: { gt: 0 } },
    select: { id: true, name: true, price: true, category: true, stock: true },
    orderBy: { createdAt: "asc" },
    take: 24,
  });
  return { merchant, products };
}

export type StorefrontOrder = {
  productId: string;
  fullName: string;
  phone: string;
  city: string;
  address: string;
  quantity: number;
  notes?: string;
};

const PHONE_RE = /^(\+212[67]\d{8}|0[67]\d{8})$/;

export async function createStorefrontOrder(slug: string, input: StorefrontOrder, discount = 0) {
  const merchant = await db.merchant.findFirst({ where: { slug, status: "ACTIVE" } });
  if (!merchant) throw notFound("Store not found");
  const product = await db.product.findFirst({
    where: { id: input.productId, merchantId: merchant.id, isActive: true },
  });
  if (!product) throw badRequest("Product not available");
  if (product.stock < input.quantity) throw badRequest("Stock insuffisant");
  if (!PHONE_RE.test(input.phone.replace(/\s/g, ""))) throw badRequest("Numéro de téléphone invalide");
  if (input.fullName.trim().length < 3) throw badRequest("Nom trop court");
  if (input.address.trim().length < 5) throw badRequest("Adresse trop courte");

  const order = await createOrder({
    merchantId: merchant.id,
    customer: {
      fullName: input.fullName.trim(),
      phone: input.phone.replace(/^0/, "+212").replace(/\s/g, ""),
      city: input.city,
      address: input.address.trim(),
      notes: input.notes,
    },
    items: [{ productId: product.id, name: product.name, sku: product.sku ?? undefined, quantity: input.quantity, unitPrice: product.price }],
    discount,
    source: "STOREFRONT",
  });
  return { id: order.id, reference: order.reference, trackingUrl: `/track?ref=${order.reference}`, total: order.total };
}

export function formatMAD(c: number) {
  return `${new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(c / DH)} DH`;
}

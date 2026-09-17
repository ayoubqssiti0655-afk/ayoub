import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/server/db";
import { getI18n } from "@/i18n/server";
import { isFeatureEnabled } from "@/server/features";
import { Logo } from "@/components/logo";
import { StoreCatalog } from "@/components/store/store-catalog";
import { Truck } from "lucide-react";

export const metadata = { title: "Commander — Paiement à la livraison" };

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const i = await getI18n();
  if (!(await isFeatureEnabled("storefront"))) notFound();

  const merchant = await db.merchant.findFirst({
    where: { slug: decodeURIComponent(slug), status: "ACTIVE" },
    select: { id: true, name: true, slug: true, storeBio: true, city: true, brandColor: true },
  });
  if (!merchant) notFound();

  const [products, cities] = await Promise.all([
    db.product.findMany({
      where: { merchantId: merchant.id, isActive: true, stock: { gt: 0 } },
      select: { id: true, name: true, price: true, category: true },
      orderBy: { createdAt: "asc" },
      take: 24,
    }),
    db.city.findMany({ orderBy: { nameFr: "asc" } }),
  ]);
  const cityNames = cities.map((c) => c.nameFr);

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-8 items-center justify-center rounded-lg text-[13px] font-bold text-white"
              style={{ background: merchant.brandColor }}
            >
              {merchant.name[0]}
            </span>
            <span className="text-[15px] font-semibold">{merchant.name}</span>
          </div>
          <Link href="/" className="text-[11.5px] text-faint hover:text-foreground">
            <span className="inline-flex items-center gap-1"><Truck className="size-3" /> Masar</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-[24px] font-bold tracking-[-0.02em]">{merchant.name}</h1>
        <p className="mt-1.5 text-[14px] text-muted-foreground">
          {merchant.storeBio ?? `${merchant.city} — الدفع عند الاستلام · Paiement à la livraison`}
        </p>

        <StoreCatalog
          storeName={merchant.name}
          slug={merchant.slug}
          products={products.map((p) => ({ id: p.id, name: p.name, price: p.price, category: p.category }))}
          cities={cityNames}
        />
      </main>

      <footer className="py-8 text-center">
        <p className="text-[11.5px] text-faint">Paiement à la livraison · توصيل لجميع المدن المغربية · <Link href="/" className="hover:text-foreground">Powered by Masar</Link></p>
      </footer>
    </div>
  );
}

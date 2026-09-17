import { OrderDetailView } from "@/components/merchant/order-detail-view";

export const metadata = { title: "Order" };

export default async function MerchantOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailView id={id} mode="merchant" />;
}

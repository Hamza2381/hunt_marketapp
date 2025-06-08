import { OrderTrackingPage } from "@/components/orders/order-tracking-page"

// Define the page component using the correct App Router pattern for Next.js 15
export default function OrderTracking({
  params,
}: {
  params: { id: string };
}) {
  return <OrderTrackingPage orderId={params.id} />
}

// This helps Next.js with static generation
export async function generateStaticParams() {
  // For dynamic order pages, we typically don't pre-generate
  return []
}

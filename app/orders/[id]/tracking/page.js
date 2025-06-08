import { OrderTrackingPage } from "@/components/orders/order-tracking-page"

// Define the page component using an async function to handle Promise params
export default async function OrderTracking({ params }) {
  // Await the params if they're a Promise, otherwise use them directly
  const resolvedParams = params instanceof Promise ? await params : params;
  const id = resolvedParams.id;
  
  return <OrderTrackingPage orderId={id} />;
}

// This helps Next.js with static generation
export async function generateStaticParams() {
  return [];
}

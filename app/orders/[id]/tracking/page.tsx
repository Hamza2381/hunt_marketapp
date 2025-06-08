import { OrderTrackingPage } from "@/components/orders/order-tracking-page"

interface OrderTrackingProps {
  params: {
    id: string
  }
}

export default function OrderTracking({ params }: OrderTrackingProps) {
  return <OrderTrackingPage orderId={params.id} />
}

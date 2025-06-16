import { DealsPage } from "@/components/deals/deals-page"

// Force dynamic rendering to prevent static build caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function Deals() {
  return <DealsPage />
}

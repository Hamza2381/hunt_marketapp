import { ProductDetailPage } from "@/components/products/product-detail-page"

// Define the page component using the correct App Router pattern for Next.js 15
export default function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  return <ProductDetailPage productId={params.id} />
}

// This helps Next.js with static generation
export async function generateStaticParams() {
  // For a real app, you might fetch product IDs from your database
  // For now, we'll return an empty array to have pages generated on-demand
  return []
}

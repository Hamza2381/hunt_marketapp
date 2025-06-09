import { Suspense } from "react"
import { ProductDetailPage } from "@/components/products/product-detail-page"

// Define the page component as async
export default async function ProductPage({ params }) {
  // Get the ID and await it
  const data = await params;
  const id = data.id
  
  return (
    <Suspense fallback={<div>Loading product...</div>}>
      <ProductDetailPage productId={id} />
    </Suspense>
  );
}

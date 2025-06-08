import { ProductDetailPage } from "@/components/products/product-detail-page"

// Define the page component using an async function to handle Promise params
export default async function ProductPage({ params }) {
  // Await the params if they're a Promise, otherwise use them directly
  const resolvedParams = params instanceof Promise ? await params : params;
  const id = resolvedParams.id;
  
  return <ProductDetailPage productId={id} />;
}

// This helps Next.js with static generation
export async function generateStaticParams() {
  return [];
}

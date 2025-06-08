import { CategoryPage } from "@/components/categories/category-page"

// Define the page component using an async function to handle Promise params
export default async function Category({ params }) {
  // Await the params if they're a Promise, otherwise use them directly
  const resolvedParams = params instanceof Promise ? await params : params;
  const slug = resolvedParams.slug;
  
  return <CategoryPage categorySlug={slug} />;
}

// This helps Next.js with static generation
export async function generateStaticParams() {
  return [];
}

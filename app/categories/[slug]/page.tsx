// Your working code
import { CategoryPage } from "@/components/categories/category-page";
import type { Metadata } from "next";

// Force dynamic rendering to prevent static build caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function Category({ params }: CategoryPageProps) {
  const { slug } = await params
  return <CategoryPage categorySlug={slug} />;
}

export async function generateStaticParams() {
  return []; // modify later for pre-rendering
}

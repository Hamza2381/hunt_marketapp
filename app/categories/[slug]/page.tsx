// Your working code
import { CategoryPage } from "@/components/categories/category-page";
import type { Metadata } from "next";

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

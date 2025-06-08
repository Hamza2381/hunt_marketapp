// Your working code
import { CategoryPage } from "@/components/categories/category-page";
import type { Metadata } from "next";

interface CategoryPageProps {
  params: { slug: string };
}

export default function Category({ params }: CategoryPageProps) {
  return <CategoryPage categorySlug={params.slug} />;
}

export async function generateStaticParams() {
  return []; // modify later for pre-rendering
}

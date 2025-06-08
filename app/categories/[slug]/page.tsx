import { CategoryPage } from "@/components/categories/category-page"

interface CategoryPageProps {
  params: {
    slug: string
  }
}

export default function Category({ params }: CategoryPageProps) {
  return <CategoryPage categorySlug={params.slug} />
}

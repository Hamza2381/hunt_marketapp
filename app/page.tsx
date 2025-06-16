import { ProductGrid } from "@/components/product-grid"
import { HeroSection } from "@/components/hero-section"
import { CategoryNav } from "@/components/category-nav"
import { FeaturedDeals } from "@/components/featured-deals"

// Force dynamic rendering to prevent static build caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <CategoryNav />
      <FeaturedDeals />
      
      <div className="container mx-auto px-4 py-8">
        <ProductGrid onlyFeatured={true} />
      </div>
    </div>
  )
}
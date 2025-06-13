import { ProductGrid } from "@/components/product-grid"
import { HeroSection } from "@/components/hero-section"
import { CategoryNav } from "@/components/category-nav"
import { FeaturedDeals } from "@/components/featured-deals"

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
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"

const deals = [
  {
    id: 1,
    title: 'Hammermill Copy Plus 8.5" x 11" Copy Paper, 20 lbs., 3-Hole Punched',
    price: 44.99,
    originalPrice: 79.99,
    rating: 4.5,
    reviews: 1753,
    badge: "Price Promise",
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 2,
    title: "Dunkin' Original Blend Coffee Keurig® K-Cup® Pods",
    price: 36.99,
    originalPrice: 79.99,
    rating: 4.8,
    reviews: 554,
    badge: "New Customers",
    discount: "38% off",
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 3,
    title: "Quill Brand® File Folders, 1/3-Cut Tab, Letter Size, Manila",
    price: 15.99,
    originalPrice: 32.69,
    rating: 4.3,
    reviews: 523,
    badge: "New Customers",
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 4,
    title: "Duracell Coppertop AA Alkaline Battery, 36/Pack",
    price: 19.99,
    originalPrice: 42.99,
    rating: 4.6,
    reviews: 504,
    badge: "New Customers",
    image: "/placeholder.svg?height=200&width=200",
  },
]

export function FeaturedDeals() {
  return (
    <div className="bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6">Featured Deals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {deals.map((deal) => (
            <Card key={deal.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="relative mb-4">
                  <img
                    src={deal.image || "/placeholder.svg"}
                    alt={deal.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Badge className="absolute top-2 left-2 bg-blue-600">{deal.badge}</Badge>
                  {deal.discount && <Badge className="absolute top-2 right-2 bg-red-500">{deal.discount}</Badge>}
                </div>

                <h3 className="font-medium text-sm mb-2 line-clamp-2">{deal.title}</h3>

                <div className="flex items-center space-x-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(deal.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="text-sm text-gray-600">({deal.reviews})</span>
                </div>

                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-lg font-bold">${deal.price}</span>
                  <span className="text-sm text-gray-500 line-through">${deal.originalPrice}</span>
                </div>

                <Button className="w-full" size="sm">
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

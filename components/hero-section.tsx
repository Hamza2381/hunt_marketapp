import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Truck, Star, Gift } from "lucide-react"

export function HeroSection() {
  return (
    <div className="bg-gradient-to-r from-green-600 to-green-800 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Hero Card */}
          <Card className="lg:col-span-2 bg-green-700 border-green-600 text-white">
            <CardContent className="p-8">
              <div className="flex items-center space-x-4 mb-4">
                <div className="bg-white/20 p-3 rounded-lg">
                  <Gift className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Every order gets rewarded</h2>
                  <p className="text-green-100 mt-2">{"Today's exclusive reward!"}</p>
                </div>
              </div>
              <div className="bg-white/10 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Truck className="h-5 w-5" />
                  <span className="font-semibold">Offer code: SHIPFREE</span>
                </div>
                <p className="text-sm text-green-100">Free shipping on {"today's"} purchase</p>
              </div>
              <Button className="mt-4 bg-white text-green-600 hover:bg-green-50">REDEEM NOW</Button>
            </CardContent>
          </Card>

          {/* Limited Time Offer */}
          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardContent className="p-6">
              <Badge className="mb-3 bg-orange-500">Limited time offer</Badge>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">$44.99</div>
                <div className="text-sm text-gray-300">10 reams</div>
                <h3 className="font-semibold mt-2">Your exclusive paper deal</h3>
                <p className="text-sm text-gray-400 mt-1">Save your business more on paper</p>
              </div>
              <Button className="w-full mt-4 bg-green-600 hover:bg-green-700">GET DEAL</Button>
            </CardContent>
          </Card>

          {/* Rewards Card */}
          <Card className="bg-white text-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-green-100 p-2 rounded-full">
                  <Star className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Use your points for self care</h3>
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">Rewards</div>
                <p className="text-sm text-gray-600 mt-1">Add this reward to your order</p>
              </div>
              <Button className="w-full mt-4" variant="outline">
                REDEEM NOW
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

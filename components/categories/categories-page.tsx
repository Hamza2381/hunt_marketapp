"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Printer, Scissors, Coffee, Monitor, Package } from "lucide-react"
import Link from "next/link"

const categories = [
  {
    name: "Paper",
    icon: FileText,
    href: "/categories/paper",
    description: "Copy paper, cardstock, specialty papers and more",
    productCount: 156,
    image: "/placeholder.svg?height=200&width=300",
    featured: ["Premium Copy Paper", "Cardstock", "Photo Paper"],
  },
  {
    name: "Ink & Toner",
    icon: Printer,
    href: "/categories/ink-toner",
    description: "Printer cartridges and refills for all major brands",
    productCount: 89,
    image: "/placeholder.svg?height=200&width=300",
    featured: ["HP Compatible", "Canon Compatible", "Epson Compatible"],
  },
  {
    name: "Office Supplies",
    icon: Scissors,
    href: "/categories/office-supplies",
    description: "Pens, pencils, staplers, and desk organizers",
    productCount: 234,
    image: "/placeholder.svg?height=200&width=300",
    featured: ["Writing Instruments", "Desk Accessories", "Filing"],
  },
  {
    name: "Coffee & Snacks",
    icon: Coffee,
    href: "/categories/coffee-snacks",
    description: "Break room supplies including coffee, tea, and snacks",
    productCount: 45,
    image: "/placeholder.svg?height=200&width=300",
    featured: ["K-Cups", "Ground Coffee", "Healthy Snacks"],
  },
  {
    name: "Technology",
    icon: Monitor,
    href: "/categories/technology",
    description: "Computer accessories, cables, and electronic devices",
    productCount: 67,
    image: "/placeholder.svg?height=200&width=300",
    featured: ["Keyboards & Mice", "Cables", "Storage"],
  },
  {
    name: "Cleaning",
    icon: Package,
    href: "/categories/cleaning",
    description: "Cleaning supplies and janitorial products",
    productCount: 78,
    image: "/placeholder.svg?height=200&width=300",
    featured: ["All-Purpose Cleaners", "Paper Towels", "Sanitizers"],
  },
]

export function CategoriesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Shop by Category</h1>
          <p className="text-gray-600 mt-2">Find exactly what you need for your business</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link key={category.name} href={category.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="relative">
                  <img
                    src={category.image || "/placeholder.svg"}
                    alt={category.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  <div className="absolute top-4 left-4">
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                      <category.icon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <Badge className="absolute top-4 right-4 bg-blue-600">{category.productCount} products</Badge>
                </div>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{category.name}</span>
                  </CardTitle>
                  <p className="text-gray-600 text-sm">{category.description}</p>
                </CardHeader>
                <CardContent>
                  <div>
                    <h4 className="font-medium text-sm mb-2">Popular items:</h4>
                    <div className="flex flex-wrap gap-1">
                      {category.featured.map((item) => (
                        <Badge key={item} variant="outline" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Popular Categories Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Most Popular</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.slice(0, 4).map((category) => (
              <Link key={category.name} href={category.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <category.icon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h3 className="font-medium">{category.name}</h3>
                    <p className="text-sm text-gray-600">{category.productCount} items</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

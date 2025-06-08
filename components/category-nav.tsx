import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileText, Printer, Scissors, Coffee, Monitor, Package, Menu } from "lucide-react"

const categories = [
  { name: "All Categories", icon: Menu, href: "/categories" },
  { name: "Paper", icon: FileText, href: "/categories/paper" },
  { name: "Ink & Toner", icon: Printer, href: "/categories/ink-toner" },
  { name: "Office Supplies", icon: Scissors, href: "/categories/office-supplies" },
  { name: "Coffee & Snacks", icon: Coffee, href: "/categories/coffee-snacks" },
  { name: "Technology", icon: Monitor, href: "/categories/technology" },
  { name: "Cleaning", icon: Package, href: "/categories/cleaning" },
]

export function CategoryNav() {
  return (
    <div className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center space-x-1 py-3 overflow-x-auto">
          {categories.map((category) => (
            <Button
              key={category.name}
              variant="ghost"
              asChild
              className="flex items-center space-x-2 whitespace-nowrap"
            >
              <Link href={category.href}>
                <category.icon className="h-4 w-4" />
                <span>{category.name}</span>
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

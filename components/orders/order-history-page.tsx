"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Search, Package, Eye, Download, RefreshCw } from "lucide-react"
import Link from "next/link"

const orders = [
  {
    id: "ORD-001",
    date: "2024-01-15",
    status: "delivered",
    total: 156.99,
    items: 3,
    paymentMethod: "Credit Line",
    trackingNumber: "1Z999AA1234567890",
    estimatedDelivery: "2024-01-18",
    actualDelivery: "2024-01-17",
    items_detail: [
      { name: "Premium Copy Paper - 500 Sheets", quantity: 3, price: 12.99 },
      { name: "Black Ink Cartridge - HP Compatible", quantity: 2, price: 24.99 },
      { name: "Sticky Notes - Assorted Colors", quantity: 3, price: 8.99 },
    ],
  },
  {
    id: "ORD-002",
    date: "2024-01-20",
    status: "shipped",
    total: 89.99,
    items: 2,
    paymentMethod: "Credit Card",
    trackingNumber: "1Z999AA1234567891",
    estimatedDelivery: "2024-01-23",
    actualDelivery: null,
    items_detail: [
      { name: "Coffee K-Cups - Variety Pack", quantity: 1, price: 32.99 },
      { name: "All-Purpose Cleaner - 32oz", quantity: 2, price: 6.99 },
    ],
  },
  {
    id: "ORD-003",
    date: "2024-01-22",
    status: "processing",
    total: 245.5,
    items: 5,
    paymentMethod: "Credit Line",
    trackingNumber: null,
    estimatedDelivery: "2024-01-26",
    actualDelivery: null,
    items_detail: [
      { name: "Laser Printer Paper - Ream", quantity: 5, price: 15.99 },
      { name: "Color Ink Cartridge Set", quantity: 2, price: 39.99 },
      { name: "Wireless Mouse - Ergonomic Design", quantity: 1, price: 19.99 },
    ],
  },
  {
    id: "ORD-004",
    date: "2024-01-25",
    status: "pending",
    total: 67.98,
    items: 4,
    paymentMethod: "Credit Line",
    trackingNumber: null,
    estimatedDelivery: "2024-01-29",
    actualDelivery: null,
    items_detail: [
      { name: "Sticky Notes - Assorted Colors", quantity: 4, price: 8.99 },
      { name: "Premium Copy Paper - 500 Sheets", quantity: 2, price: 12.99 },
    ],
  },
]

export function OrderHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      case "shipped":
        return "bg-purple-100 text-purple-800"
      case "delivered":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return "⏳"
      case "processing":
        return "🔄"
      case "shipped":
        return "🚚"
      case "delivered":
        return "✅"
      case "cancelled":
        return "❌"
      default:
        return "📦"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Order History</h1>
          <p className="text-gray-600 mt-2">Track and manage your orders</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2 flex-1">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by order number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{order.id}</span>
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusIcon(order.status)} {order.status}
                      </Badge>
                    </CardTitle>
                    <div className="text-sm text-gray-600 mt-1">
                      <p>Ordered on {new Date(order.date).toLocaleDateString()}</p>
                      <p>
                        {order.items} items • ${order.total} • {order.paymentMethod}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {expandedOrder === order.id ? "Hide" : "View"} Details
                    </Button>
                    {order.status === "delivered" && (
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Reorder
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {expandedOrder === order.id && (
                <CardContent>
                  <Separator className="mb-4" />

                  {/* Order Details */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Items */}
                    <div>
                      <h4 className="font-medium mb-3">Order Items</h4>
                      <div className="space-y-2">
                        {order.items_detail.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-gray-500">Qty: {item.quantity}</p>
                            </div>
                            <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipping & Tracking */}
                    <div>
                      <h4 className="font-medium mb-3">Shipping Information</h4>
                      <div className="space-y-2 text-sm">
                        {order.trackingNumber && (
                          <div>
                            <p className="text-gray-600">Tracking Number:</p>
                            <p className="font-mono">{order.trackingNumber}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-gray-600">Estimated Delivery:</p>
                          <p>{new Date(order.estimatedDelivery).toLocaleDateString()}</p>
                        </div>
                        {order.actualDelivery && (
                          <div>
                            <p className="text-gray-600">Delivered On:</p>
                            <p className="text-green-600 font-medium">
                              {new Date(order.actualDelivery).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 mt-6 pt-4 border-t">
                    {order.trackingNumber && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/orders/${order.id}/tracking`}>
                          <Package className="h-4 w-4 mr-1" />
                          Track Package
                        </Link>
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download Invoice
                    </Button>
                    {order.status === "delivered" && (
                      <Button variant="outline" size="sm">
                        Leave Review
                      </Button>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "You haven't placed any orders yet"}
              </p>
              <Button asChild>
                <Link href="/">Start Shopping</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

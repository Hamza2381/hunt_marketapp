"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, Truck, MapPin, Clock, CheckCircle } from "lucide-react"
import Link from "next/link"

// Mock tracking data
const trackingData = {
  "ORD-001": {
    orderNumber: "ORD-001",
    trackingNumber: "1Z999AA1234567890",
    status: "delivered",
    estimatedDelivery: "2024-01-18",
    actualDelivery: "2024-01-17",
    carrier: "UPS",
    shippingMethod: "Ground",
    events: [
      {
        date: "2024-01-17",
        time: "2:30 PM",
        status: "Delivered",
        location: "Front Door - Business City, BC",
        description: "Package delivered to front door",
        icon: CheckCircle,
        color: "text-green-600",
      },
      {
        date: "2024-01-17",
        time: "8:45 AM",
        status: "Out for Delivery",
        location: "Business City, BC",
        description: "Package is out for delivery",
        icon: Truck,
        color: "text-blue-600",
      },
      {
        date: "2024-01-16",
        time: "11:20 PM",
        status: "Arrived at Facility",
        location: "Business City Distribution Center",
        description: "Package arrived at local facility",
        icon: Package,
        color: "text-gray-600",
      },
      {
        date: "2024-01-16",
        time: "6:15 AM",
        status: "In Transit",
        location: "Regional Hub - State City, ST",
        description: "Package in transit to destination",
        icon: Truck,
        color: "text-gray-600",
      },
      {
        date: "2024-01-15",
        time: "3:45 PM",
        status: "Shipped",
        location: "Origin Facility - Warehouse City, WC",
        description: "Package shipped from origin",
        icon: Package,
        color: "text-gray-600",
      },
    ],
    items: [
      { name: "Premium Copy Paper - 500 Sheets", quantity: 3, price: 12.99 },
      { name: "Black Ink Cartridge - HP Compatible", quantity: 2, price: 24.99 },
      { name: "Sticky Notes - Assorted Colors", quantity: 3, price: 8.99 },
    ],
    shippingAddress: {
      name: "John Doe",
      company: "Acme Corp",
      address: "123 Business Street, Suite 100",
      city: "Business City, BC 12345",
    },
  },
  "ORD-002": {
    orderNumber: "ORD-002",
    trackingNumber: "1Z999AA1234567891",
    status: "shipped",
    estimatedDelivery: "2024-01-23",
    actualDelivery: null,
    carrier: "FedEx",
    shippingMethod: "Express",
    events: [
      {
        date: "2024-01-21",
        time: "4:20 PM",
        status: "In Transit",
        location: "Regional Hub - State City, ST",
        description: "Package in transit to destination",
        icon: Truck,
        color: "text-blue-600",
      },
      {
        date: "2024-01-20",
        time: "2:15 PM",
        status: "Shipped",
        location: "Origin Facility - Warehouse City, WC",
        description: "Package shipped from origin",
        icon: Package,
        color: "text-gray-600",
      },
    ],
    items: [
      { name: "Coffee K-Cups - Variety Pack", quantity: 1, price: 32.99 },
      { name: "All-Purpose Cleaner - 32oz", quantity: 2, price: 6.99 },
    ],
    shippingAddress: {
      name: "Jane Smith",
      company: null,
      address: "456 Home Avenue",
      city: "Home City, HC 12345",
    },
  },
}

interface OrderTrackingPageProps {
  orderId: string
}

export function OrderTrackingPage({ orderId }: OrderTrackingPageProps) {
  const [tracking, setTracking] = useState<any>(null)

  useEffect(() => {
    const trackingInfo = trackingData[orderId as keyof typeof trackingData]
    setTracking(trackingInfo)
  }, [orderId])

  if (!tracking) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Order not found</h1>
            <p className="text-gray-600 mt-2">The order you're looking for doesn't exist.</p>
            <Button asChild className="mt-4">
              <Link href="/orders">Back to Orders</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800"
      case "shipped":
        return "bg-blue-100 text-blue-800"
      case "processing":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-600">
            <li>
              <Link href="/" className="hover:text-green-600">
                Home
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/orders" className="hover:text-green-600">
                Orders
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900">Track Order {tracking.orderNumber}</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Track Your Order</h1>
          <p className="text-gray-600">Order #{tracking.orderNumber}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Tracking Timeline */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Tracking Details</span>
                  <Badge className={getStatusColor(tracking.status)}>
                    {tracking.status.charAt(0).toUpperCase() + tracking.status.slice(1)}
                  </Badge>
                </CardTitle>
                <div className="text-sm text-gray-600">
                  <p>Tracking Number: {tracking.trackingNumber}</p>
                  <p>
                    Carrier: {tracking.carrier} {tracking.shippingMethod}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                {/* Delivery Status */}
                <div className="mb-6 p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {tracking.status === "delivered" ? (
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    ) : (
                      <Clock className="h-8 w-8 text-blue-600" />
                    )}
                    <div>
                      <h3 className="font-medium">
                        {tracking.status === "delivered" ? "Delivered" : "Estimated Delivery"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {tracking.actualDelivery
                          ? `Delivered on ${new Date(tracking.actualDelivery).toLocaleDateString()}`
                          : `Expected by ${new Date(tracking.estimatedDelivery).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-4">
                  <h4 className="font-medium">Tracking History</h4>
                  <div className="relative">
                    {tracking.events.map((event: any, index: number) => (
                      <div key={index} className="flex items-start space-x-4 pb-6 relative">
                        {/* Timeline line */}
                        {index < tracking.events.length - 1 && (
                          <div className="absolute left-4 top-8 w-0.5 h-full bg-gray-200" />
                        )}

                        {/* Event icon */}
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center ${event.color}`}
                        >
                          <event.icon className="h-4 w-4" />
                        </div>

                        {/* Event details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium">{event.status}</h5>
                            <span className="text-sm text-gray-500">
                              {event.date} at {event.time}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          <p className="text-sm text-gray-500 flex items-center mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            {event.location}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{tracking.shippingAddress.name}</p>
                  {tracking.shippingAddress.company && <p>{tracking.shippingAddress.company}</p>}
                  <p>{tracking.shippingAddress.address}</p>
                  <p>{tracking.shippingAddress.city}</p>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tracking.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href={`/orders`}>View Order Details</Link>
              </Button>
              {tracking.status === "delivered" && (
                <Button variant="outline" className="w-full">
                  Report an Issue
                </Button>
              )}
              <Button variant="outline" className="w-full">
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

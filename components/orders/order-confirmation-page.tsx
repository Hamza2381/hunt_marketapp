"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Package, Mail, Calendar, CreditCard, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import Link from "next/link"

interface OrderItem {
  id: number
  product_id: number
  quantity: number
  unit_price: number
  total_price: number
  product_name: string
}

interface Order {
  id: number
  order_number: string
  user_id: string
  total_amount: number
  payment_method: string
  status: string
  shipping_address: string
  billing_address: string
  special_instructions?: string
  created_at: string
  updated_at: string
  items: OrderItem[]
}

export function OrderConfirmationPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOrder() {
      setIsLoading(true)
      setError(null)

      try {
        if (!orderId) {
          throw new Error('Order ID is required')
        }

        // Fetch order from our API endpoint
        const response = await fetch(`/api/orders?orderId=${orderId}`)
        
        // Check if the request was successful
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch order')
        }
        
        // Get the order data
        const orderData = await response.json()
        console.log('Fetched order:', orderData)
        
        // Set the order data
        setOrder(orderData)
      } catch (err: any) {
        console.error('Failed to fetch order:', err)
        setError(err.message || 'Failed to load order details')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
          <h2 className="text-xl font-medium">Loading order details...</h2>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="bg-red-100 p-4 rounded-full inline-flex mx-auto mb-4">
            <CheckCircle className="h-12 w-12 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-red-600 mb-2">Order Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'Unable to load order details'}</p>
          <Button asChild>
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    )
  }
  
  // Parse addresses - handle both JSON and plain text formats
  let shippingAddress;
  try {
    // Try to parse as JSON first
    shippingAddress = JSON.parse(order.shipping_address || '{}');
  } catch (e) {
    // If it's not valid JSON, it's probably a plain string
    const addressStr = order.shipping_address || '';
    // Create a simple object with just the full address
    shippingAddress = { fullAddress: addressStr };
  }
  
  // Do the same for billing address
  let billingAddress;
  try {
    billingAddress = JSON.parse(order.billing_address || '{}');
  } catch (e) {
    const addressStr = order.billing_address || '';
    billingAddress = { fullAddress: addressStr };
  }
  const orderDate = new Date(order.created_at)
  const estimatedDelivery = new Date(orderDate)
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 3) // Estimated delivery is 3 days after order date

  // Calculate order totals
  const subtotal = order.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const shipping = 0 // Free shipping
  const tax = subtotal * 0.08

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 p-4 rounded-full">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-green-600 mb-2">Order Confirmed!</h1>
          <p className="text-gray-600 mb-2">Thank you for your order. We'll send you a confirmation email shortly.</p>
          <p className="text-lg font-medium">Order #{order.order_number}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Order Summary</span>
                </CardTitle>
                <div className="text-sm text-gray-600">
                  <p>Order #{order.order_number}</p>
                  <p>Placed on {new Date(order.created_at).toLocaleDateString()}</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <div>
                        <p className="font-medium">{item.product_name || `Product #${item.product_id}`}</p>
                        <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                      </div>
                      <p className="font-medium">${(item.unit_price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span className="text-green-600 font-medium">FREE</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>${order.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Information */}
            <Card>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {shippingAddress.fullAddress ? (
                    // Plain text address format
                    <p>{shippingAddress.fullAddress}</p>
                  ) : (
                    // JSON object format
                    <>
                      <p className="font-medium">{shippingAddress.name}</p>
                      <p>{shippingAddress.company}</p>
                      <p>{shippingAddress.street}{shippingAddress.street2 ? `, ${shippingAddress.street2}` : ''}</p>
                      <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}</p>
                      {shippingAddress.phone && <p>Phone: {shippingAddress.phone}</p>}
                    </>
                  )}
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Estimated Delivery:</span>
                  </div>
                  <p className="text-blue-600 font-medium">{estimatedDelivery.toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Next Steps */}
          <div className="space-y-6">
            {/* Payment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Payment</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Method:</span>
                    <Badge variant="outline">{order.payment_method}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge className="bg-green-100 text-green-800">Confirmed</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* What's Next */}
            <Card>
              <CardHeader>
                <CardTitle>What's Next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Confirmation Email</p>
                    <p className="text-sm text-gray-600">
                      We'll send you an email with order details and tracking info.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Package className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Order Processing</p>
                    <p className="text-sm text-gray-600">Your order will be processed within 1-2 business days.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Track Your Order</p>
                    <p className="text-sm text-gray-600">You'll receive tracking information once your order ships.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/orders">View Order History</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Continue Shopping</Link>
              </Button>
            </div>

            {/* Support */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Need help with your order?</p>
                  <Button variant="outline" size="sm">
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

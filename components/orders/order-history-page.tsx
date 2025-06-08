"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Search, Package, Eye, Download, RefreshCw, Loader2 } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"

export function OrderHistoryPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [expandedOrder, setExpandedOrder] = useState(null)

  useEffect(() => {
    async function fetchOrders() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      // First, check if we have a user mapping in localStorage from previous orders
      let userMapping;
      try {
        const savedMapping = localStorage.getItem('userMapping');
        if (savedMapping) {
          userMapping = JSON.parse(savedMapping);
          console.log('Found saved user mapping:', userMapping);
        }
      } catch (e) {
        console.error('Error reading user mapping:', e);
      }

      try {
        setIsLoading(true);
        setError(null);

        // Include user mapping if available
        const body = {
          userId: user.id,
          userEmail: user.email,
          // Include numeric ID if we have it
          numericId: userMapping?.numericId
        };
        
        // Call the new user-orders API
        const response = await fetch('/api/orders/user-orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch orders');
        }

        const data = await response.json();
        
        // Client-side filter to match orders with the current user
        const userOrders = data.orders.filter(order => {
          console.log(`Checking order ${order.id} with user_id ${order.user_id} against user ${user.id}`);
          
          // Use simplified approach: show orders with user_id = 1 
          // since we're creating all orders with this ID temporarily
          return order.user_id === user.id;
          
          // Once you implement a proper mapping table, you can use this more specific logic:
          /*
          return (
            // Direct UUID match (unlikely but possible)
            order.user_id === user.id ||
            // Match against numeric ID from mapping
            (userMapping?.numericId && order.user_id === userMapping.numericId) ||
            // Match against numeric ID from response
            (data.userMapping?.numericId && order.user_id === data.userMapping.numericId)
          );
          */
        });
        
        // Save any user mapping returned by the API for future use
        if (data.userMapping && data.userMapping.numericId) {
          console.log('Saving user mapping from API response:', data.userMapping);
          try {
            localStorage.setItem('userMapping', JSON.stringify(data.userMapping));
          } catch (e) {
            console.error('Error saving user mapping:', e);
          }
        }
        
        console.log(`Showing ${userOrders.length} orders for user ${user.email}`);
        setOrders(userOrders);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrders()
  }, [user])

  // Add a filter to show only current user's orders or all orders
  const [userFilter, setUserFilter] = useState("my"); // "all" or "my" - default to "my"

  const filteredOrders = orders.filter((order) => {
    // First apply the search and status filters
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    // Then apply the user filter if set to "my"
    // FIXED: Use our simplified mapping approach - all user orders have user_id = 1
    const matchesUser = userFilter === "all" || (
      userFilter === "my" && (
        // Match against our mapping system
        order.user_id === user.id
      )
    );
    
    return matchesSearch && matchesStatus && matchesUser;
  });

  const getStatusColor = (status) => {
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

  const getStatusIcon = (status) => {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-medium">Loading your orders...</h2>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-medium text-red-600 mb-2">Error loading orders</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="my">My Orders</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                        {order.items} items • ${order.total.toFixed(2)} • {order.paymentMethod}
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
                        <Link href={`/orders/${order.orderId}/tracking`}>
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
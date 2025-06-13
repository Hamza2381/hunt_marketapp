"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, Package, Truck, Loader2, AlertTriangle, RefreshCw, CheckCircle, XCircle, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AdminCache } from "@/lib/admin-cache"

interface OrderWithUserDetails {
  id: number;
  order_number: string;
  user_id: string;
  total_amount: number;
  payment_method: string;
  status: string;
  shipping_address?: string;
  billing_address?: string;
  created_at: string;
  updated_at: string;
  user_profiles?: {
    id: string;
    name: string;
    email: string;
    account_type: string;
    company_name?: string;
    phone?: string;
  };
  order_items?: Array<{
    id: number;
    product_id: number;
    quantity: number;
    unit_price: number;
    total_price: number;
    products?: {
      id: number;
      name: string;
      sku: string;
    };
  }>;
  items_count?: number;
}

const CACHE_KEY = 'admin-orders'

export function OrderManagement() {
  const [orders, setOrders] = useState<OrderWithUserDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState<OrderWithUserDetails | null>(null)
  const [isViewOrderOpen, setIsViewOrderOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const { toast } = useToast()
  
  // Optimized orders fetching with caching (same pattern as users)
  const fetchOrders = useCallback(async (forceRefresh = false) => {
    // Check cache first unless force refresh
    if (!AdminCache.shouldRefresh<OrderWithUserDetails[]>(CACHE_KEY, forceRefresh)) {
      const cached = AdminCache.get<OrderWithUserDetails[]>(CACHE_KEY)
      if (cached.data) {
        setOrders(cached.data)
        setIsLoading(false)
        return
      }
    }
    
    // Prevent multiple simultaneous requests
    if (AdminCache.get(CACHE_KEY).isLoading && !forceRefresh) {
      return
    }
    
    AdminCache.setLoading(CACHE_KEY, true)
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('Fetching all orders for admin...');
      
      const response = await fetch('/api/admin/orders', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch orders');
      }

      const data = await response.json();
      const ordersData = data.orders || []
      
      console.log('Orders fetched:', ordersData.length);
      
      // Update cache and state
      AdminCache.set(CACHE_KEY, ordersData)
      setOrders(ordersData);
      
    } catch (err: any) {
      console.error('Error fetching orders:', err.message)
      setError('Failed to load orders. Please try again.')
      setOrders([])
      
      toast({
        title: 'Error',
        description: 'Failed to load orders data.',
        variant: 'destructive',
      })
    } finally {
      AdminCache.setLoading(CACHE_KEY, false)
      setIsLoading(false)
    }
  }, [toast])
  
  // Initial data fetch
  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Memoized filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!order.user_profiles) return false;
      
      const matchesSearch =
        order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user_profiles?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user_profiles?.email.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" || order.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [orders, searchTerm, statusFilter])

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

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "credit_line":
      case "Credit Line":
        return "Credit Line"
      case "credit_card":
        return "Credit Card"
      case "bank_transfer":
        return "Bank Transfer"
      default:
        return method
    }
  }
  
  const handleViewOrder = (order: OrderWithUserDetails) => {
    setSelectedOrder(order)
    setIsViewOrderOpen(true)
  }
  
  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    if (isUpdating) return;
    
    try {
      setIsUpdating(true);
      console.log(`Updating order ${orderId} status to ${newStatus}`);
      
      // Optimistically update the order in the UI
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
            : order
        )
      );
      
      // Update selected order if it's currently being viewed
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus, updated_at: new Date().toISOString() });
      }
      
      // Update cache
      const updatedOrders = orders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
          : order
      )
      AdminCache.set(CACHE_KEY, updatedOrders)
      
      toast({
        title: 'Order Updated',
        description: `Order status changed to ${newStatus}`,
      })
      
      // Background API call
      const response = await fetch('/api/admin/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update order status');
      }
      
    } catch (err: any) {
      console.error('Error updating order status:', err.message)
      
      // Rollback optimistic update
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? orders.find(o => o.id === orderId) || order
            : order
        )
      );
      
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false);
    }
  }

  const handleDeleteOrder = async (orderId: number) => {
    if (isDeleting === orderId) return;
    
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) return;
    
    try {
      setIsDeleting(orderId);
      console.log(`Deleting order ${orderId}`);
      
      // Optimistically remove from UI
      const orderToDelete = orders.find(o => o.id === orderId)
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
      
      // Close dialog if the deleted order was being viewed
      if (selectedOrder && selectedOrder.id === orderId) {
        setIsViewOrderOpen(false);
        setSelectedOrder(null);
      }
      
      // Update cache
      AdminCache.set(CACHE_KEY, orders.filter(order => order.id !== orderId))
      
      toast({
        title: 'Order Deleted',
        description: 'Order has been permanently deleted',
      })
      
      // Background API call
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete order');
      }
      
      // Refresh admin stats after successful order deletion
      if (typeof window !== 'undefined' && window.refreshAdminStats) {
        window.refreshAdminStats()
      }
      
    } catch (err: any) {
      console.error('Error deleting order:', err.message)
      
      // Rollback optimistic update
      if (orderToDelete) {
        setOrders(prevOrders => [...prevOrders, orderToDelete].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      }
      
      toast({
        title: 'Error',
        description: 'Failed to delete order',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Order Management</CardTitle>
            <CardDescription>Track and manage customer orders</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => fetchOrders(true)} title="Refresh orders">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {isLoading && orders.length === 0 ? (
          <div className="py-10 text-center">
            <RefreshCw className="h-8 w-8 mx-auto animate-spin text-gray-400" />
            <p className="mt-4 text-gray-500">Loading orders...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
            <p className="text-sm text-red-500 mt-2">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchOrders(true)}>
              Try Again
            </Button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-gray-500">No orders found{searchTerm ? ` matching "${searchTerm}"` : ""}.</p>
            {(searchTerm || statusFilter !== "all") && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => {
                setSearchTerm("")
                setStatusFilter("all")
              }}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.user_profiles?.name}</div>
                      <div className="text-sm text-gray-500">{order.user_profiles?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={order.user_profiles?.account_type === "business" ? "default" : "secondary"}>
                      {order.user_profiles?.account_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">${order.total_amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{getPaymentMethodLabel(order.payment_method)}</div>
                      <div className="text-gray-500">{order.items_count} items</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleViewOrder(order)} title="View details">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {order.status === "pending" && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleUpdateStatus(order.id, "processing")}
                          disabled={isUpdating}
                          title="Mark as processing"
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                      )}
                      {order.status === "processing" && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleUpdateStatus(order.id, "shipped")}
                          disabled={isUpdating}
                          title="Mark as shipped"
                        >
                          <Truck className="h-4 w-4" />
                        </Button>
                      )}
                      {order.status === "shipped" && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleUpdateStatus(order.id, "delivered")}
                          disabled={isUpdating}
                          title="Mark as delivered"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {["pending", "processing"].includes(order.status) && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleUpdateStatus(order.id, "cancelled")}
                          disabled={isUpdating}
                          title="Cancel order"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteOrder(order.id)}
                        disabled={isDeleting === order.id}
                        title="Delete order"
                        className="text-red-600 hover:text-red-700"
                      >
                        {isDeleting === order.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
      
      {/* View Order Dialog */}
      <Dialog open={isViewOrderOpen} onOpenChange={setIsViewOrderOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>Order #{selectedOrder?.order_number}</DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Customer Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedOrder.user_profiles?.name}</p>
                    <p><span className="font-medium">Email:</span> {selectedOrder.user_profiles?.email}</p>
                    <p><span className="font-medium">Account Type:</span> {selectedOrder.user_profiles?.account_type}</p>
                    {selectedOrder.user_profiles?.account_type === "business" && (
                      <p><span className="font-medium">Company:</span> {selectedOrder.user_profiles?.company_name || "N/A"}</p>
                    )}
                    <p><span className="font-medium">Phone:</span> {selectedOrder.user_profiles?.phone || "N/A"}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Order Information</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Status:</span> 
                      <Badge className={getStatusColor(selectedOrder.status)}>{selectedOrder.status}</Badge>
                    </div>
                    <p><span className="font-medium">Order Date:</span> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                    <p><span className="font-medium">Payment Method:</span> {getPaymentMethodLabel(selectedOrder.payment_method)}</p>
                    <p><span className="font-medium">Total Amount:</span> ${selectedOrder.total_amount.toFixed(2)}</p>
                    {selectedOrder.shipping_address && (
                      <p><span className="font-medium">Shipping Address:</span> {selectedOrder.shipping_address}</p>
                    )}
                    {selectedOrder.billing_address && (
                      <p><span className="font-medium">Billing Address:</span> {selectedOrder.billing_address}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Order Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.order_items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.products?.name || `Product #${item.product_id}`}
                          {item.products?.sku && (
                            <div className="text-xs text-gray-500">SKU: {item.products.sku}</div>
                          )}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                        <TableCell>${item.total_price.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  <h4 className="font-medium">Order Actions</h4>
                  <p className="text-sm text-gray-500">Update order status or delete order</p>
                </div>
                <div className="flex space-x-2">
                  {selectedOrder.status === "pending" && (
                    <Button 
                      onClick={() => {
                        handleUpdateStatus(selectedOrder.id, "processing")
                        setIsViewOrderOpen(false)
                      }}
                      disabled={isUpdating}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Mark as Processing
                    </Button>
                  )}
                  {selectedOrder.status === "processing" && (
                    <Button 
                      onClick={() => {
                        handleUpdateStatus(selectedOrder.id, "shipped")
                        setIsViewOrderOpen(false)
                      }}
                      disabled={isUpdating}
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Mark as Shipped
                    </Button>
                  )}
                  {selectedOrder.status === "shipped" && (
                    <Button 
                      onClick={() => {
                        handleUpdateStatus(selectedOrder.id, "delivered")
                        setIsViewOrderOpen(false)
                      }}
                      disabled={isUpdating}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Delivered
                    </Button>
                  )}
                  {["pending", "processing"].includes(selectedOrder.status) && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        handleUpdateStatus(selectedOrder.id, "cancelled")
                        setIsViewOrderOpen(false)
                      }}
                      disabled={isUpdating}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Order
                    </Button>
                  )}
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      handleDeleteOrder(selectedOrder.id)
                    }}
                    disabled={isDeleting === selectedOrder.id}
                  >
                    {isDeleting === selectedOrder.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Delete Order
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
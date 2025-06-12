"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserManagement } from "./user-management"
import { ProductManagement } from "./product-management"
import { CategoryManagement } from "./category-management"
import { OrderManagement } from "./order-management"
import { ChatManagement } from "./chat-management"
import { Users, Package, ShoppingCart, DollarSign, TrendingUp, MessageCircle, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"

export function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
    activeUsers: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    // Check if user is admin
    if (user && !user.isAdmin) {
      console.log('User is not an admin, redirecting...')
      router.push('/')
      return
    }
    
    const fetchStats = async () => {
      setIsLoading(true)
      try {
        console.log('Fetching admin stats from API...');
        
        const response = await fetch('/api/admin/stats', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch admin stats');
        }
        
        const data = await response.json();
        
        if (data.success) {
          console.log('Admin stats received:', data.stats);
          setStats(data.stats);
        } else {
          console.error('Error in admin stats response:', data.error);
          setStats({
            totalUsers: 0,
            totalProducts: 0,
            totalOrders: 0,
            totalRevenue: 0,
            monthlyGrowth: 0,
            activeUsers: 0,
          });
        }
      } catch (error) {
        console.error('Error fetching admin dashboard stats:', error)
        setStats({
          totalUsers: 0,
          totalProducts: 0,
          totalOrders: 0,
          totalRevenue: 0,
          monthlyGrowth: 0,
          activeUsers: 0,
        });
      } finally {
        setIsLoading(false)
      }
    }
    
    if (user?.isAdmin) {
      fetchStats()
    }
  }, [user, router])

  // 🔥 REAL-TIME STATS UPDATES
  useEffect(() => {
    if (!user?.isAdmin) return

    console.log('Setting up real-time stats subscriptions...')

    // Subscribe to user_profiles changes
    const userChannel = supabase
      .channel('user-profile-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_profiles' },
        (payload) => {
          console.log('User profile change detected:', payload.eventType)
          
          // Optimistic updates based on the event type
          if (payload.eventType === 'INSERT') {
            setStats(prev => ({
              ...prev,
              totalUsers: prev.totalUsers + 1
            }))
          } else if (payload.eventType === 'DELETE') {
            setStats(prev => ({
              ...prev,
              totalUsers: Math.max(0, prev.totalUsers - 1)
            }))
          }
          // For UPDATE events, we might need to refetch if it affects activeUsers
        }
      )
      .subscribe()

    // Subscribe to products changes
    const productChannel = supabase
      .channel('product-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          console.log('Product change detected:', payload.eventType)
          
          if (payload.eventType === 'INSERT') {
            setStats(prev => ({
              ...prev,
              totalProducts: prev.totalProducts + 1
            }))
          } else if (payload.eventType === 'DELETE') {
            setStats(prev => ({
              ...prev,
              totalProducts: Math.max(0, prev.totalProducts - 1)
            }))
          }
        }
      )
      .subscribe()

    // Subscribe to orders changes
    const orderChannel = supabase
      .channel('order-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Order change detected:', payload.eventType)
          
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as any
            setStats(prev => ({
              ...prev,
              totalOrders: prev.totalOrders + 1,
              totalRevenue: prev.totalRevenue + (newOrder.total_amount || 0)
            }))
          } else if (payload.eventType === 'DELETE') {
            const deletedOrder = payload.old as any
            setStats(prev => ({
              ...prev,
              totalOrders: Math.max(0, prev.totalOrders - 1),
              totalRevenue: Math.max(0, prev.totalRevenue - (deletedOrder.total_amount || 0))
            }))
          } else if (payload.eventType === 'UPDATE') {
            const oldOrder = payload.old as any
            const newOrder = payload.new as any
            const revenueDiff = (newOrder.total_amount || 0) - (oldOrder.total_amount || 0)
            setStats(prev => ({
              ...prev,
              totalRevenue: Math.max(0, prev.totalRevenue + revenueDiff)
            }))
          }
        }
      )
      .subscribe()

    // Cleanup subscriptions on unmount
    return () => {
      console.log('Cleaning up real-time stats subscriptions...')
      supabase.removeChannel(userChannel)
      supabase.removeChannel(productChannel)
      supabase.removeChannel(orderChannel)
    }
  }, [user])

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }
  
  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="mt-2 text-gray-600">You do not have permission to view this page.</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your marketplace • Live Updates</p>
        </div>

        {/* Stats Cards - Now with Real-time Updates */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold animate-pulse-once">{stats.totalUsers.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{stats.activeUsers} active this month</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold animate-pulse-once">{stats.totalProducts.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Across all categories</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold animate-pulse-once">{stats.totalOrders.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">All time orders</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold animate-pulse-once">${stats.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    <TrendingUp className="inline h-3 w-3 mr-1" />
                    {stats.monthlyGrowth >= 0 ? '+' : ''}{stats.monthlyGrowth}% from last month
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="chat">
              <MessageCircle className="h-4 w-4 mr-2" />
              Support Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="products">
            <ProductManagement />
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManagement />
          </TabsContent>

          <TabsContent value="orders">
            <OrderManagement />
          </TabsContent>

          <TabsContent value="chat">
            <ChatManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

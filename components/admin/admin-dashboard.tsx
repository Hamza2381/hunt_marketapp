"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserManagement } from "./user-management"
import { ProductManagement } from "./product-management"
import { CategoryManagement } from "./category-management"
import { OrderManagement } from "./order-management"
import { DealManagement } from "./deals/deal-management"
import { ChatManagement } from "./chat-management"
import { AdminPageWrapper } from "./admin-page-wrapper"
import { Users, Package, ShoppingCart, DollarSign, TrendingUp, MessageCircle, Loader2, AlertTriangle, Percent } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { AdminStatusChecker } from "@/lib/admin-status-checker"

export function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
    activeUsers: 0,
  })
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("users")
  const { user, isAuthenticated } = useAuth()
  
  // Memoize admin check
  const isAdmin = useMemo(() => user?.isAdmin === true, [user?.isAdmin])
  
  // Optimized stats fetching
  const fetchStats = useCallback(async () => {
    if (!isAuthenticated || !isAdmin) {
      console.log('Skipping stats fetch - not authenticated or not admin')
      setIsStatsLoading(false)
      return
    }

    setIsStatsLoading(true)
    setStatsError(null)
    
    try {
      console.log('Fetching admin stats...')
      
      const response = await fetch('/api/admin/stats', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch stats`)
      }
      
      const data = await response.json()
      
      if (data.success && data.stats) {
        console.log('Stats loaded successfully:', data.stats)
        setStats(data.stats)
      } else {
        throw new Error(data.error || 'Invalid stats response')
      }
    } catch (error: any) {
      console.error('Error fetching stats:', error)
      setStatsError(error.message || 'Failed to load dashboard stats')
      
      // Set default stats on error
      setStats({
        totalUsers: 0,
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        monthlyGrowth: 0,
        activeUsers: 0,
      })
    } finally {
      setIsStatsLoading(false)
    }
  }, [isAuthenticated, isAdmin])
  
  // Fetch stats when component mounts and user is ready
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      console.log('User is authenticated admin, fetching stats')
      fetchStats()
    }
  }, [isAuthenticated, isAdmin, fetchStats])

  // Import admin status checker for emergency use
  useEffect(() => {
    // Make admin status checker available in console for emergency recovery
    console.log('🔧 Admin Status Checker loaded. Emergency functions available:')
    console.log('- window.checkAdminStatus() - Check current admin status')
    console.log('- window.getAllAdmins() - List all admin users')
    console.log('- window.emergencyAdminRecovery("your-email@domain.com") - Emergency admin recovery')
    console.log('- window.debugDatabase() - Debug database connection')
  }, [])

  // Event-driven stats refresh - only when data changes
  const refreshStatsOnChange = useCallback(() => {
    console.log('Data changed - refreshing stats...')
    fetchStats()
  }, [fetchStats])
  
  // Expose stats refresh function globally for child components
  useEffect(() => {
    // Make stats refresh available to child components
    window.refreshAdminStats = refreshStatsOnChange
    
    return () => {
      delete window.refreshAdminStats
    }
  }, [refreshStatsOnChange])
  
  return (
    <AdminPageWrapper>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your marketplace efficiently</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Users"
              value={stats.totalUsers}
              subtitle={`${stats.activeUsers} active this month`}
              icon={Users}
              loading={isStatsLoading}
              error={statsError}
            />
            
            <StatsCard
              title="Total Products"
              value={stats.totalProducts}
              subtitle="Across all categories"
              icon={Package}
              loading={isStatsLoading}
              error={statsError}
            />
            
            <StatsCard
              title="Total Orders"
              value={stats.totalOrders}
              subtitle="All time orders"
              icon={ShoppingCart}
              loading={isStatsLoading}
              error={statsError}
            />
            
            <StatsCard
              title="Revenue"
              value={`${stats.totalRevenue.toLocaleString()}`}
              subtitle={
                <span className="flex items-center">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  {stats.monthlyGrowth >= 0 ? '+' : ''}{stats.monthlyGrowth}% from last month
                </span>
              }
              icon={DollarSign}
              loading={isStatsLoading}
              error={statsError}
            />
          </div>

          {/* Management Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="deals">Deals</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="chat">
                <MessageCircle className="h-4 w-4 mr-2" />
                Support Chat
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="m-0">
              <UserManagement />
            </TabsContent>

            <TabsContent value="products" className="m-0">
              <ProductManagement />
            </TabsContent>

            <TabsContent value="categories" className="m-0">
              <CategoryManagement />
            </TabsContent>

            <TabsContent value="deals" className="m-0">
              <DealManagement />
            </TabsContent>

            <TabsContent value="orders" className="m-0">
              <OrderManagement />
            </TabsContent>

            <TabsContent value="chat" className="m-0">
              {/* Pass user data directly to ChatManagement */}
              <ChatManagement user={user} isAdmin={isAdmin} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminPageWrapper>
  )
}

// Optimized StatsCard component
interface StatsCardProps {
  title: string
  value: string | number
  subtitle: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  loading: boolean
  error: string | null
}

function StatsCard({ title, value, subtitle, icon: Icon, loading, error }: StatsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-500">Error</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

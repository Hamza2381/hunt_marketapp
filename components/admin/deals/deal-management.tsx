"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, Eye, Calendar, Package, Clock, Zap, Flame } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DealForm } from "./deal-form"

interface Deal {
  id: number
  title: string
  description: string
  deal_type: string
  discount_type: string
  discount_value: number
  min_purchase_amount: number
  max_discount_amount?: number
  start_date: string
  end_date: string
  usage_limit?: number
  usage_count: number
  status: string
  is_featured: boolean
  banner_text?: string
  created_at: string
  updated_at: string
  deal_products?: Array<{
    product_id: number
    products: {
      name: string
      sku: string
      price: number
      image_url: string
    }
  }>
}

export function DealManagement() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDealForm, setShowDealForm] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const { toast } = useToast()

  const fetchDeals = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      let url = '/api/admin/deals?limit=50'
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`
      }
      if (typeFilter !== 'all') {
        url += `&deal_type=${typeFilter}`
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch deals: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch deals')
      }
      
      setDeals(result.data)
    } catch (error: any) {
      console.error('Error fetching deals:', error)
      setError(error.message)
      setDeals([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDeals()
  }, [statusFilter, typeFilter])

  const handleDeleteDeal = async (dealId: number) => {
    if (!confirm('Are you sure you want to delete this deal? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/deals/${dealId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to delete deal: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete deal')
      }

      toast({
        title: "Deal deleted",
        description: "The deal has been successfully deleted.",
      })

      // Refresh deals list
      fetchDeals()

    } catch (error: any) {
      console.error('Error deleting deal:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete deal",
        variant: "destructive",
      })
    }
  }

  const handleToggleFeatured = async (deal: Deal) => {
    try {
      const response = await fetch(`/api/admin/deals/${deal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...deal,
          is_featured: !deal.is_featured
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to update deal: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to update deal')
      }

      toast({
        title: "Deal updated",
        description: `Deal ${deal.is_featured ? 'removed from' : 'added to'} featured deals.`,
      })

      // Refresh deals list
      fetchDeals()

    } catch (error: any) {
      console.error('Error updating deal:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update deal",
        variant: "destructive",
      })
    }
  }

  const getDealTypeIcon = (dealType: string) => {
    switch (dealType) {
      case "flash":
        return <Zap className="h-4 w-4" />
      case "daily":
        return <Clock className="h-4 w-4" />
      case "weekly":
        return <Flame className="h-4 w-4" />
      case "clearance":
        return <Package className="h-4 w-4" />
      default:
        return null
    }
  }

  const getDealTypeColor = (dealType: string) => {
    switch (dealType) {
      case "flash":
        return "bg-red-100 text-red-800"
      case "daily":
        return "bg-orange-100 text-orange-800"
      case "weekly":
        return "bg-purple-100 text-purple-800"
      case "clearance":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-blue-100 text-blue-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "inactive":
        return "bg-gray-100 text-gray-800"
      case "expired":
        return "bg-red-100 text-red-800"
      default:
        return "bg-blue-100 text-blue-800"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isExpired = (endDate: string) => {
    return new Date(endDate) < new Date()
  }

  const isActive = (startDate: string, endDate: string) => {
    const now = new Date()
    return new Date(startDate) <= now && new Date(endDate) >= now
  }

  if (showDealForm) {
    return (
      <DealForm
        deal={editingDeal}
        onClose={() => {
          setShowDealForm(false)
          setEditingDeal(null)
        }}
        onSuccess={() => {
          setShowDealForm(false)
          setEditingDeal(null)
          fetchDeals()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Deal Management</h2>
          <p className="text-muted-foreground">
            Create and manage promotional deals for your products
          </p>
        </div>
        <Button onClick={() => setShowDealForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Deal
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deals.filter(deal => 
                deal.status === 'active' && 
                isActive(deal.start_date, deal.end_date)
              ).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Featured Deals</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deals.filter(deal => deal.is_featured).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired Deals</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deals.filter(deal => isExpired(deal.end_date)).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="flash">Flash Deals</SelectItem>
            <SelectItem value="daily">Daily Deals</SelectItem>
            <SelectItem value="weekly">Weekly Specials</SelectItem>
            <SelectItem value="clearance">Clearance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Deals Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Deals</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading deals...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">Error: {error}</div>
          ) : deals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No deals found. Create your first deal to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{deal.title}</div>
                        <div className="text-sm text-gray-500 line-clamp-1">
                          {deal.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getDealTypeColor(deal.deal_type)}>
                        <span className="flex items-center space-x-1">
                          {getDealTypeIcon(deal.deal_type)}
                          <span>{deal.deal_type}</span>
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {deal.discount_type === 'percentage' 
                            ? `${deal.discount_value}%` 
                            : `$${deal.discount_value}`
                          }
                        </div>
                        <div className="text-sm text-gray-500">
                          {deal.usage_count}/{deal.usage_limit || '∞'} used
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(deal.start_date)}</div>
                        <div className="text-gray-500">to {formatDate(deal.end_date)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(
                        isExpired(deal.end_date) ? 'expired' : 
                        isActive(deal.start_date, deal.end_date) ? 'active' : 
                        deal.status
                      )}>
                        {isExpired(deal.end_date) ? 'expired' : 
                         isActive(deal.start_date, deal.end_date) ? 'active' : 
                         deal.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={deal.is_featured ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleFeatured(deal)}
                      >
                        {deal.is_featured ? "Featured" : "Add to Featured"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {deal.deal_products?.length || 0} products
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingDeal(deal)
                            setShowDealForm(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDeal(deal.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

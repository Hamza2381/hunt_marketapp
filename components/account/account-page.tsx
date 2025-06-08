"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  User,
  Building2,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  Edit,
  Save,
  X,
  Package,
  FileText,
  Download,
  Eye,
  Search,
  Calendar,
  DollarSign,
  AlertCircle,
  LogOut,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

// Mock order data - in real app this would come from API
const mockOrders = [
  {
    id: "ORD-001",
    date: "2024-01-15",
    status: "delivered",
    total: 156.99,
    items: 3,
    paymentMethod: "Credit Line",
    invoiceStatus: "paid",
    invoiceNumber: "INV-001",
    dueDate: "2024-02-14",
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
    paymentMethod: "Credit Line",
    invoiceStatus: "pending",
    invoiceNumber: "INV-002",
    dueDate: "2024-02-19",
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
    invoiceStatus: "overdue",
    invoiceNumber: "INV-003",
    dueDate: "2024-01-22",
    items_detail: [
      { name: "Laser Printer Paper - Ream", quantity: 5, price: 15.99 },
      { name: "Color Ink Cartridge Set", quantity: 2, price: 39.99 },
      { name: "Wireless Mouse - Ergonomic Design", quantity: 1, price: 19.99 },
    ],
  },
]

export function AccountPage() {
  const { user, updateUser, logout } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [orderFilter, setOrderFilter] = useState("all")
  const [invoiceFilter, setInvoiceFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [editForm, setEditForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    company: user?.company || "",
    address: {
      street: user?.address?.street || "",
      city: user?.address?.city || "",
      state: user?.address?.state || "",
      zipCode: user?.address?.zipCode || "",
    },
  })

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Please log in to view your account</h1>
          </div>
        </div>
      </div>
    )
  }

  // Filter orders based on user email
  const userOrders = mockOrders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = orderFilter === "all" || order.status === orderFilter
    return matchesSearch && matchesFilter
  })

  // Filter invoices
  const userInvoices = mockOrders.filter((order) => {
    const matchesSearch =
      order.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = invoiceFilter === "all" || order.invoiceStatus === invoiceFilter
    return matchesSearch && matchesFilter
  })

  const handleSave = () => {
    const updatedUser = {
      ...user,
      ...editForm,
      company: user.accountType === "business" ? editForm.company : user.company,
    }

    updateUser(updatedUser)
    setIsEditing(false)

    toast({
      title: "Account Updated",
      description: "Your account information has been successfully updated.",
    })
  }

  const handleCancel = () => {
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      company: user.company || "",
      address: user.address || { street: "", city: "", state: "", zipCode: "" },
    })
    setIsEditing(false)
  }

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

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "overdue":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const availableCredit = user.creditLimit - user.creditUsed
  const creditUtilization = user.creditLimit > 0 ? (user.creditUsed / user.creditLimit) * 100 : 0

  // Calculate invoice totals
  const totalOutstanding = userInvoices
    .filter((inv) => inv.invoiceStatus !== "paid")
    .reduce((sum, inv) => sum + inv.total, 0)

  const overdueAmount = userInvoices
    .filter((inv) => inv.invoiceStatus === "overdue")
    .reduce((sum, inv) => sum + inv.total, 0)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Account</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and view order history</p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="credit">Credit Line</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" onClick={() => {
            logout()
            toast({
              title: "Logged out",
              description: "You have been successfully logged out.",
            })
            router.push('/login')
          }}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    {user.accountType === "business" ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    <span>Profile Information</span>
                  </CardTitle>
                  <div className="flex space-x-2">
                    {isEditing ? (
                      <>
                        <Button size="sm" onClick={handleSave}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancel}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    {user.accountType === "business" ? (
                      <Building2 className="h-8 w-8 text-green-600" />
                    ) : (
                      <User className="h-8 w-8 text-green-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{user.name}</h3>
                    <div className="flex items-center space-x-2">
                      <Badge variant={user.accountType === "business" ? "default" : "secondary"}>
                        {user.accountType === "business" ? "Business Account" : "Personal Account"}
                      </Badge>
                      {user.isAdmin && <Badge variant="destructive">Admin</Badge>}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      {isEditing ? (
                        <Input
                          id="name"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      ) : (
                        <div className="flex items-center space-x-2 mt-1">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{user.name}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      {isEditing ? (
                        <Input
                          id="email"
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        />
                      ) : (
                        <div className="flex items-center space-x-2 mt-1">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span>{user.email}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      {isEditing ? (
                        <Input
                          id="phone"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        />
                      ) : (
                        <div className="flex items-center space-x-2 mt-1">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{user.phone || "Not provided"}</span>
                        </div>
                      )}
                    </div>

                    {user.accountType === "business" && (
                      <div>
                        <Label htmlFor="company">Company</Label>
                        {isEditing ? (
                          <Input
                            id="company"
                            value={editForm.company}
                            onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                          />
                        ) : (
                          <div className="flex items-center space-x-2 mt-1">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span>{user.company || "Not provided"}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Address</Label>
                      {isEditing ? (
                        <div className="space-y-2 mt-1">
                          <Input
                            placeholder="Street Address"
                            value={editForm.address.street}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                address: { ...editForm.address, street: e.target.value },
                              })
                            }
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="City"
                              value={editForm.address.city}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  address: { ...editForm.address, city: e.target.value },
                                })
                              }
                            />
                            <Input
                              placeholder="State"
                              value={editForm.address.state}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  address: { ...editForm.address, state: e.target.value },
                                })
                              }
                            />
                          </div>
                          <Input
                            placeholder="ZIP Code"
                            value={editForm.address.zipCode}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                address: { ...editForm.address, zipCode: e.target.value },
                              })
                            }
                          />
                        </div>
                      ) : (
                        <div className="flex items-start space-x-2 mt-1">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                          <div>
                            {user.address ? (
                              <>
                                <div>{user.address.street}</div>
                                <div>
                                  {user.address.city}, {user.address.state} {user.address.zipCode}
                                </div>
                              </>
                            ) : (
                              <span className="text-gray-500">No address provided</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Order History</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex items-center space-x-2 flex-1">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search orders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={orderFilter} onValueChange={setOrderFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Orders</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                        </TableCell>
                        <TableCell>{order.items} items</TableCell>
                        <TableCell className="font-medium">${order.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {userOrders.length === 0 && (
                  <div className="text-center py-8">
                    <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                    <p className="text-gray-600">You haven't placed any orders yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Invoices & Payments</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Invoice Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">${totalOutstanding.toFixed(2)}</div>
                        <div className="text-sm text-gray-600">Total Outstanding</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">${overdueAmount.toFixed(2)}</div>
                        <div className="text-sm text-gray-600">Overdue Amount</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {userInvoices.filter((inv) => inv.invoiceStatus === "paid").length}
                        </div>
                        <div className="text-sm text-gray-600">Paid Invoices</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {overdueAmount > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <h4 className="font-medium text-red-900">Overdue Payment Alert</h4>
                        <p className="text-sm text-red-700">
                          You have ${overdueAmount.toFixed(2)} in overdue invoices. Please make payment to avoid service
                          interruption.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex items-center space-x-2 flex-1">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search invoices..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Invoices</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userInvoices.map((invoice) => (
                      <TableRow key={invoice.invoiceNumber}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.id}</TableCell>
                        <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">${invoice.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={getInvoiceStatusColor(invoice.invoiceStatus)}>
                            {invoice.invoiceStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4" />
                            </Button>
                            {invoice.invoiceStatus !== "paid" && (
                              <Button size="sm">
                                <DollarSign className="h-4 w-4 mr-1" />
                                Pay
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {userInvoices.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
                    <p className="text-gray-600">You don't have any invoices yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Credit Line Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user.creditLimit > 0 ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              ${user.creditLimit.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600">Credit Limit</div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">${user.creditUsed.toLocaleString()}</div>
                            <div className="text-sm text-gray-600">Credit Used</div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">${availableCredit.toLocaleString()}</div>
                            <div className="text-sm text-gray-600">Available Credit</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Credit Utilization</span>
                        <span className="text-sm text-gray-600">{creditUtilization.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${
                            creditUtilization > 80
                              ? "bg-red-500"
                              : creditUtilization > 60
                                ? "bg-yellow-500"
                                : "bg-green-500"
                          }`}
                          style={{ width: `${Math.min(creditUtilization, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {creditUtilization > 80 && "High utilization - consider paying down balance"}
                        {creditUtilization <= 80 && creditUtilization > 60 && "Moderate utilization"}
                        {creditUtilization <= 60 && "Good utilization"}
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Credit Line Benefits</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Net 30 payment terms</li>
                        <li>• No interest on purchases when paid on time</li>
                        <li>• Detailed monthly statements</li>
                        <li>• Online account management</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Credit Line</h3>
                    <p className="text-gray-600 mb-6">
                      You don't currently have a credit line set up. Contact our sales team to apply for business
                      credit.
                    </p>
                    <Button>Apply for Credit</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">Change Password</h4>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input id="current-password" type="password" />
                    </div>
                    <div>
                      <Label htmlFor="new-password">New Password</Label>
                      <Input id="new-password" type="password" />
                    </div>
                    <div>
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input id="confirm-password" type="password" />
                    </div>
                    <Button>Update Password</Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-4">Two-Factor Authentication</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                    </div>
                    <Button variant="outline">Enable 2FA</Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-4">Login Sessions</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Current Session</div>
                        <div className="text-sm text-gray-600">Chrome on Windows • Active now</div>
                      </div>
                      <Badge variant="outline">Current</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

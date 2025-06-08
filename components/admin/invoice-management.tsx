"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, FileText, Download, Eye, DollarSign, Send, AlertCircle, Calendar, Plus, Mail } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Mock invoice data - in real app this would come from API
const mockInvoices = [
  {
    id: "INV-001",
    orderId: "ORD-001",
    customer: "John Doe",
    customerEmail: "john@company.com",
    accountType: "business",
    company: "Acme Corp",
    amount: 156.99,
    status: "paid",
    issueDate: "2024-01-15",
    dueDate: "2024-02-14",
    paidDate: "2024-02-10",
    paymentMethod: "Credit Line",
    items: [
      { name: "Premium Copy Paper - 500 Sheets", quantity: 3, price: 12.99 },
      { name: "Black Ink Cartridge - HP Compatible", quantity: 2, price: 24.99 },
      { name: "Sticky Notes - Assorted Colors", quantity: 3, price: 8.99 },
    ],
  },
  {
    id: "INV-002",
    orderId: "ORD-002",
    customer: "Jane Smith",
    customerEmail: "jane@personal.com",
    accountType: "personal",
    company: null,
    amount: 89.99,
    status: "pending",
    issueDate: "2024-01-20",
    dueDate: "2024-02-19",
    paidDate: null,
    paymentMethod: "Credit Line",
    items: [
      { name: "Coffee K-Cups - Variety Pack", quantity: 1, price: 32.99 },
      { name: "All-Purpose Cleaner - 32oz", quantity: 2, price: 6.99 },
    ],
  },
  {
    id: "INV-003",
    orderId: "ORD-003",
    customer: "Bob Wilson",
    customerEmail: "bob@smallbiz.com",
    accountType: "business",
    company: "Small Biz LLC",
    amount: 245.5,
    status: "overdue",
    issueDate: "2024-01-22",
    dueDate: "2024-01-22",
    paidDate: null,
    paymentMethod: "Credit Line",
    items: [
      { name: "Laser Printer Paper - Ream", quantity: 5, price: 15.99 },
      { name: "Color Ink Cartridge Set", quantity: 2, price: 39.99 },
      { name: "Wireless Mouse - Ergonomic Design", quantity: 1, price: 19.99 },
    ],
  },
  {
    id: "INV-004",
    orderId: "ORD-004",
    customer: "Alice Johnson",
    customerEmail: "alice@company.com",
    accountType: "business",
    company: "Tech Solutions Inc",
    amount: 89.99,
    status: "pending",
    issueDate: "2024-01-25",
    dueDate: "2024-02-24",
    paidDate: null,
    paymentMethod: "Credit Card",
    items: [{ name: "Wireless Keyboard", quantity: 1, price: 89.99 }],
  },
]

export function InvoiceManagement() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [accountTypeFilter, setAccountTypeFilter] = useState("all")
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false)
  const [reminderMessage, setReminderMessage] = useState("")

  const filteredInvoices = mockInvoices.filter((invoice) => {
    const matchesSearch =
      invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.company && invoice.company.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    const matchesAccountType = accountTypeFilter === "all" || invoice.accountType === accountTypeFilter

    return matchesSearch && matchesStatus && matchesAccountType
  })

  const getStatusColor = (status: string) => {
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

  const handleViewInvoice = (invoice: any) => {
    setSelectedInvoice(invoice)
    setIsViewDialogOpen(true)
  }

  const handleSendReminder = (invoice: any) => {
    setSelectedInvoice(invoice)
    setReminderMessage(`Dear ${invoice.customer},

This is a friendly reminder that invoice ${invoice.id} for $${invoice.amount.toFixed(2)} is ${invoice.status === "overdue" ? "overdue" : "due"} on ${new Date(invoice.dueDate).toLocaleDateString()}.

Please make payment at your earliest convenience to avoid any service interruption.

Thank you for your business!

Best regards,
BizMart Team`)
    setIsReminderDialogOpen(true)
  }

  const handleMarkAsPaid = (invoiceId: string) => {
    toast({
      title: "Invoice Updated",
      description: `Invoice ${invoiceId} has been marked as paid.`,
    })
  }

  const handleSendReminderEmail = () => {
    toast({
      title: "Reminder Sent",
      description: `Payment reminder sent to ${selectedInvoice?.customerEmail}`,
    })
    setIsReminderDialogOpen(false)
    setReminderMessage("")
  }

  // Calculate summary statistics
  const totalOutstanding = filteredInvoices
    .filter((inv) => inv.status !== "paid")
    .reduce((sum, inv) => sum + inv.amount, 0)

  const overdueAmount = filteredInvoices
    .filter((inv) => inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.amount, 0)

  const totalPaid = filteredInvoices.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + inv.amount, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Invoice Management</CardTitle>
            <CardDescription>Manage customer invoices and payments</CardDescription>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">${totalOutstanding.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Outstanding</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">${overdueAmount.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Overdue</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Paid This Month</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{filteredInvoices.length}</div>
                <div className="text-sm text-gray-600">Total Invoices</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center space-x-2 flex-1">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Account Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Invoices Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-mono font-medium">{invoice.id}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{invoice.customer}</div>
                    <div className="text-sm text-gray-500">{invoice.customerEmail}</div>
                    {invoice.company && <div className="text-sm text-gray-500">{invoice.company}</div>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={invoice.accountType === "business" ? "default" : "secondary"}>
                    {invoice.accountType}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">${invoice.amount.toFixed(2)}</TableCell>
                <TableCell>{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
                    {invoice.status === "overdue" && <AlertCircle className="h-4 w-4 text-red-500" />}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleViewInvoice(invoice)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4" />
                    </Button>
                    {invoice.status !== "paid" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleSendReminder(invoice)}>
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={() => handleMarkAsPaid(invoice.id)}>
                          <DollarSign className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-8">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-600">No invoices match your current filters.</p>
          </div>
        )}

        {/* View Invoice Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invoice Details - {selectedInvoice?.id}</DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-6">
                {/* Invoice Header */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Bill To:</h4>
                    <div className="text-sm">
                      <div className="font-medium">{selectedInvoice.customer}</div>
                      <div>{selectedInvoice.customerEmail}</div>
                      {selectedInvoice.company && <div>{selectedInvoice.company}</div>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Invoice Info:</h4>
                    <div className="text-sm space-y-1">
                      <div>Issue Date: {new Date(selectedInvoice.issueDate).toLocaleDateString()}</div>
                      <div>Due Date: {new Date(selectedInvoice.dueDate).toLocaleDateString()}</div>
                      <div>Order: {selectedInvoice.orderId}</div>
                      <div>
                        Status:{" "}
                        <Badge className={getStatusColor(selectedInvoice.status)}>{selectedInvoice.status}</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invoice Items */}
                <div>
                  <h4 className="font-medium mb-3">Items:</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>${item.price.toFixed(2)}</TableCell>
                          <TableCell>${(item.quantity * item.price).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Invoice Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Total Amount:</span>
                    <span className="text-2xl font-bold">${selectedInvoice.amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Send Reminder Dialog */}
        <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Send Payment Reminder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="recipient">To:</Label>
                <Input id="recipient" value={selectedInvoice?.customerEmail} disabled />
              </div>
              <div>
                <Label htmlFor="subject">Subject:</Label>
                <Input id="subject" value={`Payment Reminder - Invoice ${selectedInvoice?.id}`} disabled />
              </div>
              <div>
                <Label htmlFor="message">Message:</Label>
                <Textarea
                  id="message"
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  rows={8}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleSendReminderEmail}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reminder
                </Button>
                <Button variant="outline" onClick={() => setIsReminderDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

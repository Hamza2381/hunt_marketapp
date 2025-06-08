"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Edit, Plus, Trash2, CreditCard, Building2, UserIcon, Key, Copy, Mail } from "lucide-react"
import { useAuth, type User as UserType } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

export function UserManagement() {
  const { user, getAllUsers, updateUserById, createUser, deleteUser, resetUserPassword } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserType[]>([])
  
  useEffect(() => {
    const fetchUsers = async () => {
      if (getAllUsers) {
        const usersList = await getAllUsers()
        setUsers(usersList || [])
      }
    }
    
    fetchUsers()
  }, [])
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [generatedPassword, setGeneratedPassword] = useState("")

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    accountType: "personal" as "business" | "personal",
    company: "",
    phone: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
    },
  })

  const [creditForm, setCreditForm] = useState({
    creditLimit: 0,
    creditUsed: 0,
  })

  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    accountType: "personal" as "business" | "personal",
    company: "",
    phone: "",
    creditLimit: 0,
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
    },
  })

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.company && user.company.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesFilter =
      filterType === "all" ||
      (filterType === "business" && user.accountType === "business") ||
      (filterType === "personal" && user.accountType === "personal") ||
      (filterType === "admin" && user.isAdmin) ||
      (filterType === "temp-password" && user.temporaryPassword)

    return matchesSearch && matchesFilter
  })

  const handleEditUser = (user: UserType) => {
    setSelectedUser(user)
    setEditForm({
      name: user.name,
      email: user.email,
      accountType: user.accountType,
      company: user.company || "",
      phone: user.phone || "",
      address: user.address || { street: "", city: "", state: "", zipCode: "" },
    })
    setIsEditDialogOpen(true)
  }

  const handleEditCredit = (user: UserType) => {
    setSelectedUser(user)
    setCreditForm({
      creditLimit: user.creditLimit,
      creditUsed: user.creditUsed,
    })
    setIsCreditDialogOpen(true)
  }

  const handleResetPassword = async (user: UserType) => {
    setSelectedUser(user)
    const tempPassword = await resetUserPassword(user.id)

    if (tempPassword) {
      setGeneratedPassword(tempPassword)
      setIsPasswordDialogOpen(true)
      
      if (getAllUsers) {
        const usersList = await getAllUsers()
        setUsers(usersList || [])
      }

      toast({
        title: "Password Reset",
        description: `Temporary password generated for ${user.name}`,
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive",
      })
    }
  }

  const handleSaveUser = async () => {
    if (!selectedUser) return

    const result = await updateUserById(selectedUser.id, {
      ...editForm,
      company: editForm.accountType === "business" ? editForm.company : undefined,
    })

    if (result?.success) {
      if (getAllUsers) {
        const usersList = await getAllUsers()
        setUsers(usersList || [])
      }
      setIsEditDialogOpen(false)
      toast({
        title: "User Updated",
        description: "User information has been successfully updated.",
      })
    }
  }

  const handleSaveCredit = async () => {
    if (!selectedUser) return

    const result = await updateUserById(selectedUser.id, creditForm)

    if (result?.success) {
      if (getAllUsers) {
        const usersList = await getAllUsers()
        setUsers(usersList || [])
      }
      setIsCreditDialogOpen(false)
      toast({
        title: "Credit Updated",
        description: "Credit limit has been successfully updated.",
      })
    }
  }

  const handleCreateUser = async () => {
    try {
      const result = await createUser({
        ...createForm,
        isAdmin: false,
        creditUsed: 0,
        company: createForm.accountType === "business" ? createForm.company : undefined,
        temporaryPassword: true,
        mustChangePassword: true,
      })

      if (result?.success && getAllUsers) {
        const usersList = await getAllUsers()
        setUsers(usersList || [])
      }
      
      setIsCreateDialogOpen(false)
      setCreateForm({
        name: "",
        email: "",
        accountType: "personal",
        company: "",
        phone: "",
        creditLimit: 0,
        address: { street: "", city: "", state: "", zipCode: "" },
      })

      // Show the generated password
      if (result?.user) {
        setSelectedUser(result.user)
        setGeneratedPassword(result.password || "")
        setIsPasswordDialogOpen(true)

        toast({
          title: "User Created",
          description: "New user has been created with a temporary password.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      const success = await deleteUser(userId)
      if (success && getAllUsers) {
        const usersList = await getAllUsers()
        setUsers(usersList || [])
        toast({
          title: "User Deleted",
          description: "User has been successfully deleted.",
        })
      }
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Password copied to clipboard",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Management</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create User Account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New User Account</DialogTitle>
              <p className="text-sm text-gray-600">A temporary password will be generated for the new user</p>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="create-name">Full Name</Label>
                  <Input
                    id="create-name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="create-email">Email Address</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="create-account-type">Account Type</Label>
                  <Select
                    value={createForm.accountType}
                    onValueChange={(value: "business" | "personal") =>
                      setCreateForm({ ...createForm, accountType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal Account</SelectItem>
                      <SelectItem value="business">Business Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="create-phone">Phone Number</Label>
                  <Input
                    id="create-phone"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  />
                </div>
              </div>

              {createForm.accountType === "business" && (
                <div>
                  <Label htmlFor="create-company">Company Name</Label>
                  <Input
                    id="create-company"
                    value={createForm.company}
                    onChange={(e) => setCreateForm({ ...createForm, company: e.target.value })}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="create-credit">Initial Credit Limit ($)</Label>
                <Input
                  id="create-credit"
                  type="number"
                  value={createForm.creditLimit}
                  onChange={(e) => setCreateForm({ ...createForm, creditLimit: Number(e.target.value) })}
                />
              </div>

              <div>
                <Label>Address Information</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Input
                    placeholder="Street Address"
                    value={createForm.address.street}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        address: { ...createForm.address, street: e.target.value },
                      })
                    }
                  />
                  <Input
                    placeholder="City"
                    value={createForm.address.city}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        address: { ...createForm.address, city: e.target.value },
                      })
                    }
                  />
                  <Input
                    placeholder="State"
                    value={createForm.address.state}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        address: { ...createForm.address, state: e.target.value },
                      })
                    }
                  />
                  <Input
                    placeholder="ZIP Code"
                    value={createForm.address.zipCode}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        address: { ...createForm.address, zipCode: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> A temporary password will be automatically generated for this user. They will
                  be required to change it on their first login.
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUser}>Create Account</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <Input placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="business">Business Accounts</SelectItem>
                <SelectItem value="personal">Personal Accounts</SelectItem>
                <SelectItem value="admin">Administrators</SelectItem>
                <SelectItem value="temp-password">Temporary Passwords</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-100 rounded-full">
                    {user.accountType === "business" ? (
                      <Building2 className="h-6 w-6" />
                    ) : (
                      <UserIcon className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{user.name}</h3>
                      <Badge variant={user.accountType === "business" ? "default" : "secondary"}>
                        {user.accountType}
                      </Badge>
                      {user.isAdmin && <Badge variant="destructive">Admin</Badge>}
                      {user.temporaryPassword && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          Temp Password
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    {user.company && <p className="text-sm text-gray-600">{user.company}</p>}
                    {user.phone && <p className="text-sm text-gray-600">{user.phone}</p>}
                    {user.creditLimit > 0 && (
                      <div className="mt-2">
                        <div className="text-sm text-gray-600">
                          Credit: ${user.creditUsed.toLocaleString()} / ${user.creditLimit.toLocaleString()}
                        </div>
                        <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${(user.creditUsed / user.creditLimit) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {user.lastLogin && (
                      <p className="text-xs text-gray-500 mt-1">
                        Last login: {new Date(user.lastLogin).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEditCredit(user)}>
                    <CreditCard className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleResetPassword(user)}>
                    <Key className="h-4 w-4" />
                  </Button>
                  {!user.isAdmin && (
                    <Button variant="outline" size="sm" onClick={() => handleDeleteUser(user.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-account-type">Account Type</Label>
                <Select
                  value={editForm.accountType}
                  onValueChange={(value: "business" | "personal") => setEditForm({ ...editForm, accountType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
            </div>

            {editForm.accountType === "business" && (
              <div>
                <Label htmlFor="edit-company">Company</Label>
                <Input
                  id="edit-company"
                  value={editForm.company}
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                />
              </div>
            )}

            <div>
              <Label>Address</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Input
                  placeholder="Street"
                  value={editForm.address.street}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      address: { ...editForm.address, street: e.target.value },
                    })
                  }
                />
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
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveUser}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Credit Dialog */}
      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Credit Line</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="credit-limit">Credit Limit</Label>
              <Input
                id="credit-limit"
                type="number"
                value={creditForm.creditLimit}
                onChange={(e) => setCreditForm({ ...creditForm, creditLimit: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="credit-used">Credit Used</Label>
              <Input
                id="credit-used"
                type="number"
                value={creditForm.creditUsed}
                onChange={(e) => setCreditForm({ ...creditForm, creditUsed: Number(e.target.value) })}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCredit}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary Password Generated</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-800 mb-2">
                A temporary password has been generated for <strong>{selectedUser?.name}</strong>
              </p>
              <div className="flex items-center space-x-2 bg-white p-2 rounded border">
                <code className="flex-1 font-mono text-lg">{generatedPassword}</code>
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedPassword)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Important:</strong> Please share this password securely with the user. They will be required to
                change it on their first login.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setIsPasswordDialogOpen(false)}>
                <Mail className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

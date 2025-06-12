"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Edit, Plus, Trash2, CreditCard, Building2, UserIcon, Key, Copy, Mail, Search, RefreshCw, CheckCircle } from "lucide-react"
import { useAuth, type User as UserType } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

export function UserManagement() {
  const { user, getAllUsers, updateUserById, createUser, deleteUser, resetUserPassword } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Render credit information with proper formatting
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  
  // Calculate progress bar width for credit usage
  const getCreditUsagePercentage = (used: number, limit: number) => {
    if (limit <= 0) return 0;
    const percentage = (used / limit) * 100;
    return Math.min(percentage, 100); // Cap at 100%
  };
  
  // Function to refresh users data
  const refreshUsers = async () => {
    setIsLoading(true)
    try {
      if (getAllUsers) {
        console.log("Refreshing user list...");
        const usersList = await getAllUsers();
        console.log("Received updated user list:", usersList?.length);
        setUsers(usersList || [])
      }
    } catch (error) {
      console.error('Error refreshing users:', error)
      toast({
        title: 'Error',
        description: 'Failed to refresh user data.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  useEffect(() => {
    refreshUsers()
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
      creditLimit: user.creditLimit || 0,
      creditUsed: user.creditUsed || 0,
    })
    setIsCreditDialogOpen(true)
  }

  const handleResetPassword = async (user: UserType) => {
    try {
      setSelectedUser(user)
      console.log("Resetting password for user:", user.id);
      const tempPassword = await resetUserPassword(user.id)

      if (tempPassword) {
        console.log("Password reset successful");
        setGeneratedPassword(tempPassword)
        setIsPasswordDialogOpen(true)
        
        await refreshUsers();

        toast({
          title: "Password Reset",
          description: `Temporary password generated for ${user.name}`,
        })
      } else {
        console.error("Failed to reset password");
        toast({
          title: "Error",
          description: "Failed to reset password",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error in handleResetPassword:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while resetting the password.",
        variant: "destructive",
      })
    }
  }

  const handleSaveUser = async () => {
    if (!selectedUser) return

    try {
      console.log("Updating user:", selectedUser.id);
      // Prepare the update payload, ensuring all fields are properly formatted
      const updatePayload = {
        ...editForm,
        company: editForm.accountType === "business" ? editForm.company : null, // Use null to clear field when not business
      };
      
      console.log("Update payload:", updatePayload);
      const result = await updateUserById(selectedUser.id, updatePayload);

      if (result?.success) {
        console.log("User updated successfully, refreshing user list");
        await refreshUsers();
        
        setIsEditDialogOpen(false)
        toast({
          title: "User Updated",
          description: "User information has been successfully updated.",
        })
      } else {
        console.error("Failed to update user:", result?.error);
        toast({
          title: "Error",
          description: `Failed to update user: ${result?.error || "Unknown error"}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error in handleSaveUser:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating the user.",
        variant: "destructive",
      })
    }
  }

  const handleSaveCredit = async () => {
    if (!selectedUser) return

    try {
      console.log("Updating credit for user:", selectedUser.id);
      console.log("Current credit form values:", creditForm);
      
      // Force convert to numbers with 2 decimal places
      let creditLimitValue = parseFloat(Number(creditForm.creditLimit).toFixed(2));
      let creditUsedValue = parseFloat(Number(creditForm.creditUsed).toFixed(2));
      
      console.log("Parsed credit values:", { creditLimitValue, creditUsedValue });
      
      // Validate credit values
      if (isNaN(creditLimitValue) || isNaN(creditUsedValue)) {
        toast({
          title: "Validation Error",
          description: "Credit values must be valid numbers",
          variant: "destructive",
        });
        return;
      }
      
      // Create a specific update object just for credit fields
      const creditUpdates = {
        creditLimit: creditLimitValue, 
        creditUsed: creditUsedValue
      };
      
      console.log("Sending credit updates to server:", creditUpdates);
      
      // Send validated values to the update function
      const result = await updateUserById(selectedUser.id, creditUpdates);
      console.log("Update result:", result);

      if (result?.success) {
        // Update the UI immediately without waiting for refresh
        const updatedUser = {
          ...selectedUser,
          creditLimit: creditLimitValue,
          creditUsed: creditUsedValue,
          availableCredit: creditLimitValue - creditUsedValue
        };
        
        // Update selected user
        setSelectedUser(updatedUser);
        
        // Update the user in the users array
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === selectedUser.id ? updatedUser : user
          )
        );
        
        console.log("Credit updated successfully, updating UI");
        setIsCreditDialogOpen(false);
        
        // Also refresh from server to ensure data consistency
        refreshUsers();
        
        toast({
          title: "Credit Updated",
          description: "Credit limit has been successfully updated.",
        });
      } else {
        console.error("Failed to update credit:", result?.error);
        toast({
          title: "Error",
          description: `Failed to update credit: ${result?.error || "Unknown error"}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleSaveCredit:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating the credit.",
        variant: "destructive",
      });
    }
  }

  const handleCreateUser = async () => {
    try {
      console.log("Creating new user:", createForm.email);
      console.log("Create form data:", createForm);
      
      const result = await createUser({
        ...createForm,
        isAdmin: false,
        creditUsed: 0,
        company: createForm.accountType === "business" ? createForm.company : undefined,
        temporaryPassword: true,
        mustChangePassword: true,
      })

      console.log("Create user result:", result);

      if (result?.success) {
        console.log("User created successfully");
        
        // Clear the form immediately
        setCreateForm({
          name: "",
          email: "",
          accountType: "personal",
          company: "",
          phone: "",
          creditLimit: 0,
          address: { street: "", city: "", state: "", zipCode: "" },
        })
        
        // Add the new user to the local state immediately (optimistic update)
        if (result.user) {
          const newUser = {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            accountType: result.user.accountType,
            isAdmin: result.user.isAdmin,
            creditLimit: result.user.creditLimit,
            creditUsed: result.user.creditUsed,
            company: result.user.company,
            phone: result.user.phone,
            address: result.user.address,
            temporaryPassword: result.user.temporaryPassword,
            createdAt: new Date().toISOString()
          };
          
          // Add to users array immediately
          setUsers(prevUsers => [newUser, ...prevUsers]);
          
          // Set for password dialog
          setSelectedUser(newUser);
          setGeneratedPassword(result.password || "");
        }
        
        // Close dialog and show password
        setIsCreateDialogOpen(false);
        setIsPasswordDialogOpen(true);

        toast({
          title: "User Created",
          description: "New user has been created with a temporary password.",
        })
        
        // Refresh users list in background to ensure consistency
        refreshUsers();
      } else {
        console.error("Failed to create user:", result?.error);
        toast({
          title: "Error",
          description: `Failed to create user: ${result?.error || "Unknown error"}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error in handleCreateUser:", error);
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        console.log("Attempting to delete user:", userId);
        const success = await deleteUser(userId);
        
        if (success) {
          console.log("Delete successful, refreshing user list");
          await refreshUsers();
          toast({
            title: "User Deleted",
            description: "User has been successfully deleted.",
          });
        } else {
          console.error("Failed to delete user");
          toast({
            title: "Error",
            description: "Failed to delete user. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error in handleDeleteUser:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred while deleting the user.",
          variant: "destructive",
        });
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
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage user accounts and credit limits</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add User
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
                  be required to change it on their first login. The system will automatically handle any email conflicts.
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
      </CardHeader>

      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users by name, email, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
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
          <Button variant="outline" onClick={refreshUsers}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

      {/* Users List */}
      {isLoading && users.length === 0 ? (
        <div className="py-10 text-center">
          <RefreshCw className="h-8 w-8 mx-auto animate-spin text-gray-400" />
          <p className="mt-4 text-gray-500">Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-gray-500">No users found{searchTerm ? ` matching "${searchTerm}"` : "."}.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Account Type</TableHead>
                <TableHead>Credit Limit</TableHead>
                <TableHead>Credit Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="bg-gray-100 p-2 rounded-full">
                        {user.accountType === "business" ? (
                          <Building2 className="h-4 w-4" />
                        ) : (
                          <UserIcon className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.accountType === "business" ? "default" : "secondary"}>
                      {user.accountType === "business" ? (
                        <>
                          <Building2 className="h-3 w-3 mr-1" />
                          Business
                        </>
                      ) : (
                        <>
                          <UserIcon className="h-3 w-3 mr-1" />
                          Personal
                        </>
                      )}
                    </Badge>
                    {user.company && (
                      <div className="text-xs text-gray-500 mt-1">{user.company}</div>
                    )}
                    {user.isAdmin && <Badge variant="destructive" className="mt-1">Admin</Badge>}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(user.creditLimit)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(user.creditUsed)}
                    {user.creditLimit > 0 && (
                      <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${getCreditUsagePercentage(user.creditUsed, user.creditLimit)}%` }}
                        />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.temporaryPassword ? (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        <Key className="h-3 w-3 mr-1" />
                        Temp Password
                      </Badge>
                    ) : (
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                    {user.lastLogin && (
                      <div className="text-xs text-gray-500 mt-1">
                        Last login: {new Date(user.lastLogin).toLocaleDateString()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditUser(user)} title="Edit user">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEditCredit(user)} title="Edit credit">
                        <CreditCard className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleResetPassword(user)} title="Reset password">
                        <Key className="h-4 w-4" />
                      </Button>
                      {!user.isAdmin && (
                        <Button variant="outline" size="sm" onClick={() => handleDeleteUser(user.id)} title="Delete user">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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
            <DialogTitle>Edit Credit Line for {selectedUser?.name}</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">Current credit balance: {selectedUser ? formatCurrency(selectedUser.creditLimit - selectedUser.creditUsed) : '$0.00'}</p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="credit-limit">Credit Limit ($)</Label>
              <Input
                id="credit-limit"
                type="number"
                min="0"
                step="100"
                value={creditForm.creditLimit}
                onChange={(e) => setCreditForm({ ...creditForm, creditLimit: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="credit-used">Credit Used ($)</Label>
              <Input
                id="credit-used"
                type="number"
                min="0"
                step="0.01"
                value={creditForm.creditUsed}
                onChange={(e) => setCreditForm({ ...creditForm, creditUsed: Number(e.target.value) })}
              />
            </div>
            <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800 mb-2">
              <p><strong>Important:</strong> Changes to credit will be saved to the database immediately.</p>
              <p className="mt-1">Debug info: Credit limit is stored as a decimal number in the database.</p>
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
    </CardContent>
  </Card>
  )
}

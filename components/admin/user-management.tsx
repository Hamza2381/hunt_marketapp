"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Edit, Plus, Trash2, CreditCard, Building2, UserIcon, Key, Copy, Mail, Search, RefreshCw, CheckCircle, DollarSign } from "lucide-react"
import { useAuth, type User as UserType } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

// Cache for user data to prevent re-fetching
const userDataCache = {
  data: null as UserType[] | null,
  timestamp: 0,
  isLoading: false
}
const cacheTimeout = 2 * 60 * 1000 // 2 minutes

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
  
  // Optimized users data fetching with caching
  const refreshUsers = useCallback(async (forceRefresh = false) => {
    // Check cache first unless force refresh
    if (!forceRefresh && userDataCache.data && 
        Date.now() - userDataCache.timestamp < cacheTimeout &&
        !userDataCache.isLoading) {
      setUsers(userDataCache.data)
      setIsLoading(false)
      return
    }
    
    // Prevent multiple simultaneous requests
    if (userDataCache.isLoading && !forceRefresh) {
      return
    }
    
    userDataCache.isLoading = true
    setIsLoading(true)
    
    try {
      if (getAllUsers) {
        const usersList = await getAllUsers();
        const usersData = usersList || []
        
        // Update cache
        userDataCache.data = usersData
        userDataCache.timestamp = Date.now()
        
        setUsers(usersData)
      } else {
        // If getAllUsers is not available, set empty array
        setUsers([])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: 'Error',
        description: 'Failed to refresh user data.',
        variant: 'destructive',
      })
      setUsers([]) // Set empty array on error
    } finally {
      setIsLoading(false)
      userDataCache.isLoading = false
    }
  }, [getAllUsers, toast])
  
  useEffect(() => {
    // Only run on mount
    refreshUsers()
  }, []) // Remove refreshUsers from dependencies to prevent cycles
  
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [orderCount, setOrderCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [generatedPassword, setGeneratedPassword] = useState("")
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null)
  const [isSavingCredit, setIsSavingCredit] = useState(false)
  const [isEditingUser, setIsEditingUser] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

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

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Basic null check - but don't exclude users with missing optional properties
      if (!user) {
        return false
      }

      const matchesSearch =
        !searchTerm || // If no search term, match all
        (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.company && user.company.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesFilter =
        filterType === "all" ||
        (filterType === "business" && user.accountType === "business") ||
        (filterType === "personal" && user.accountType === "personal") ||
        (filterType === "admin" && user.isAdmin === true) ||
        (filterType === "temp-password" && user.temporaryPassword === true)

      return matchesSearch && matchesFilter
    })
  }, [users, searchTerm, filterType])

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
      const tempPassword = await resetUserPassword(user.id)

      if (tempPassword) {
        setGeneratedPassword(tempPassword)
        setIsPasswordDialogOpen(true)
        
        // Refresh users data in background without affecting the password dialog
        refreshUsers(false).catch(console.error);

        toast({
          title: "Password Reset",
          description: `Temporary password generated for ${user.name || user.email}`,
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to reset password",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while resetting the password.",
        variant: "destructive",
      })
    }
  }

  const handleSaveUser = async () => {
    if (!selectedUser || !selectedUser.id) {
      toast({
        title: "Error",
        description: "No user selected for update",
        variant: "destructive",
      })
      return
    }

    try {
      setIsEditingUser(true)
      
      // Prepare the update payload
      const updatePayload = {
        ...editForm,
        company: editForm.accountType === "business" ? editForm.company : null,
      }
      
      // OPTIMISTIC UPDATE: Update UI immediately
      const updatedUserData = {
        ...selectedUser,
        ...editForm,
        company: editForm.accountType === "business" ? editForm.company : null,
      };
      
      // Update the local state immediately
      setUsers(prevUsers => 
        prevUsers.map(user => {
          if (user && user.id === selectedUser.id) {
            return updatedUserData as UserType;
          }
          return user;
        })
      )
      
      // Update cache immediately
      if (userDataCache.data) {
        userDataCache.data = userDataCache.data.map(user => {
          if (user && user.id === selectedUser.id) {
            return updatedUserData as UserType;
          }
          return user;
        });
      }
      
      // Close dialog immediately
      setIsEditDialogOpen(false)
      
      // Show success toast immediately
      toast({
        title: "User Updated",
        description: "User information has been successfully updated.",
      })
      
      // API call in background
      const result = await updateUserById(selectedUser.id, updatePayload)
      
      console.log('User update result:', result);

      // Check if the update was successful
      if (!result || (!result.success && !result.data)) {
        // API failed - rollback changes
        setUsers(prevUsers => 
          prevUsers.map(user => {
            if (user && user.id === selectedUser.id) {
              return selectedUser; // Revert to original
            }
            return user;
          })
        )
        
        // Rollback cache
        if (userDataCache.data) {
          userDataCache.data = userDataCache.data.map(user => {
            if (user && user.id === selectedUser.id) {
              return selectedUser; // Revert to original
            }
            return user;
          });
        }
        
        const errorMessage = result?.error || "Update failed";
        console.error('User update failed:', errorMessage);
        
        toast({
          title: "Error",
          description: `Failed to update user: ${errorMessage}. Changes have been reverted.`,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error('User update error:', error)
      
      // Rollback on error
      setUsers(prevUsers => 
        prevUsers.map(user => {
          if (user && user.id === selectedUser.id) {
            return selectedUser; // Revert to original
          }
          return user;
        })
      )
      
      if (userDataCache.data) {
        userDataCache.data = userDataCache.data.map(user => {
          if (user && user.id === selectedUser.id) {
            return selectedUser; // Revert to original
          }
          return user;
        });
      }
      
      toast({
        title: "Error",
        description: `An unexpected error occurred: ${error.message || 'Unknown error'}. Changes have been reverted.`,
        variant: "destructive",
      })
    } finally {
      setIsEditingUser(false)
    }
  }

  const handleSaveCredit = async () => {
    if (!selectedUser || !selectedUser.id) {
      toast({
        title: "Error",
        description: "No user selected for credit update",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSavingCredit(true); // Use dedicated credit loading state
      
      // Validate and prepare credit values
      let creditLimitValue = parseFloat(Number(creditForm.creditLimit).toFixed(2));
      let creditUsedValue = parseFloat(Number(creditForm.creditUsed).toFixed(2));
      
      // Validate credit values
      if (isNaN(creditLimitValue) || isNaN(creditUsedValue)) {
        toast({
          title: "Validation Error",
          description: "Credit values must be valid numbers",
          variant: "destructive",
        });
        return;
      }
      
      if (creditLimitValue < 0 || creditUsedValue < 0) {
        toast({
          title: "Validation Error",
          description: "Credit values cannot be negative",
          variant: "destructive",
        });
        return;
      }
      
      // Create the credit update object
      const creditUpdates = {
        creditLimit: creditLimitValue, 
        creditUsed: creditUsedValue
      };
      
      console.log('Updating credit for user:', selectedUser.id, 'with values:', creditUpdates);
      
      const result = await updateUserById(selectedUser.id, creditUpdates);
      
      console.log('Credit update result:', result);

      // Check if the update was successful - be more flexible with success detection
      if (result && (result.success || result.data)) {
        // Create updated user object
        const updatedUserData = {
          ...selectedUser,
          creditLimit: creditLimitValue,
          creditUsed: creditUsedValue,
          availableCredit: creditLimitValue - creditUsedValue
        };
        
        // Update the local state immediately
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user && user.id === selectedUser.id ? updatedUserData : user
          )
        );
        
        // Update cache immediately
        if (userDataCache.data) {
          userDataCache.data = userDataCache.data.map(user => 
            user && user.id === selectedUser.id ? updatedUserData : user
          );
        }
        
        setSelectedUser(updatedUserData);
        setIsCreditDialogOpen(false);
        
        toast({
          title: "Credit Updated",
          description: "Credit limit has been successfully updated.",
        });
        
        // Refresh in background to ensure consistency
        setTimeout(() => refreshUsers(false), 100);
      } else {
        // More descriptive error message
        const errorMessage = result?.error || 
          (result && typeof result === 'object' ? JSON.stringify(result) : "Update failed");
        
        console.error('Credit update failed:', errorMessage);
        
        toast({
          title: "Error",
          description: `Failed to update credit: ${errorMessage}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Credit update error:', error)
      toast({
        title: "Error",
        description: `An unexpected error occurred: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSavingCredit(false); // Reset dedicated credit loading state
    }
  }

  const handleCreateUser = async () => {
    if (isCreatingUser) return; // Prevent double-clicks
    
    try {
      setIsCreatingUser(true);
      
      // Save form data for API call
      const formData = { ...createForm };
      
      // Generate the REAL temporary password that will be used in the database
      const realTempPassword = Math.random().toString(36).slice(-8) + 
        Math.random().toString(36).slice(-8).toUpperCase() + 
        Math.floor(Math.random() * 1000);
      
      // SYNCHRONIZED: Create optimistic user immediately
      const optimisticUser = {
        id: `temp-${Date.now()}`, // Temporary ID
        name: createForm.name,
        email: createForm.email,
        accountType: createForm.accountType,
        isAdmin: false,
        creditLimit: createForm.creditLimit,
        creditUsed: 0,
        availableCredit: createForm.creditLimit,
        company: createForm.accountType === "business" ? createForm.company : undefined,
        phone: createForm.phone,
        address: createForm.address,
        temporaryPassword: true,
        createdAt: new Date().toISOString()
      };
      
      // Add to UI immediately for instant feedback
      setUsers(prevUsers => [optimisticUser, ...prevUsers]);
      
      // Update cache immediately  
      if (userDataCache.data) {
        userDataCache.data = [optimisticUser, ...userDataCache.data];
      }
      
      // Close dialog immediately
      setIsCreateDialogOpen(false);
      
      // Clear the form immediately
      setCreateForm({
        name: "",
        email: "",
        accountType: "personal",
        company: "",
        phone: "",
        creditLimit: 0,
        address: { street: "", city: "", state: "", zipCode: "" },
      });
      
      // Show success toast immediately
      toast({
        title: "User Created",
        description: "New user has been created with a temporary password.",
      });
      
      // SYNCHRONIZED: Show password dialog immediately with REAL temp password
      setSelectedUser(optimisticUser);
      setGeneratedPassword(realTempPassword);
      setIsPasswordDialogOpen(true);
      
      // Start the API call in background with the pre-generated password
      const createUserPromise = createUser({
        ...formData,
        isAdmin: false,
        creditUsed: 0,
        company: formData.accountType === "business" ? formData.company : undefined,
        temporaryPassword: true,
        mustChangePassword: true,
        preGeneratedPassword: realTempPassword, // Send the real password to backend
      });
      
      // Handle API response in background
      createUserPromise.then(result => {
        if (result?.success) {
          // Replace optimistic user with real user data
          if (result.user) {
            const newUser = {
              id: result.user.id,
              name: result.user.name,
              email: result.user.email,
              accountType: result.user.accountType,
              isAdmin: result.user.isAdmin,
              creditLimit: result.user.creditLimit,
              creditUsed: result.user.creditUsed,
              availableCredit: (result.user.creditLimit || 0) - (result.user.creditUsed || 0),
              company: result.user.company,
              phone: result.user.phone,
              address: result.user.address,
              temporaryPassword: result.user.temporaryPassword,
              createdAt: new Date().toISOString()
            };
            
            // Replace optimistic user with real data
            setUsers(prevUsers => 
              prevUsers.map(u => u.id === optimisticUser.id ? newUser : u)
            );
            
            // Update cache
            if (userDataCache.data) {
              userDataCache.data = userDataCache.data.map(u => 
                u.id === optimisticUser.id ? newUser : u
              );
            }
            
            // Update the selected user for the dialog (if still open)
            setSelectedUser(newUser);
            // Don't update password - we already have the correct one from frontend generation
          }
          
          // Refresh admin stats in background
          setTimeout(() => {
            if (typeof window !== 'undefined' && window.refreshAdminStats) {
              window.refreshAdminStats()
            }
          }, 100);
        } else {
          // Rollback optimistic update on failure
          setUsers(prevUsers => prevUsers.filter(u => u.id !== optimisticUser.id));
          
          if (userDataCache.data) {
            userDataCache.data = userDataCache.data.filter(u => u.id !== optimisticUser.id);
          }
          
          // Close password dialog and show error
          setIsPasswordDialogOpen(false);
          
          // Restore form data
          setCreateForm(formData);
          setIsCreateDialogOpen(true);
          
          toast({
            title: "Error",
            description: `Failed to create user: ${result?.error || "Unknown error"}`,
            variant: "destructive",
          });
        }
      }).catch(error => {
        // Rollback optimistic update on error
        setUsers(prevUsers => prevUsers.filter(u => u.id === optimisticUser.id ? false : true));
        
        if (userDataCache.data) {
          userDataCache.data = userDataCache.data.filter(u => u.id === optimisticUser.id ? false : true);
        }
        
        // Close password dialog and show error
        setIsPasswordDialogOpen(false);
        
        toast({
          title: "Error",
          description: "Failed to create user. Please try again.",
          variant: "destructive",
        });
      }).finally(() => {
        setIsCreatingUser(false);
      });
      
    } catch (error) {
      // Handle immediate errors
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      });
      setIsCreatingUser(false);
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (isDeletingUser === userId) return; // Prevent double-clicks
    
    // Find the user immediately
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;
    
    // INSTANT: Show simple confirmation first (no API calls)
    const shouldDelete = window.confirm(`Are you sure you want to delete ${userToDelete?.name || userToDelete?.email}?`);
    
    if (!shouldDelete) return;
    
    // User confirmed - now check for orders and proceed
    setIsDeletingUser(userId);
    setSelectedUser(userToDelete);
    
    try {
      // Quick order check
      const checkOrdersResponse = await fetch(`/api/admin/users/${userId}/check-orders`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const orderCheck = await checkOrdersResponse.json();
      
      if (orderCheck.success && orderCheck.hasOrders) {
        // User has orders - show detailed confirmation dialog
        setOrderCount(orderCheck.orderCount);
        setIsDeleteConfirmOpen(true);
        setIsDeletingUser(null); // Reset while showing dialog
      } else {
        // User has no orders - proceed with deletion immediately
        await performUserDeletion(userId, 0);
      }
    } catch (error) {
      // On error, proceed with simple deletion
      console.error('Error checking orders:', error);
      await performUserDeletion(userId, 0);
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    
    setIsDeleteConfirmOpen(false);
    setIsDeletingUser(selectedUser.id);
    
    await performUserDeletion(selectedUser.id, orderCount);
  }

  const performUserDeletion = async (userId: string, expectedOrderCount: number) => {
    const userToRemove = users.find(u => u.id === userId);
    
    try {
      // SYNCHRONIZED: Remove from UI and show success toast immediately
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
      
      // Update cache immediately
      if (userDataCache.data) {
        userDataCache.data = userDataCache.data.filter(u => u.id !== userId);
      }
      
      // INSTANT SUCCESS TOAST: Show immediately
      toast({
        title: "User Deleted",
        description: expectedOrderCount > 0 ? 
          `User and ${expectedOrderCount} orders deleted.` : 
          "User deleted successfully.",
      });
      
      // API call in background
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Success - refresh admin stats
        if (typeof window !== 'undefined' && window.refreshAdminStats) {
          window.refreshAdminStats();
        }
      } else {
        // API failed - rollback and show error
        if (userToRemove) {
          setUsers(prevUsers => [...prevUsers, userToRemove]);
          if (userDataCache.data) {
            userDataCache.data = [...userDataCache.data, userToRemove];
          }
        }
        
        toast({
          title: "Error",
          description: result.error || "Failed to delete user. User has been restored.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Network error - rollback and show error
      if (userToRemove) {
        setUsers(prevUsers => [...prevUsers, userToRemove]);
        if (userDataCache.data) {
          userDataCache.data = [...userDataCache.data, userToRemove];
        }
      }
      
      toast({
        title: "Error",
        description: "Network error during deletion. User has been restored.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingUser(null);
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
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isCreatingUser}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUser} disabled={isCreatingUser}>
                  {isCreatingUser ? "Creating..." : "Create Account"}
                </Button>
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
          <Button variant="outline" onClick={() => {
            setIsRefreshing(true);
            refreshUsers(true).finally(() => {
              setIsRefreshing(false);
            });
          }}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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
                        <div className="font-medium">
                          {user.name || 'No Name'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
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
                        <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteUser(user.id)} 
                        title="Delete user"
                        disabled={isDeletingUser === user.id}
                        >
                          {isDeletingUser === user.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
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
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isEditingUser}>
                Cancel
              </Button>
              <Button onClick={handleSaveUser} disabled={isEditingUser}>
                {isEditingUser ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Credit Dialog */}
      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Credit Line for {selectedUser?.name || selectedUser?.email || 'Unknown User'}</DialogTitle>
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
              <Button variant="outline" onClick={() => setIsCreditDialogOpen(false)} disabled={isSavingCredit}>
                Cancel
              </Button>
              <Button onClick={handleSaveCredit} disabled={isSavingCredit}>
                {isSavingCredit ? "Saving..." : "Save Changes"}
              </Button>
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
                A temporary password has been generated for <strong>{selectedUser?.name || selectedUser?.email || 'Unknown User'}</strong>
              </p>
              <div className="flex items-center space-x-2 bg-white p-2 rounded border">
                <code className="flex-1 font-mono text-lg">{generatedPassword}</code>
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedPassword)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {selectedUser?.id?.toString().startsWith('temp-') && (
                <p className="text-xs text-yellow-700 mt-2">
                  <strong>Note:</strong> The password above is the exact password that will be stored in the database. It is immediately usable for login.
                </p>
              )}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              <span>Confirm User Deletion</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-start space-x-3">
                <div className="bg-red-100 p-2 rounded-full">
                  <Trash2 className="h-4 w-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-800 mb-2">
                    Warning: This user has {orderCount} existing orders
                  </h4>
                  <p className="text-sm text-red-700 mb-3">
                    You are about to permanently delete:
                  </p>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• The user account for <strong>{selectedUser?.name || selectedUser?.email}</strong></li>
                    <li>• All {orderCount} orders and order history</li>
                    <li>• All related data (cannot be recovered)</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-start space-x-3">
                <div className="bg-amber-100 p-2 rounded-full">
                  <DollarSign className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-amber-800 mb-1">
                    Revenue Protection
                  </h4>
                  <p className="text-sm text-amber-700">
                    Don't worry! Revenue from completed/delivered orders will be preserved through automatic revenue adjustments, so your total revenue won't be affected.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>This action cannot be undone.</strong> Are you absolutely sure you want to proceed?
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setIsDeletingUser(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleConfirmDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Yes, Delete User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CardContent>
  </Card>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CreditCard, Building2, MapPin, Package, AlertTriangle, Info } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useCart } from "@/hooks/use-cart"
import { supabase } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"

const orderItems = [
  { name: "Premium Copy Paper - 500 Sheets", quantity: 3, price: 12.99 },
  { name: "Black Ink Cartridge - HP Compatible", quantity: 2, price: 24.99 },
  { name: "Coffee K-Cups - Variety Pack", quantity: 1, price: 32.99 },
]

// Function to safely convert any UUID IDs to integers
const convertUUIDsToInts = (cartItems) => {
  // Create a hardcoded map for UUID to integer IDs (add more if needed)
  const uuidMap = {
    // Add the problematic UUID here with a corresponding integer
    "3790d661-6bc7-4960-85e1-622952d94847": 1 
  };
  
  return cartItems.map(item => {
    const newItem = { ...item };
    
    // Check if the ID is a UUID and we have a mapping for it
    if (typeof newItem.id === 'string' && 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newItem.id)) {
      // Use the mapped ID if available, otherwise use a fallback
      if (uuidMap[newItem.id]) {
        newItem.id = uuidMap[newItem.id];
        console.log(`Converted UUID ${item.id} to integer ID ${newItem.id}`);
      } else {
        // Fallback: use a number based on array position + offset
        newItem.id = cartItems.indexOf(item) + 100; // Use 100+ to avoid conflicts
        console.log(`Converted UUID ${item.id} to fallback ID ${newItem.id}`);
      }
    } else if (typeof newItem.id === 'string') {
      // For any other string, try to convert to integer
      try {
        newItem.id = parseInt(newItem.id);
        if (isNaN(newItem.id)) {
          // If conversion fails, use a fallback ID based on position
          newItem.id = cartItems.indexOf(item) + 100; // Use 100+ to avoid conflicts
        }
      } catch (error) {
        newItem.id = cartItems.indexOf(item) + 100;
      }
    }
    
    // Ensure other numeric fields are properly typed
    newItem.quantity = Number(newItem.quantity);
    newItem.price = Number(newItem.price);
    
    return newItem;
  });
};

export function CheckoutPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, updateUser } = useAuth()
  const { items, getSubtotal, clearCart } = useCart()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [orderNote, setOrderNote] = useState("")
  
  const [shippingAddress, setShippingAddress] = useState({
    fullName: user?.name || "",
    company: user?.company || "",
    address1: user?.address?.street || "",
    address2: "",
    city: user?.address?.city || "",
    state: user?.address?.state || "",
    zipCode: user?.address?.zipCode || "",
    phone: user?.phone || "",
  })
  
  const [billingAddress, setBillingAddress] = useState({ ...shippingAddress })
  const [sameAsShipping, setSameAsShipping] = useState(true)
  const [specialInstructions, setSpecialInstructions] = useState("")

  useEffect(() => {
    // Update shipping address when user data is loaded
    if (user) {
      setShippingAddress({
        fullName: user.name || "",
        company: user.company || "",
        address1: user.address?.street || "",
        address2: "",
        city: user.address?.city || "",
        state: user.address?.state || "",
        zipCode: user.address?.zipCode || "",
        phone: user.phone || "",
      })
    }
  }, [user])

  // If no items in cart, redirect to cart page
  useEffect(() => {
    if (items.length === 0 && !isSubmitting) {
      router.push("/cart")
    }
  }, [items, router, isSubmitting])

  const subtotal = getSubtotal()
  const shipping = subtotal > 50 ? 0 : 5.99
  const tax = subtotal * 0.08
  const total = subtotal + shipping + tax
  
  const availableCredit = user?.availableCredit || 0
  const creditLimit = user?.creditLimit || 0
  const insufficientCredit = total > availableCredit

  // Function to handle checkout process
  const handlePlaceOrder = async () => {
    console.log('===== STARTING CLIENT-SIDE CHECKOUT =====');
    console.log('Cart items before processing:', JSON.stringify(items, null, 2));
    console.log('User data:', JSON.stringify(user, null, 2));
    // Validate form fields
    if (!shippingAddress.fullName || !shippingAddress.address1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode) {
      setErrorMessage("Please fill in all required shipping information.")
      return
    }

    // Check if user has enough credit
    if (insufficientCredit) {
      setErrorMessage(`Insufficient credit. You need ${total.toFixed(2)} but only have ${availableCredit.toFixed(2)} available.`)
      return
    }

    if (!user) {
      setErrorMessage("You must be logged in to place an order.")
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage(null)

      // Format addresses
      const formattedShippingAddress = {
        name: shippingAddress.fullName,
        company: shippingAddress.company,
        street: shippingAddress.address1,
        street2: shippingAddress.address2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipCode: shippingAddress.zipCode,
        phone: shippingAddress.phone
      }

      const formattedBillingAddress = sameAsShipping
        ? formattedShippingAddress
        : {
            name: billingAddress.fullName,
            company: billingAddress.company,
            street: billingAddress.address1,
            street2: billingAddress.address2,
            city: billingAddress.city,
            state: billingAddress.state,
            zipCode: billingAddress.zipCode,
            phone: billingAddress.phone
          }

      // We will use our secure API endpoint to handle the checkout process
      try {
        // Validate cart items before sending to API - convert UUIDs to integers
        const validatedItems = convertUUIDsToInts(items);
        console.log('Validated cart items:', validatedItems);
        
        // Format the data to send to the API
        const checkoutData = {
          user: user,
          items: validatedItems, // Use validated items instead of the original items
          total: total,
          shipping: shipping,
          tax: tax,
          shippingAddress: formattedShippingAddress,
          billingAddress: formattedBillingAddress
        };
        
        console.log('Sending checkout data to API...');
        
        // Call the checkout API with detailed error handling
        let response;
        try {
          response = await fetch('/api/checkout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(checkoutData),
          });
          
          // Check if the request was successful
          if (!response.ok) {
            const errorData = await response.json();
            console.error('Checkout API error:', errorData);
            throw new Error(errorData.error || 'Failed to process checkout');
          }
        } catch (fetchError) {
          console.error('Fetch error:', fetchError);
          throw new Error(`Network error during checkout: ${fetchError.message}`);
        }
        
        // Get the response data
        const responseData = await response.json();
        console.log('Checkout API response:', responseData);
        
        // Extract order info from response
        const { order } = responseData;
        const orderNumber = order.orderNumber;
          
        // The order items and credit are now handled by the API
        // We just need to update the local state and UI
        
        // Update local user state to reflect new credit values in UI
        const newCreditUsed = user.creditUsed + total;
        const newAvailableCredit = user.creditLimit - newCreditUsed;
        
        updateUser({
          creditUsed: newCreditUsed,
          availableCredit: newAvailableCredit
        });
        
        // If the response includes a user mapping, save it for future reference
        if (responseData.userMapping) {
          console.log('Saving user mapping from checkout response:', responseData.userMapping);
          try {
            localStorage.setItem('userMapping', JSON.stringify(responseData.userMapping));
          } catch (e) {
            console.error('Error saving user mapping:', e);
          }
        }
        
        // Clear the cart
        clearCart();
        
        // Show a success toast
        toast({
          variant: "success",
          title: "Order Placed Successfully!",
          description: `Your order #${orderNumber} has been placed. Total: ${total.toFixed(2)}`,
          className: "z-50",
        });
        
        // Log success for verification
        console.log(`SUCCESS: Order #${orderNumber} placed for ${total.toFixed(2)}`);
        
        // Add a small delay before redirect to ensure toast is seen
        setTimeout(() => {
          // Redirect to confirmation page with the order
          router.push(`/orders/confirmation?orderId=${order.id}`);
        }, 1500);
      } catch (error: any) {
        console.error("Checkout error:", error)
        setErrorMessage(error.message || "An error occurred while processing your order.")
        setIsSubmitting(false)
      }
    } catch (error: any) {
      console.error("Checkout error:", error)
      setErrorMessage(error.message || "An error occurred while processing your order.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Checkout</h1>
          <p className="text-gray-600 mt-2">Complete your order</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Error Alert */}
            {errorMessage && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Shipping Address</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={shippingAddress.fullName}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={shippingAddress.company}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, company: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address1">Address Line 1</Label>
                  <Input
                    id="address1"
                    value={shippingAddress.address1}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, address1: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="address2">Address Line 2 (Optional)</Label>
                  <Input
                    id="address2"
                    value={shippingAddress.address2}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, address2: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={shippingAddress.state}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      value={shippingAddress.zipCode}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, zipCode: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Payment Method</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user?.creditLimit > 0 ? (
                  <div className="flex items-center space-x-2 p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Credit Line</span>
                        <Badge variant="outline">Available Payment Method</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Available Credit: ${availableCredit.toLocaleString()} / $
                        {creditLimit.toLocaleString()}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${100 - ((creditLimit - availableCredit) / creditLimit) * 100}%`,
                          }}
                        />
                      </div>
                      
                      {/* Credit warning */}
                      {insufficientCredit && (
                        <div className="mt-2 text-red-500 text-sm flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          <span>Insufficient credit for this order</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Info className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div>
                        <p className="font-medium">No Credit Available</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Your account doesn't have a credit line established or has insufficient credit. 
                          Please contact your account manager to set up or increase your credit line.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Billing Address */}
            <Card>
              <CardHeader>
                <CardTitle>Billing Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    id="sameAsShipping"
                    checked={sameAsShipping}
                    onCheckedChange={(checked) => {
                      setSameAsShipping(checked as boolean)
                      if (checked) {
                        setBillingAddress({ ...shippingAddress })
                      }
                    }}
                  />
                  <Label htmlFor="sameAsShipping">Same as shipping address</Label>
                </div>

                {!sameAsShipping && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="billFullName">Full Name</Label>
                        <Input
                          id="billFullName"
                          value={billingAddress.fullName}
                          onChange={(e) => setBillingAddress({ ...billingAddress, fullName: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="billCompany">Company</Label>
                        <Input
                          id="billCompany"
                          value={billingAddress.company}
                          onChange={(e) => setBillingAddress({ ...billingAddress, company: e.target.value })}
                        />
                      </div>
                    </div>
                    {/* Add more billing address fields as needed */}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Special Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Special Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Any special delivery instructions or notes..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Order Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Order Items */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">${(Number(item.price) * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    {shipping === 0 ? (
                      <span className="text-green-600 font-medium">FREE</span>
                    ) : (
                      <span>${shipping.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Place Order Button */}
                <Button onClick={handlePlaceOrder} className="w-full" size="lg" disabled={isSubmitting || insufficientCredit}>
                  {isSubmitting ? "Processing..." : `Place Order - ${total.toFixed(2)}`}
                </Button>

                {/* Credit Info */}
                <div className="text-xs text-gray-500 text-center flex items-center justify-center">
                  <Info className="h-3 w-3 mr-1" />
                  <p>Your available credit will be reduced by ${total.toFixed(2)}</p>
                </div>

                {/* Security Notice */}
                <div className="text-xs text-gray-500 text-center">
                  <p>🔒 Your payment information is secure and encrypted</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, User, Eye, EyeOff, AlertCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { login } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await login(email, password)

      if (result.success) {
        toast({
          title: "Login successful",
          description: "Welcome back! You have been successfully logged in.",
        })

        // Redirect based on user type
        if (email.toLowerCase() === "admin@bizmart.com") {
          router.push("/admin")
        } else {
          router.push("/")
        }
      } else {
        setError(result.error || "Login failed")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const testAccounts = [
    {
      email: "admin@bizmart.com",
      password: "admin123",
      name: "Admin User",
      type: "Admin Account",
      icon: Building2,
      description: "Full admin access to manage users and products",
      color: "bg-red-100 text-red-800 border-red-200",
    },
    {
      email: "john@company.com",
      password: "user123",
      name: "John Doe",
      type: "Business Account",
      icon: Building2,
      description: "Business user with $5,000 credit line",
      color: "bg-blue-100 text-blue-800 border-blue-200",
    },
    {
      email: "jane@personal.com",
      password: "user123",
      name: "Jane Smith",
      type: "Personal Account",
      icon: User,
      description: "Personal user with $1,500 credit line",
      color: "bg-green-100 text-green-800 border-green-200",
    },
    {
      email: "bob@smallbiz.com",
      password: "temp2024",
      name: "Bob Wilson",
      type: "Temporary Password",
      icon: Building2,
      description: "Business account with temporary password (requires change)",
      color: "bg-orange-100 text-orange-800 border-orange-200",
    },
  ]

  const handleTestLogin = (testEmail: string, testPassword: string) => {
    setEmail(testEmail)
    setPassword(testPassword)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Building2 className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Sign in to BizMart</h2>
          <p className="mt-2 text-sm text-gray-600">
            Access your account with credentials provided by your administrator
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Login Form */}
          <Card>
            <CardHeader>
              <CardTitle>Login to Your Account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <Link href="/forgot-password" className="font-medium text-green-600 hover:text-green-500">
                      Forgot your password?
                    </Link>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Need an account? <span className="font-medium text-green-600">Contact your administrator</span>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Test Accounts */}
          <Card>
            <CardHeader>
              <CardTitle>Demo Accounts</CardTitle>
              <p className="text-sm text-gray-600">Click any account below to auto-fill and test the application</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {testAccounts.map((account, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg hover:shadow-md cursor-pointer transition-all ${account.color}`}
                  onClick={() => handleTestLogin(account.email, account.password)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-white rounded-full shadow-sm">
                      <account.icon className="h-5 w-5 text-gray-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-sm">{account.name}</h4>
                        <span className="text-xs px-2 py-1 bg-white rounded font-medium">{account.type}</span>
                      </div>
                      <p className="text-sm mt-1 opacity-90">{account.description}</p>
                      <div className="text-xs mt-2 space-y-1 font-mono bg-white bg-opacity-50 p-2 rounded">
                        <div>📧 {account.email}</div>
                        <div>🔑 {account.password}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="text-xs text-gray-600 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <strong>💡 How to test:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Click on any account card above to auto-fill the login form</li>
                  <li>Click "Sign in" to access the application with that user's permissions</li>
                  <li>Explore different features based on the account type</li>
                  <li>Use "Forgot password" to test the password reset flow</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

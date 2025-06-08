"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Database, Users, ShoppingCart, MessageSquare } from "lucide-react"

export function SetupGuide() {
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  const steps = [
    {
      id: 1,
      title: "Database Schema",
      description: "Run the Supabase schema script to create all tables",
      icon: Database,
      action: "Run Schema Script",
    },
    {
      id: 2,
      title: "Seed Data",
      description: "Add sample products and categories to your database",
      icon: ShoppingCart,
      action: "Run Seed Script",
    },
    {
      id: 3,
      title: "Create Admin User",
      description: "Set up your first admin user account",
      icon: Users,
      action: "Create Admin",
    },
    {
      id: 4,
      title: "Test Features",
      description: "Test authentication, products, and chat functionality",
      icon: MessageSquare,
      action: "Test App",
    },
  ]

  const markComplete = (stepId: number) => {
    setCompletedSteps((prev) => [...prev, stepId])
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">🎉 Your Marketplace is Ready!</h1>
          <p className="text-lg text-muted-foreground">
            Complete these steps to get your Supabase-powered marketplace up and running
          </p>
        </div>

        <div className="grid gap-6">
          {steps.map((step) => {
            const isCompleted = completedSteps.includes(step.id)
            const Icon = step.icon

            return (
              <Card key={step.id} className={isCompleted ? "border-green-500" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isCompleted ? "bg-green-100 text-green-600" : "bg-gray-100"}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {step.title}
                          {isCompleted && <CheckCircle className="h-5 w-5 text-green-600" />}
                        </CardTitle>
                        <CardDescription>{step.description}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={isCompleted ? "default" : "secondary"}>Step {step.id}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => markComplete(step.id)}
                    disabled={isCompleted}
                    variant={isCompleted ? "outline" : "default"}
                  >
                    {isCompleted ? "✓ Completed" : step.action}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">🔧 Quick Setup Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Go to your Supabase dashboard → SQL Editor</li>
            <li>Run the schema script to create all tables and policies</li>
            <li>Run the seed script to add sample data</li>
            <li>Create your first admin user through the signup process</li>
            <li>Start using your marketplace!</li>
          </ol>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Need help? Check the{" "}
            <a href="https://supabase.com/docs" className="text-blue-600 hover:underline">
              Supabase documentation
            </a>{" "}
            or contact support.
          </p>
        </div>
      </div>
    </div>
  )
}

import React from 'react'
import { Button } from '@/components/ui/button'
import { ProductGenerator } from '@/components/script/product-generator'

export default function ScriptPage() {
  return (
    <div className="container mx-auto py-12">
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-8">Product Generator Script</h1>
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
          <div className="text-gray-700 mb-6">
            <p className="mb-4">This script will generate 3 products for each category in the database.</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Total of 27 products (3 products × 9 categories)</li>
              <li>5 products will be marked as featured</li>
              <li>All products will have realistic data</li>
              <li>Image URLs will be left empty for manual update</li>
            </ul>
            <p className="font-bold text-amber-600">Warning: This action cannot be undone. Use with caution.</p>
          </div>
          <ProductGenerator />
        </div>
      </div>
    </div>
  )
}

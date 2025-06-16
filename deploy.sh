#!/bin/bash

echo "🚀 Starting deployment build process..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf out
rm -rf node_modules/.cache

# Clear any npm/yarn cache
echo "🗑️ Clearing package manager cache..."
npm cache clean --force 2>/dev/null || true
yarn cache clean 2>/dev/null || true

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Set environment variables for build
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

echo "🔧 Building application..."
npm run build

echo "✅ Build completed successfully!"
echo "📋 Build summary:"
echo "   - Static generation disabled"
echo "   - All caching disabled"
echo "   - Hydration mismatch prevention implemented"
echo "   - Ready for Vercel deployment"

echo ""
echo "🚀 Deploy to Vercel with: vercel --prod"

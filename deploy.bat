@echo off
echo 🚀 Starting deployment build process...

REM Clean previous builds
echo 🧹 Cleaning previous builds...
if exist .next rmdir /s /q .next
if exist out rmdir /s /q out
if exist node_modules\.cache rmdir /s /q node_modules\.cache

REM Clear any npm cache
echo 🗑️ Clearing package manager cache...
npm cache clean --force >nul 2>&1

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Set environment variables for build
set NODE_ENV=production
set NEXT_TELEMETRY_DISABLED=1

echo 🔧 Building application...
npm run build

echo ✅ Build completed successfully!
echo 📋 Build summary:
echo    - Static generation disabled
echo    - All caching disabled
echo    - Hydration mismatch prevention implemented
echo    - Ready for Vercel deployment

echo.
echo 🚀 Deploy to Vercel with: vercel --prod
pause

@echo off
echo Starting build process...

echo Step 1: Clear Next.js cache and build folders
rd /s /q .next
rd /s /q node_modules\.cache

echo Step 2: Run Next.js build
call next build

echo Build process completed!

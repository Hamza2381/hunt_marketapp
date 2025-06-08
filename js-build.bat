@echo off
echo ===== BUILDING WITH JAVASCRIPT FILES =====

echo Step 1: Clearing .next directory...
if exist .next (
  rd /s /q .next
)

echo Step 2: Setting up simplified next.config.mjs...
copy next.config.mjs next.config.mjs.backup
copy next.config.simple.mjs next.config.mjs

echo Step 3: Running build...
call npm run build

echo Step 4: Restoring original configuration...
copy next.config.mjs.backup next.config.mjs
del next.config.mjs.backup

echo Build process completed!

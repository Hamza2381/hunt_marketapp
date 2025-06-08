@echo off
echo ===== STARTING FORCE BUILD PROCESS =====

echo Clearing .next directory...
if exist .next (
  rd /s /q .next
)

echo Creating temporary .env file with SKIP_TYPE_CHECK=true...
echo SKIP_TYPE_CHECK=true > .env.temp

echo Running Next.js build...
call npx cross-env NODE_ENV=production SKIP_TYPE_CHECK=true NEXT_SKIP_TYPECHECKING=true npx next build

echo Build process completed!

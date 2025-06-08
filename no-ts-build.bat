@echo off
echo ===== STARTING BUILD WITH SPECIAL CONFIG =====

echo Clearing .next directory...
if exist .next (
  rd /s /q .next
)

echo Backing up original next.config.mjs...
copy next.config.mjs next.config.mjs.backup

echo Copying build-specific next.config.mjs...
copy next.config.build.mjs next.config.mjs

echo Running Next.js build...
call npm install cross-env --save-dev
call npx cross-env SKIP_TYPE_CHECK=true NEXT_SKIP_TYPECHECKING=true npx next build

echo Restoring original next.config.mjs...
copy next.config.mjs.backup next.config.mjs
del next.config.mjs.backup

echo Build process completed!

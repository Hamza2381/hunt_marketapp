const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Clear .next directory
console.log('Clearing .next directory...');
try {
  if (fs.existsSync(path.join(__dirname, '.next'))) {
    fs.rmSync(path.join(__dirname, '.next'), { recursive: true, force: true });
  }
  console.log('.next directory cleared successfully');
} catch (error) {
  console.error('Error clearing .next directory:', error);
}

// Run the build
console.log('Running Next.js build...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}

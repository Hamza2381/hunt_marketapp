const fs = require('fs');
const path = require('path');

// Clear .next directory
console.log('Clearing .next directory...');
try {
  if (fs.existsSync(path.join(__dirname, '..', '.next'))) {
    fs.rmSync(path.join(__dirname, '..', '.next'), { recursive: true, force: true });
    console.log('.next directory cleared successfully');
  } else {
    console.log('.next directory does not exist, nothing to clear');
  }
} catch (error) {
  console.error('Error clearing .next directory:', error);
}

console.log('Now run "npm run build-js" to build with JavaScript files');

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Paths to clear
const paths = [
  '.next',
  'node_modules/.cache'
];

// Function to delete directory recursively
function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folderPath);
    console.log(`✅ Deleted ${folderPath}`);
  }
}

// Clear each path
paths.forEach(pathToClear => {
  const fullPath = path.join(__dirname, pathToClear);
  try {
    console.log(`Clearing ${fullPath}...`);
    deleteFolderRecursive(fullPath);
  } catch (error) {
    console.error(`Error clearing ${fullPath}:`, error);
  }
});

console.log('✅ All caches cleared successfully');
console.log('Starting Next.js build...');

// Run the build command
exec('next build', (error, stdout, stderr) => {
  if (error) {
    console.error(`Build error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Build stderr: ${stderr}`);
  }
  console.log(`Build output: ${stdout}`);
});

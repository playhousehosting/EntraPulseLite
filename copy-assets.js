// Script to copy assets during build process
const fs = require('fs');
const path = require('path');

// Define source and destination paths
const sourceDir = path.join(__dirname, 'assets');
const destDir = path.join(__dirname, 'dist', 'assets');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log(`Created directory: ${destDir}`);
}

// Get all files from source directory
const files = fs.readdirSync(sourceDir);

// Copy each file to destination
files.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const destPath = path.join(destDir, file);

  // Skip directories
  if (fs.statSync(sourcePath).isDirectory()) return;

  fs.copyFileSync(sourcePath, destPath);
  console.log(`Copied: ${sourcePath} -> ${destPath}`);
});

console.log('All assets copied successfully!');
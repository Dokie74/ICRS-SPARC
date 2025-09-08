const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy from src/frontend/build to root (for Vercel)
const buildDir = path.join(__dirname, '../src/frontend/build');
const rootDir = path.join(__dirname, '..');

if (fs.existsSync(buildDir)) {
  console.log('Copying build files from src/frontend/build to root...');
  
  // Copy all files from build to root
  fs.readdirSync(buildDir).forEach((file) => {
    const srcFile = path.join(buildDir, file);
    const destFile = path.join(rootDir, file);
    
    if (fs.statSync(srcFile).isDirectory()) {
      copyRecursiveSync(srcFile, destFile);
    } else {
      // Don't overwrite package.json, vercel.json, etc.
      if (!['package.json', 'vercel.json', 'package-lock.json'].includes(file)) {
        fs.copyFileSync(srcFile, destFile);
      }
    }
  });
  
  console.log('Build files copied to root successfully!');
} else {
  console.error('Build directory not found at src/frontend/build');
  process.exit(1);
}
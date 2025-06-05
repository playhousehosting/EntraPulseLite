/**
 * Asset diagnostics utility for EntraPulse Lite
 * This script helps troubleshoot asset loading issues
 */

const fs = require('fs');
const path = require('path');

console.log('EntraPulse Lite Asset Diagnostics');
console.log('---------------------------------');

// Check for assets directory
const assetsSourceDir = path.join(__dirname, 'assets');
const assetsDistDir = path.join(__dirname, 'dist', 'assets');

console.log('\nChecking asset directories:');
console.log(`Source assets directory (${assetsSourceDir}): ${fs.existsSync(assetsSourceDir) ? 'Found ✓' : 'Missing ✗'}`);
console.log(`Dist assets directory (${assetsDistDir}): ${fs.existsSync(assetsDistDir) ? 'Found ✓' : 'Missing ✗'}`);

// List source assets
console.log('\nSource assets:');
if (fs.existsSync(assetsSourceDir)) {
  const sourceFiles = fs.readdirSync(assetsSourceDir);
  sourceFiles.forEach(file => {
    const filePath = path.join(assetsSourceDir, file);
    const stats = fs.statSync(filePath);
    console.log(` - ${file} (${stats.isDirectory() ? 'directory' : stats.size + ' bytes'})`);
  });
} else {
  console.log(' No source assets directory found!');
}

// List dist assets
console.log('\nDistributed assets:');
if (fs.existsSync(assetsDistDir)) {
  const distFiles = fs.readdirSync(assetsDistDir);
  distFiles.forEach(file => {
    const filePath = path.join(assetsDistDir, file);
    const stats = fs.statSync(filePath);
    console.log(` - ${file} (${stats.isDirectory() ? 'directory' : stats.size + ' bytes'})`);
  });
} else {
  console.log(' No dist assets directory found! Have you run the build script?');
}

// Check for webpack config
const webpackConfigPath = path.join(__dirname, 'webpack.config.js');
console.log('\nChecking webpack config:');
console.log(`Webpack config (${webpackConfigPath}): ${fs.existsSync(webpackConfigPath) ? 'Found ✓' : 'Missing ✗'}`);

if (fs.existsSync(webpackConfigPath)) {
  const webpackConfig = fs.readFileSync(webpackConfigPath, 'utf8');
  
  // Check for asset handling in webpack config
  const assetHandling = webpackConfig.includes('asset/resource') || 
                        webpackConfig.includes('file-loader') || 
                        webpackConfig.includes('url-loader');
                        
  console.log(`Asset handling in webpack config: ${assetHandling ? 'Found ✓' : 'Missing ✗'}`);
  
  // Check if CopyWebpackPlugin is configured for assets
  const copyPlugin = webpackConfig.includes('CopyWebpackPlugin') && 
                     webpackConfig.includes('./assets');
                     
  console.log(`CopyWebpackPlugin for assets: ${copyPlugin ? 'Found ✓' : 'Missing ✗'}`);
}

console.log('\nDiagnostics complete!');
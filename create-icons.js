// HFL Icon Generator Script
const fs = require('fs');
const path = require('path');

// HFL logotip SVG template
const hflLogoSVG = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="white"/>
  <text x="512" y="400" font-family="Arial, sans-serif" font-size="200" font-weight="bold" text-anchor="middle" fill="black">HFL</text>
  <text x="512" y="500" font-family="Arial, sans-serif" font-size="60" text-anchor="middle" fill="#666666">havas futbol ligasi</text>
</svg>
`;

// Icon sizes for different platforms
const iconSizes = {
  // Main app icon
  'icon.png': 1024,
  // Android adaptive icon
  'adaptive-icon.png': 1024,
  // iOS icon
  'ios-icon.png': 1024,
  // Splash screen
  'splash-icon.png': 1024,
  // Web favicon
  'favicon.png': 32,
  // Android icons
  'android-48.png': 48,
  'android-72.png': 72,
  'android-96.png': 96,
  'android-144.png': 144,
  'android-192.png': 192,
  'android-512.png': 512,
  // iOS icons
  'ios-20.png': 20,
  'ios-29.png': 29,
  'ios-40.png': 40,
  'ios-58.png': 58,
  'ios-60.png': 60,
  'ios-76.png': 76,
  'ios-80.png': 80,
  'ios-87.png': 87,
  'ios-114.png': 114,
  'ios-120.png': 120,
  'ios-152.png': 152,
  'ios-167.png': 167,
  'ios-180.png': 180,
  'ios-1024.png': 1024
};

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Generate SVG for each size
Object.entries(iconSizes).forEach(([filename, size]) => {
  const svg = hflLogoSVG.replace('1024', size.toString());
  const filepath = path.join(assetsDir, filename);
  
  fs.writeFileSync(filepath, svg);
  console.log(`Created ${filename} (${size}x${size})`);
});

console.log('All HFL icons generated successfully!');
console.log('Note: These are SVG files. For production, convert to PNG using online tools or ImageMagick.');


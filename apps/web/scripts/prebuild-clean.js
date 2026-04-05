const fs = require('fs');
const path = require('path');

const proxyPath = path.resolve(__dirname, '../src/proxy.js');

if (fs.existsSync(proxyPath)) {
  try {
    fs.unlinkSync(proxyPath);
    console.log(`[prebuild-clean] Removed ${proxyPath}`);
  } catch (error) {
    console.warn(`[prebuild-clean] Failed to remove ${proxyPath}:`, error.message);
  }
} else {
  console.log('[prebuild-clean] No proxy.js found, skipping');
}

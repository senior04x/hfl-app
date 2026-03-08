const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure proper module resolution for SDK 54 (or current SDK)
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add support for additional file extensions if needed (e.g., 'svg')
// config.resolver.assetExts.push('svg');

// Add resolver configuration to fix module loading issues, especially for CommonJS 'require'
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Configure for New Architecture
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer.minifierConfig,
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
  // Enable New Architecture support
  unstable_allowRequireContext: true,
};

module.exports = config;

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for additional file extensions
config.resolver.assetExts.push('svg');

// Ensure proper module resolution
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Optimize memory usage
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Reduce memory usage
config.serializer.createModuleIdFactory = function () {
  return function (path) {
    return path;
  };
};

module.exports = config;


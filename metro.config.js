const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Default Expo Metro config without raw .mjs resolution that breaks Web bundling
module.exports = config;

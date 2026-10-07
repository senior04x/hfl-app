// This AppEntry project uses React Navigation. npm may retain expo-router as
// an optional CLI peer; it must not activate Router's navigation rewrites.
process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1';
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Default Expo Metro config without raw .mjs resolution that breaks Web bundling
module.exports = config;

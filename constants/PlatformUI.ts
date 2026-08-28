/**
 * Platform-Specific UI Configuration
 *
 * 🎨 Android: Material Design (no glassmorphism - performance issues)
 * 🎨 iOS: Native iOS design with glassmorphism
 *
 * Created: 2026-08-28
 */

import { Platform } from 'react-native';

export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';

/**
 * Glassmorphism faqat iOS'da ishlaydi
 * Android'da performance muammo beradi
 */
export const PLATFORM_UI = {
  // Glassmorphism support
  supportsGlassmorphism: isIOS,

  // Card styles
  card: {
    android: {
      backgroundColor: 'rgba(30, 35, 50, 0.95)', // Solid, dark
      elevation: 4, // Material elevation
      borderRadius: 12,
      borderWidth: 0,
    },
    ios: {
      backgroundColor: 'rgba(18, 23, 34, 0.65)', // Glassmorphism
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.12)',
      // iOS blur effect is handled by BlurView component
    }
  },

  // Surface styles (modals, sheets)
  surface: {
    android: {
      backgroundColor: 'rgba(25, 30, 45, 0.98)',
      elevation: 8,
      borderRadius: 16,
    },
    ios: {
      backgroundColor: 'rgba(18, 23, 34, 0.75)',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    }
  },

  // Button styles
  button: {
    android: {
      // Material Design ripple effect (native)
      android_ripple: {
        color: 'rgba(0, 223, 130, 0.3)',
        borderless: false,
      },
      elevation: 2,
      borderRadius: 8,
    },
    ios: {
      // iOS native haptic feedback
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }
  },

  // Shadow styles
  shadow: {
    android: {
      // Android uses elevation instead of shadow
      elevation: 4,
    },
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    }
  },

  // Animation durations
  animation: {
    fast: isAndroid ? 200 : 250,
    normal: isAndroid ? 300 : 350,
    slow: isAndroid ? 400 : 500,
  },
};

/**
 * Get platform-specific card style
 */
export const getPlatformCardStyle = () => {
  return isAndroid ? PLATFORM_UI.card.android : PLATFORM_UI.card.ios;
};

/**
 * Get platform-specific surface style
 */
export const getPlatformSurfaceStyle = () => {
  return isAndroid ? PLATFORM_UI.surface.android : PLATFORM_UI.surface.ios;
};

/**
 * Get platform-specific shadow style
 */
export const getPlatformShadowStyle = () => {
  return isAndroid ? PLATFORM_UI.shadow.android : PLATFORM_UI.shadow.ios;
};

/**
 * Get platform-specific button style
 */
export const getPlatformButtonStyle = () => {
  return isAndroid ? PLATFORM_UI.button.android : PLATFORM_UI.button.ios;
};

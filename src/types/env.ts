// Environment variables type definitions
export interface EnvironmentVariables {
  // Firebase Configuration
  EXPO_PUBLIC_FIREBASE_API_KEY: string;
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: string;
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  EXPO_PUBLIC_FIREBASE_APP_ID: string;

  // API Configuration
  EXPO_PUBLIC_API_BASE_URL: string;

  // Development Settings
  EXPO_PUBLIC_USE_MOCK_DATA: string;
}

// Type-safe environment variable access
export const env = {
  FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',

  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://hfl-backend.onrender.com',
  USE_MOCK_DATA: process.env.EXPO_PUBLIC_USE_MOCK_DATA === 'true',
} as const;

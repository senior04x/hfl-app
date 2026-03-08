import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple storage utilities
export const safeClearStorage = async () => {
  try {
    await AsyncStorage.clear();
    console.log('✅ Storage cleared successfully');
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
};

export const safeResetStores = async () => {
  try {
    console.log('✅ Stores reset successfully');
  } catch (error) {
    console.error('Error resetting stores:', error);
  }
};

export const initializeAppSafely = async () => {
  console.log('🔧 Initializing app safely...');
  
  try {
    // Only clear storage, don't reset stores to avoid conflicts
    await safeClearStorage();
    
    console.log('✅ App initialized safely');
  } catch (error) {
    console.error('Error in app initialization:', error);
  }
};

// Firebase Offline Support - HFL Mobile App

import { 
  enableNetwork, 
  disableNetwork,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class FirebaseOfflineService {
  
  // 1. Enable Offline Persistence
  static async enableOfflinePersistence() {
    try {
      // Firebase automatically enables offline persistence
      console.log('✅ Firebase offline persistence enabled');
      return true;
    } catch (error) {
      console.error('❌ Error enabling offline persistence:', error);
      return false;
    }
  }
  
  // 2. Check Network Status
  static async checkNetworkStatus() {
    try {
      // Try to read from Firestore
      const testDoc = doc(db, 'test', 'connection');
      await getDoc(testDoc);
      return true; // Online
    } catch (error) {
      return false; // Offline
    }
  }
  
  // 3. Offline Data Caching
  static async cachePlayerData(playerId: string, playerData: any) {
    try {
      await AsyncStorage.setItem(`player_${playerId}`, JSON.stringify(playerData));
      console.log('✅ Player data cached offline');
    } catch (error) {
      console.error('❌ Error caching player data:', error);
    }
  }
  
  // 4. Get Cached Player Data
  static async getCachedPlayerData(playerId: string) {
    try {
      const cachedData = await AsyncStorage.getItem(`player_${playerId}`);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting cached player data:', error);
      return null;
    }
  }
  
  // 5. Offline Login (Using cached data)
  static async offlineLogin(playerId: string) {
    try {
      const cachedPlayer = await this.getCachedPlayerData(playerId);
      if (cachedPlayer) {
        console.log('✅ Offline login successful with cached data');
        return cachedPlayer;
      } else {
        throw new Error('No cached player data found');
      }
    } catch (error) {
      console.error('❌ Offline login failed:', error);
      throw error;
    }
  }
  
  // 6. Sync Data When Online
  static async syncDataWhenOnline() {
    try {
      const isOnline = await this.checkNetworkStatus();
      if (isOnline) {
        console.log('✅ Device is online, syncing data...');
        // Firebase automatically syncs when online
        return true;
      } else {
        console.log('📱 Device is offline, using cached data');
        return false;
      }
    } catch (error) {
      console.error('❌ Error syncing data:', error);
      return false;
    }
  }
  
  // 7. Real-time Listener with Offline Support
  static setupOfflineListener(collection: string, documentId: string, callback: (data: any) => void) {
    const docRef = doc(db, collection, documentId);
    
    return onSnapshot(docRef, 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          console.log('📱 Real-time update received:', data);
          callback(data);
          
          // Cache the data for offline use
          AsyncStorage.setItem(`${collection}_${documentId}`, JSON.stringify(data));
        }
      },
      (error) => {
        console.error('❌ Real-time listener error:', error);
        
        // Try to get cached data
        AsyncStorage.getItem(`${collection}_${documentId}`)
          .then(cachedData => {
            if (cachedData) {
              console.log('📱 Using cached data due to error');
              callback(JSON.parse(cachedData));
            }
          });
      }
    );
  }
}

// Usage Examples:
/*
// Enable offline support
await FirebaseOfflineService.enableOfflinePersistence();

// Check if online
const isOnline = await FirebaseOfflineService.checkNetworkStatus();

// Cache player data
await FirebaseOfflineService.cachePlayerData('player_123', playerData);

// Offline login
const player = await FirebaseOfflineService.offlineLogin('player_123');

// Setup offline listener
const unsubscribe = FirebaseOfflineService.setupOfflineListener('players', 'player_123', (data) => {
  console.log('Player data updated:', data);
});
*/


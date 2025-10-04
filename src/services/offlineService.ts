// Offline Service for HFL Mobile App
// Handles caching and offline mode

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface CacheData {
  data: any;
  timestamp: number;
  expiry: number;
}

interface OfflineConfig {
  cacheExpiry: number; // in milliseconds
  maxCacheSize: number; // in MB
  retryAttempts: number;
  retryDelay: number; // in milliseconds
}

class OfflineService {
  private config: OfflineConfig;
  private isOnline: boolean = true;
  private retryQueue: Array<() => Promise<void>> = [];

  constructor() {
    this.config = {
      cacheExpiry: 5 * 60 * 1000, // 5 minutes
      maxCacheSize: 50 * 1024 * 1024, // 50 MB
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
    };

    this.initializeNetworkListener();
  }

  // Initialize network status listener
  private initializeNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (wasOffline && this.isOnline) {
        console.log('🌐 Back online - processing retry queue');
        this.processRetryQueue();
      } else if (!this.isOnline) {
        console.log('📴 Offline mode activated');
      }
    });
  }

  // Check if device is online
  isDeviceOnline(): boolean {
    return this.isOnline;
  }

  // Cache data with expiry
  async cacheData(key: string, data: any, customExpiry?: number): Promise<void> {
    try {
      const cacheData: CacheData = {
        data,
        timestamp: Date.now(),
        expiry: customExpiry || this.config.cacheExpiry,
      };

      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
      console.log(`💾 Data cached: ${key}`);
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  // Get cached data
  async getCachedData(key: string): Promise<any | null> {
    try {
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const cacheData: CacheData = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is expired
      if (now - cacheData.timestamp > cacheData.expiry) {
        await AsyncStorage.removeItem(`cache_${key}`);
        console.log(`🗑️ Cache expired: ${key}`);
        return null;
      }

      console.log(`📦 Cache hit: ${key}`);
      return cacheData.data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  // Clear expired cache
  async clearExpiredCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const cacheData: CacheData = JSON.parse(cached);
          const now = Date.now();
          
          if (now - cacheData.timestamp > cacheData.expiry) {
            await AsyncStorage.removeItem(key);
            console.log(`🗑️ Removed expired cache: ${key}`);
          }
        }
      }
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  // Clear all cache
  async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      await AsyncStorage.multiRemove(cacheKeys);
      console.log('🗑️ All cache cleared');
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  // Get cache size
  async getCacheSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      let totalSize = 0;
      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('Error calculating cache size:', error);
      return 0;
    }
  }

  // Fetch data with offline support
  async fetchWithOfflineSupport<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    useCache: boolean = true
  ): Promise<T | null> {
    try {
      // Try to get from cache first
      if (useCache) {
        const cachedData = await this.getCachedData(key);
        if (cachedData) {
          return cachedData;
        }
      }

      // If online, fetch fresh data
      if (this.isOnline) {
        const freshData = await fetchFunction();
        
        // Cache the fresh data
        await this.cacheData(key, freshData);
        
        return freshData;
      } else {
        // If offline, return cached data or null
        console.log('📴 Offline - returning cached data or null');
        return await this.getCachedData(key);
      }
    } catch (error) {
      console.error('Error in fetchWithOfflineSupport:', error);
      
      // If online and error occurred, try cache
      if (this.isOnline) {
        return await this.getCachedData(key);
      }
      
      return null;
    }
  }

  // Add to retry queue
  addToRetryQueue(retryFunction: () => Promise<void>): void {
    this.retryQueue.push(retryFunction);
    console.log(`📋 Added to retry queue: ${this.retryQueue.length} items`);
  }

  // Process retry queue
  private async processRetryQueue(): Promise<void> {
    if (this.retryQueue.length === 0) return;

    console.log(`🔄 Processing ${this.retryQueue.length} retry items`);
    
    const retryItems = [...this.retryQueue];
    this.retryQueue = [];

    for (const retryFunction of retryItems) {
      try {
        await retryFunction();
        console.log('✅ Retry successful');
      } catch (error) {
        console.error('❌ Retry failed:', error);
        // Add back to queue if retry failed
        this.retryQueue.push(retryFunction);
      }
    }
  }

  // Sync data when online
  async syncData(syncFunction: () => Promise<void>): Promise<void> {
    if (this.isOnline) {
      try {
        await syncFunction();
        console.log('✅ Data synced');
      } catch (error) {
        console.error('❌ Sync failed:', error);
        this.addToRetryQueue(syncFunction);
      }
    } else {
      console.log('📴 Offline - adding to retry queue');
      this.addToRetryQueue(syncFunction);
    }
  }

  // Get offline status
  getOfflineStatus(): {
    isOnline: boolean;
    retryQueueLength: number;
    cacheSize: number;
  } {
    return {
      isOnline: this.isOnline,
      retryQueueLength: this.retryQueue.length,
      cacheSize: 0, // Will be calculated asynchronously
    };
  }
}

// Export singleton instance
export const offlineService = new OfflineService();
export default OfflineService;

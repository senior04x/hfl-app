// Sync Service for HFL Mobile App
// Handles data synchronization between local and remote

import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineService } from './offlineService';
import { errorService } from './errorService';

interface SyncConfig {
  syncInterval: number; // in milliseconds
  maxRetries: number;
  retryDelay: number; // in milliseconds
}

interface SyncStatus {
  isSyncing: boolean;
  lastSync: number;
  pendingChanges: number;
  errors: number;
}

class SyncService {
  private config: SyncConfig;
  private syncStatus: SyncStatus;
  private syncTimer: NodeJS.Timeout | null = null;
  private isOnline: boolean = true;

  constructor() {
    this.config = {
      syncInterval: 30 * 1000, // 30 seconds
      maxRetries: 3,
      retryDelay: 1000, // 1 second
    };

    this.syncStatus = {
      isSyncing: false,
      lastSync: 0,
      pendingChanges: 0,
      errors: 0,
    };

    this.initializeSync();
  }

  // Initialize sync service
  private initializeSync(): void {
    // Load last sync time from storage
    this.loadLastSyncTime();
    
    // Start periodic sync
    this.startPeriodicSync();
  }

  // Load last sync time from storage
  private async loadLastSyncTime(): Promise<void> {
    try {
      const lastSync = await AsyncStorage.getItem('last_sync_time');
      if (lastSync) {
        this.syncStatus.lastSync = parseInt(lastSync);
      }
    } catch (error) {
      console.error('Error loading last sync time:', error);
    }
  }

  // Save last sync time to storage
  private async saveLastSyncTime(): Promise<void> {
    try {
      await AsyncStorage.setItem('last_sync_time', this.syncStatus.lastSync.toString());
    } catch (error) {
      console.error('Error saving last sync time:', error);
    }
  }

  // Start periodic sync
  startPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.isOnline && !this.syncStatus.isSyncing) {
        this.syncData();
      }
    }, this.config.syncInterval);
  }

  // Stop periodic sync
  stopPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // Set online status
  setOnlineStatus(isOnline: boolean): void {
    this.isOnline = isOnline;
    
    if (isOnline && !this.syncStatus.isSyncing) {
      // Sync immediately when coming online
      this.syncData();
    }
  }

  // Sync all data
  async syncData(): Promise<void> {
    if (this.syncStatus.isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    try {
      this.syncStatus.isSyncing = true;
      console.log('🔄 Starting data sync...');

      // Sync teams
      await this.syncTeams();
      
      // Sync matches
      await this.syncMatches();
      
      // Sync players
      await this.syncPlayers();
      
      // Sync standings
      await this.syncStandings();

      // Update sync status
      this.syncStatus.lastSync = Date.now();
      this.syncStatus.errors = 0;
      
      await this.saveLastSyncTime();
      
      console.log('✅ Data sync completed');
    } catch (error) {
      console.error('❌ Data sync failed:', error);
      this.syncStatus.errors++;
      
      errorService.logError(error, {
        screen: 'SyncService',
        action: 'sync_data',
      });
    } finally {
      this.syncStatus.isSyncing = false;
    }
  }

  // Sync teams data
  private async syncTeams(): Promise<void> {
    try {
      const apiBaseUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
      
      const response = await fetch(`${apiBaseUrl}/api/teams`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Cache teams data
          await offlineService.cacheData('teams', result.data);
          console.log('✅ Teams synced');
        }
      }
    } catch (error) {
      console.error('Error syncing teams:', error);
      throw error;
    }
  }

  // Sync matches data
  private async syncMatches(): Promise<void> {
    try {
      const apiBaseUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
      
      const response = await fetch(`${apiBaseUrl}/api/matches`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Cache matches data
          await offlineService.cacheData('matches', result.data);
          console.log('✅ Matches synced');
        }
      }
    } catch (error) {
      console.error('Error syncing matches:', error);
      throw error;
    }
  }

  // Sync players data
  private async syncPlayers(): Promise<void> {
    try {
      const apiBaseUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
      
      const response = await fetch(`${apiBaseUrl}/api/players`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Cache players data
          await offlineService.cacheData('players', result.data);
          console.log('✅ Players synced');
        }
      }
    } catch (error) {
      console.error('Error syncing players:', error);
      throw error;
    }
  }

  // Sync standings data
  private async syncStandings(): Promise<void> {
    try {
      const apiBaseUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
      
      const response = await fetch(`${apiBaseUrl}/api/standings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Cache standings data
          await offlineService.cacheData('standings', result.data);
          console.log('✅ Standings synced');
        }
      }
    } catch (error) {
      console.error('Error syncing standings:', error);
      throw error;
    }
  }

  // Force sync (manual)
  async forceSync(): Promise<void> {
    console.log('🔄 Force sync requested');
    await this.syncData();
  }

  // Get sync status
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // Get last sync time
  getLastSyncTime(): number {
    return this.syncStatus.lastSync;
  }

  // Check if sync is needed
  isSyncNeeded(): boolean {
    const now = Date.now();
    const timeSinceLastSync = now - this.syncStatus.lastSync;
    return timeSinceLastSync > this.config.syncInterval;
  }

  // Cleanup
  cleanup(): void {
    this.stopPeriodicSync();
  }
}

// Export singleton instance
export const syncService = new SyncService();
export default SyncService;

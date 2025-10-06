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

      const syncResults = {
        teams: false,
        matches: false,
        players: false,
        standings: false
      };

      // Sync teams
      try {
        await this.syncTeams();
        syncResults.teams = true;
        console.log('✅ Teams synced successfully');
      } catch (error) {
        console.error('❌ Teams sync failed:', error);
        errorService.logError(error, {
          screen: 'SyncService',
          action: 'sync_teams',
        });
      }
      
      // Sync matches
      try {
        await this.syncMatches();
        syncResults.matches = true;
        console.log('✅ Matches synced successfully');
      } catch (error) {
        console.error('❌ Matches sync failed:', error);
        errorService.logError(error, {
          screen: 'SyncService',
          action: 'sync_matches',
        });
      }
      
      // Sync players
      try {
        await this.syncPlayers();
        syncResults.players = true;
        console.log('✅ Players synced successfully');
      } catch (error) {
        console.error('❌ Players sync failed:', error);
        errorService.logError(error, {
          screen: 'SyncService',
          action: 'sync_players',
        });
      }
      
      // Sync standings
      try {
        await this.syncStandings();
        syncResults.standings = true;
        console.log('✅ Standings synced successfully');
      } catch (error) {
        console.error('❌ Standings sync failed:', error);
        errorService.logError(error, {
          screen: 'SyncService',
          action: 'sync_standings',
        });
      }

      // Update sync status
      this.syncStatus.lastSync = Date.now();
      
      // Count successful syncs
      const successfulSyncs = Object.values(syncResults).filter(Boolean).length;
      const totalSyncs = Object.keys(syncResults).length;
      
      if (successfulSyncs === totalSyncs) {
        this.syncStatus.errors = 0;
        console.log('✅ All data synced successfully');
      } else if (successfulSyncs > 0) {
        this.syncStatus.errors = totalSyncs - successfulSyncs;
        console.log(`⚠️ Partial sync completed: ${successfulSyncs}/${totalSyncs} successful`);
      } else {
        this.syncStatus.errors = totalSyncs;
        console.log('❌ All sync operations failed');
      }
      
      await this.saveLastSyncTime();
      
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
      console.log('🔄 Syncing teams...');
      
      // Try local API route first, then fallback to direct backend
      let response: Response;
      let apiSource = 'local';
      
      try {
        response = await fetch('/api/teams', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (localError) {
        console.log('Local API failed, trying direct backend...');
        apiSource = 'backend';
        const backendUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://hfl-backend-360d7733bad1.herokuapp.com';
        response = await fetch(`${backendUrl}/api/teams`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response');
      }

      const result = await response.json();
      console.log(`📊 Teams response from ${apiSource}:`, result);
      
      if (result.success && result.data) {
        // Cache teams data
        await offlineService.cacheData('teams', result.data);
        console.log('✅ Teams synced successfully');
      } else {
        throw new Error(result.error || 'Invalid response format');
      }
    } catch (error) {
      console.error('Error syncing teams:', error);
      throw error;
    }
  }

  // Sync matches data
  private async syncMatches(): Promise<void> {
    try {
      console.log('🔄 Syncing matches...');
      
      // Try local API route first, then fallback to direct backend
      let response: Response;
      let apiSource = 'local';
      
      try {
        response = await fetch('/api/matches', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (localError) {
        console.log('Local API failed, trying direct backend...');
        apiSource = 'backend';
        const backendUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://hfl-backend-360d7733bad1.herokuapp.com';
        response = await fetch(`${backendUrl}/api/matches`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response');
      }

      const result = await response.json();
      console.log(`📊 Matches response from ${apiSource}:`, result);
      
      if (result.success && result.data) {
        // Cache matches data
        await offlineService.cacheData('matches', result.data);
        console.log('✅ Matches synced successfully');
      } else {
        throw new Error(result.error || 'Invalid response format');
      }
    } catch (error) {
      console.error('Error syncing matches:', error);
      throw error;
    }
  }

  // Sync players data
  private async syncPlayers(): Promise<void> {
    try {
      console.log('🔄 Syncing players...');
      
      // Try local API route first, then fallback to direct backend
      let response: Response;
      let apiSource = 'local';
      
      try {
        response = await fetch('/api/players', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (localError) {
        console.log('Local API failed, trying direct backend...');
        apiSource = 'backend';
        const backendUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://hfl-backend-360d7733bad1.herokuapp.com';
        response = await fetch(`${backendUrl}/api/players`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response');
      }

      const result = await response.json();
      console.log(`📊 Players response from ${apiSource}:`, result);
      
      if (result.success && result.data) {
        // Cache players data
        await offlineService.cacheData('players', result.data);
        console.log('✅ Players synced successfully');
      } else {
        throw new Error(result.error || 'Invalid response format');
      }
    } catch (error) {
      console.error('Error syncing players:', error);
      throw error;
    }
  }

  // Sync standings data
  private async syncStandings(): Promise<void> {
    try {
      console.log('🔄 Syncing standings...');
      
      // Try local API route first, then fallback to direct backend
      let response: Response;
      let apiSource = 'local';
      
      try {
        response = await fetch('/api/standings', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (localError) {
        console.log('Local API failed, trying direct backend...');
        apiSource = 'backend';
        const backendUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://hfl-backend-360d7733bad1.herokuapp.com';
        response = await fetch(`${backendUrl}/api/standings`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response');
      }

      const result = await response.json();
      console.log(`📊 Standings response from ${apiSource}:`, result);
      
      if (result.success && result.data) {
        // Cache standings data
        await offlineService.cacheData('standings', result.data);
        console.log('✅ Standings synced successfully');
      } else {
        throw new Error(result.error || 'Invalid response format');
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

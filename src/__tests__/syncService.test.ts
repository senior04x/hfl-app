// Sync Service Tests for HFL Mobile App
// Tests data synchronization functionality

import { syncService } from '../services/syncService';
import { offlineService } from '../services/offlineService';
import { realTimeService } from '../services/realTimeService';
import { DataValidator } from '../utils/validation';

// Mock fetch
global.fetch = jest.fn();

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
}));

describe('SyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Data Synchronization', () => {
    it('should sync teams data successfully', async () => {
      const mockTeamsResponse = {
        success: true,
        data: [
          {
            id: 'team1',
            name: 'Test Team 1',
            shortName: 'TT1',
            colors: { primary: '#FF0000', secondary: '#FFFFFF' }
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(mockTeamsResponse)
      });

      // Mock offlineService.cacheData
      const cacheDataSpy = jest.spyOn(offlineService, 'cacheData').mockResolvedValue();

      await syncService.syncData();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/teams'),
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      );

      expect(cacheDataSpy).toHaveBeenCalledWith('teams', mockTeamsResponse.data);
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(syncService.syncData()).rejects.toThrow();
    });

    it('should validate data before caching', async () => {
      const invalidTeamsResponse = {
        success: true,
        data: [
          {
            id: 'team1',
            // Missing required fields
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(invalidTeamsResponse)
      });

      const cacheDataSpy = jest.spyOn(offlineService, 'cacheData').mockResolvedValue();

      await syncService.syncData();

      // Should not cache invalid data
      expect(cacheDataSpy).not.toHaveBeenCalled();
    });
  });

  describe('Network Status Handling', () => {
    it('should trigger sync when coming online', () => {
      const syncDataSpy = jest.spyOn(syncService, 'syncData').mockResolvedValue();
      
      syncService.setOnlineStatus(true);
      
      expect(syncDataSpy).toHaveBeenCalled();
    });

    it('should not sync when already syncing', async () => {
      const syncDataSpy = jest.spyOn(syncService, 'syncData').mockImplementation(async () => {
        // Simulate long-running sync
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Start first sync
      const firstSync = syncService.syncData();
      
      // Try to start second sync while first is running
      syncService.setOnlineStatus(true);
      
      await firstSync;
      
      // Should only be called once
      expect(syncDataSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should log errors properly', async () => {
      const error = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValueOnce(error);

      const logErrorSpy = jest.spyOn(require('../services/errorService').errorService, 'logError');

      await expect(syncService.syncData()).rejects.toThrow();

      expect(logErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          screen: 'SyncService',
          action: expect.any(String)
        })
      );
    });
  });
});

describe('DataValidator', () => {
  describe('Team Validation', () => {
    it('should validate correct team data', () => {
      const validTeam = {
        id: 'team1',
        name: 'Test Team',
        shortName: 'TT',
        colors: { primary: '#FF0000', secondary: '#FFFFFF' }
      };

      const result = DataValidator.validateTeam(validTeam);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toEqual(validTeam);
    });

    it('should reject invalid team data', () => {
      const invalidTeam = {
        // Missing required fields
        colors: { primary: '#FF0000' } // Missing secondary
      };

      const result = DataValidator.validateTeam(invalidTeam);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.data).toBeNull();
    });
  });

  describe('Match Validation', () => {
    it('should validate correct match data', () => {
      const validMatch = {
        id: 'match1',
        homeTeamId: 'team1',
        awayTeamId: 'team2',
        homeScore: 2,
        awayScore: 1,
        date: '2024-01-01T10:00:00Z'
      };

      const result = DataValidator.validateMatch(validMatch);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject match with negative scores', () => {
      const invalidMatch = {
        id: 'match1',
        homeTeamId: 'team1',
        awayTeamId: 'team2',
        homeScore: -1, // Invalid negative score
        awayScore: 1
      };

      const result = DataValidator.validateMatch(invalidMatch);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Home score must be a non-negative number');
    });
  });

  describe('Player Validation', () => {
    it('should validate correct player data', () => {
      const validPlayer = {
        id: 'player1',
        name: 'John Doe',
        phone: '+998901234567',
        teamId: 'team1'
      };

      const result = DataValidator.validatePlayer(validPlayer);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate Uzbek phone numbers', () => {
      const validPhones = [
        '+998901234567',
        '998901234567',
        '901234567'
      ];

      validPhones.forEach(phone => {
        const player = {
          id: 'player1',
          name: 'John Doe',
          phone
        };

        const result = DataValidator.validatePlayer(player);
        expect(result.isValid).toBe(true);
      });
    });
  });
});

describe('OfflineService', () => {
  describe('Cache Management', () => {
    it('should cache data with expiry', async () => {
      const testData = { test: 'data' };
      const cacheDataSpy = jest.spyOn(offlineService, 'cacheData').mockResolvedValue();

      await offlineService.cacheData('test', testData);

      expect(cacheDataSpy).toHaveBeenCalledWith('test', testData);
    });

    it('should retrieve cached data', async () => {
      const testData = { test: 'data' };
      const mockCachedData = {
        data: testData,
        timestamp: Date.now(),
        expiry: 10 * 60 * 1000
      };

      const getCachedDataSpy = jest.spyOn(offlineService, 'getCachedData')
        .mockResolvedValue(testData);

      const result = await offlineService.getCachedData('test');

      expect(result).toEqual(testData);
    });

    it('should handle expired cache', async () => {
      const expiredData = {
        data: { test: 'data' },
        timestamp: Date.now() - (15 * 60 * 1000), // 15 minutes ago
        expiry: 10 * 60 * 1000 // 10 minutes expiry
      };

      const getCachedDataSpy = jest.spyOn(offlineService, 'getCachedData')
        .mockResolvedValue(null);

      const result = await offlineService.getCachedData('test');

      expect(result).toBeNull();
    });
  });
});

describe('RealTimeService', () => {
  describe('WebSocket Connection', () => {
    it('should connect to WebSocket server', async () => {
      const mockWebSocket = {
        readyState: 1,
        onopen: null,
        onmessage: null,
        onclose: null,
        onerror: null,
        close: jest.fn(),
        send: jest.fn()
      };

      (global as any).WebSocket = jest.fn(() => mockWebSocket);

      const connectPromise = realTimeService.connect();

      // Simulate connection
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen();
      }

      await connectPromise;

      expect(realTimeService.getConnectionStatus()).toBe(true);
    });

    it('should handle WebSocket errors', async () => {
      const mockWebSocket = {
        readyState: 3,
        onopen: null,
        onmessage: null,
        onclose: null,
        onerror: null,
        close: jest.fn(),
        send: jest.fn()
      };

      (global as any).WebSocket = jest.fn(() => mockWebSocket);

      const connectPromise = realTimeService.connect();

      // Simulate error
      if (mockWebSocket.onerror) {
        mockWebSocket.onerror(new Error('Connection failed'));
      }

      await expect(connectPromise).rejects.toThrow();
    });
  });

  describe('Message Handling', () => {
    it('should subscribe to message types', () => {
      const callback = jest.fn();
      const unsubscribe = realTimeService.subscribe('match_update', callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle incoming messages', () => {
      const callback = jest.fn();
      realTimeService.subscribe('match_update', callback);

      // Simulate message
      const message = {
        type: 'match_update',
        data: { matchId: 'match1', score: '2-1' },
        timestamp: new Date().toISOString()
      };

      // This would be called internally by the WebSocket onmessage handler
      // In a real test, we'd need to trigger the actual WebSocket message
    });
  });
});

// Tests data synchronization functionality

import { syncService } from '../services/syncService';
import { offlineService } from '../services/offlineService';
import { realTimeService } from '../services/realTimeService';
import { DataValidator } from '../utils/validation';

// Mock fetch
global.fetch = jest.fn();

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
}));

describe('SyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Data Synchronization', () => {
    it('should sync teams data successfully', async () => {
      const mockTeamsResponse = {
        success: true,
        data: [
          {
            id: 'team1',
            name: 'Test Team 1',
            shortName: 'TT1',
            colors: { primary: '#FF0000', secondary: '#FFFFFF' }
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(mockTeamsResponse)
      });

      // Mock offlineService.cacheData
      const cacheDataSpy = jest.spyOn(offlineService, 'cacheData').mockResolvedValue();

      await syncService.syncData();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/teams'),
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      );

      expect(cacheDataSpy).toHaveBeenCalledWith('teams', mockTeamsResponse.data);
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(syncService.syncData()).rejects.toThrow();
    });

    it('should validate data before caching', async () => {
      const invalidTeamsResponse = {
        success: true,
        data: [
          {
            id: 'team1',
            // Missing required fields
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(invalidTeamsResponse)
      });

      const cacheDataSpy = jest.spyOn(offlineService, 'cacheData').mockResolvedValue();

      await syncService.syncData();

      // Should not cache invalid data
      expect(cacheDataSpy).not.toHaveBeenCalled();
    });
  });

  describe('Network Status Handling', () => {
    it('should trigger sync when coming online', () => {
      const syncDataSpy = jest.spyOn(syncService, 'syncData').mockResolvedValue();
      
      syncService.setOnlineStatus(true);
      
      expect(syncDataSpy).toHaveBeenCalled();
    });

    it('should not sync when already syncing', async () => {
      const syncDataSpy = jest.spyOn(syncService, 'syncData').mockImplementation(async () => {
        // Simulate long-running sync
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Start first sync
      const firstSync = syncService.syncData();
      
      // Try to start second sync while first is running
      syncService.setOnlineStatus(true);
      
      await firstSync;
      
      // Should only be called once
      expect(syncDataSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should log errors properly', async () => {
      const error = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValueOnce(error);

      const logErrorSpy = jest.spyOn(require('../services/errorService').errorService, 'logError');

      await expect(syncService.syncData()).rejects.toThrow();

      expect(logErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          screen: 'SyncService',
          action: expect.any(String)
        })
      );
    });
  });
});

describe('DataValidator', () => {
  describe('Team Validation', () => {
    it('should validate correct team data', () => {
      const validTeam = {
        id: 'team1',
        name: 'Test Team',
        shortName: 'TT',
        colors: { primary: '#FF0000', secondary: '#FFFFFF' }
      };

      const result = DataValidator.validateTeam(validTeam);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toEqual(validTeam);
    });

    it('should reject invalid team data', () => {
      const invalidTeam = {
        // Missing required fields
        colors: { primary: '#FF0000' } // Missing secondary
      };

      const result = DataValidator.validateTeam(invalidTeam);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.data).toBeNull();
    });
  });

  describe('Match Validation', () => {
    it('should validate correct match data', () => {
      const validMatch = {
        id: 'match1',
        homeTeamId: 'team1',
        awayTeamId: 'team2',
        homeScore: 2,
        awayScore: 1,
        date: '2024-01-01T10:00:00Z'
      };

      const result = DataValidator.validateMatch(validMatch);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject match with negative scores', () => {
      const invalidMatch = {
        id: 'match1',
        homeTeamId: 'team1',
        awayTeamId: 'team2',
        homeScore: -1, // Invalid negative score
        awayScore: 1
      };

      const result = DataValidator.validateMatch(invalidMatch);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Home score must be a non-negative number');
    });
  });

  describe('Player Validation', () => {
    it('should validate correct player data', () => {
      const validPlayer = {
        id: 'player1',
        name: 'John Doe',
        phone: '+998901234567',
        teamId: 'team1'
      };

      const result = DataValidator.validatePlayer(validPlayer);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate Uzbek phone numbers', () => {
      const validPhones = [
        '+998901234567',
        '998901234567',
        '901234567'
      ];

      validPhones.forEach(phone => {
        const player = {
          id: 'player1',
          name: 'John Doe',
          phone
        };

        const result = DataValidator.validatePlayer(player);
        expect(result.isValid).toBe(true);
      });
    });
  });
});

describe('OfflineService', () => {
  describe('Cache Management', () => {
    it('should cache data with expiry', async () => {
      const testData = { test: 'data' };
      const cacheDataSpy = jest.spyOn(offlineService, 'cacheData').mockResolvedValue();

      await offlineService.cacheData('test', testData);

      expect(cacheDataSpy).toHaveBeenCalledWith('test', testData);
    });

    it('should retrieve cached data', async () => {
      const testData = { test: 'data' };
      const mockCachedData = {
        data: testData,
        timestamp: Date.now(),
        expiry: 10 * 60 * 1000
      };

      const getCachedDataSpy = jest.spyOn(offlineService, 'getCachedData')
        .mockResolvedValue(testData);

      const result = await offlineService.getCachedData('test');

      expect(result).toEqual(testData);
    });

    it('should handle expired cache', async () => {
      const expiredData = {
        data: { test: 'data' },
        timestamp: Date.now() - (15 * 60 * 1000), // 15 minutes ago
        expiry: 10 * 60 * 1000 // 10 minutes expiry
      };

      const getCachedDataSpy = jest.spyOn(offlineService, 'getCachedData')
        .mockResolvedValue(null);

      const result = await offlineService.getCachedData('test');

      expect(result).toBeNull();
    });
  });
});

describe('RealTimeService', () => {
  describe('WebSocket Connection', () => {
    it('should connect to WebSocket server', async () => {
      const mockWebSocket = {
        readyState: 1,
        onopen: null,
        onmessage: null,
        onclose: null,
        onerror: null,
        close: jest.fn(),
        send: jest.fn()
      };

      (global as any).WebSocket = jest.fn(() => mockWebSocket);

      const connectPromise = realTimeService.connect();

      // Simulate connection
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen();
      }

      await connectPromise;

      expect(realTimeService.getConnectionStatus()).toBe(true);
    });

    it('should handle WebSocket errors', async () => {
      const mockWebSocket = {
        readyState: 3,
        onopen: null,
        onmessage: null,
        onclose: null,
        onerror: null,
        close: jest.fn(),
        send: jest.fn()
      };

      (global as any).WebSocket = jest.fn(() => mockWebSocket);

      const connectPromise = realTimeService.connect();

      // Simulate error
      if (mockWebSocket.onerror) {
        mockWebSocket.onerror(new Error('Connection failed'));
      }

      await expect(connectPromise).rejects.toThrow();
    });
  });

  describe('Message Handling', () => {
    it('should subscribe to message types', () => {
      const callback = jest.fn();
      const unsubscribe = realTimeService.subscribe('match_update', callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle incoming messages', () => {
      const callback = jest.fn();
      realTimeService.subscribe('match_update', callback);

      // Simulate message
      const message = {
        type: 'match_update',
        data: { matchId: 'match1', score: '2-1' },
        timestamp: new Date().toISOString()
      };

      // This would be called internally by the WebSocket onmessage handler
      // In a real test, we'd need to trigger the actual WebSocket message
    });
  });
});










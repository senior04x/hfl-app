import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Player } from '../types';

interface PlayerState {
  player: Player | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (player: Player) => Promise<void>;
  logout: () => Promise<void>;
  updatePlayer: (player: Player) => Promise<void>;
  setLoading: (loading: boolean) => void;
  reset: () => Promise<void>;
}

const PLAYER_STORAGE_KEY = '@hfl_player';

export const usePlayerStore = create<PlayerState>((set, get) => ({
  player: null,
  isLoggedIn: false,
  isLoading: false,

  login: async (player: Player) => {
    try {
      set({ isLoading: true });
      
      // Save to AsyncStorage with error handling
      try {
        await AsyncStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));
      } catch (storageError) {
        console.error('Storage error, continuing without persistence:', storageError);
      }
      
      set({ 
        player, 
        isLoggedIn: true, 
        isLoading: false 
      });
      
      console.log('Player logged in:', player.firstName, player.lastName);
    } catch (error) {
      console.error('Error saving player data:', error);
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true });
      
      // Remove from AsyncStorage
      await AsyncStorage.removeItem(PLAYER_STORAGE_KEY);
      
      set({ 
        player: null, 
        isLoggedIn: false, 
        isLoading: false 
      });
      
      console.log('Player logged out');
    } catch (error) {
      console.error('Error removing player data:', error);
      set({ isLoading: false });
    }
  },

  updatePlayer: async (updatedPlayer: Player) => {
    try {
      set({ isLoading: true });
      
      // Update AsyncStorage
      await AsyncStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(updatedPlayer));
      
      set({ 
        player: updatedPlayer, 
        isLoading: false 
      });
      
      console.log('Player data updated');
    } catch (error) {
      console.error('Error updating player data:', error);
      set({ isLoading: false });
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  reset: async () => {
    try {
      await AsyncStorage.removeItem(PLAYER_STORAGE_KEY);
      set({ 
        player: null, 
        isLoggedIn: false, 
        isLoading: false 
      });
      console.log('✅ Player store reset successfully');
    } catch (error) {
      console.error('Error resetting player store:', error);
      set({ 
        player: null, 
        isLoggedIn: false, 
        isLoading: false 
      });
    }
  },
}));

// Initialize player data from storage on app start
export const initializePlayerStore = async () => {
  try {
    const storedPlayer = await AsyncStorage.getItem(PLAYER_STORAGE_KEY);
    if (storedPlayer) {
      const player = JSON.parse(storedPlayer);
      usePlayerStore.getState().login(player).catch(error => {
        console.error('Error logging in stored player:', error);
      });
    }
  } catch (error) {
    console.error('Error initializing player store:', error);
  }
};

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
}

const PLAYER_STORAGE_KEY = '@hfl_player';

export const usePlayerStore = create<PlayerState>((set, get) => ({
  player: null,
  isLoggedIn: false,
  isLoading: false,

  login: async (player: Player) => {
    try {
      set({ isLoading: true });
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));
      
      set({ 
        player, 
        isLoggedIn: true, 
        isLoading: false 
      });
      
      console.log('Player logged in:', player.firstName, player.lastName);
    } catch (error) {
      console.error('Error saving player data:', error);
      set({ isLoading: false });
      throw error;
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
      throw error;
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
      throw error;
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));

// Initialize player data from storage on app start
export const initializePlayerStore = async () => {
  try {
    // Check AsyncStorage for offline support
    const storedPlayer = await AsyncStorage.getItem(PLAYER_STORAGE_KEY);
    if (storedPlayer) {
      const player = JSON.parse(storedPlayer);
      // Use the login method but don't await it to prevent blocking
      usePlayerStore.getState().login(player).catch(error => {
        console.error('Error logging in stored player:', error);
      });
    }
  } catch (error) {
    console.error('Error initializing player store:', error);
  }
};

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Team } from '../types';

interface TeamState {
  team: Team | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (team: Team) => Promise<void>;
  logout: () => Promise<void>;
  updateTeam: (team: Team) => Promise<void>;
  setLoading: (loading: boolean) => void;
  reset: () => Promise<void>;
}

const TEAM_STORAGE_KEY = '@hfl_team';

export const useTeamStore = create<TeamState>((set, get) => ({
  team: null,
  isLoggedIn: false,
  isLoading: false,

  login: async (team: Team) => {
    try {
      set({ isLoading: true });
      
      // Save to AsyncStorage with error handling
      try {
        await AsyncStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
      } catch (storageError) {
        console.error('Storage error, continuing without persistence:', storageError);
      }
      
      set({ 
        team, 
        isLoggedIn: true, 
        isLoading: false 
      });
      
      console.log('Team logged in:', team.name);
    } catch (error) {
      console.error('Error saving team data:', error);
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true });
      
      // Remove from AsyncStorage
      await AsyncStorage.removeItem(TEAM_STORAGE_KEY);
      
      set({ 
        team: null, 
        isLoggedIn: false, 
        isLoading: false 
      });
      
      console.log('Team logged out');
    } catch (error) {
      console.error('Error removing team data:', error);
      set({ isLoading: false });
    }
  },

  updateTeam: async (updatedTeam: Team) => {
    try {
      set({ isLoading: true });
      
      // Update AsyncStorage
      await AsyncStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(updatedTeam));
      
      set({ 
        team: updatedTeam, 
        isLoading: false 
      });
      
      console.log('Team data updated');
    } catch (error) {
      console.error('Error updating team data:', error);
      set({ isLoading: false });
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  reset: async () => {
    try {
      await AsyncStorage.removeItem(TEAM_STORAGE_KEY);
      set({ 
        team: null, 
        isLoggedIn: false, 
        isLoading: false 
      });
      console.log('✅ Team store reset successfully');
    } catch (error) {
      console.error('Error resetting team store:', error);
      set({ 
        team: null, 
        isLoggedIn: false, 
        isLoading: false 
      });
    }
  },
}));

// Initialize team data from storage on app start
export const initializeTeamStore = async () => {
  try {
    const storedTeam = await AsyncStorage.getItem(TEAM_STORAGE_KEY);
    if (storedTeam) {
      const team = JSON.parse(storedTeam);
      useTeamStore.getState().login(team).catch(error => {
        console.error('Error logging in stored team:', error);
      });
    }
  } catch (error) {
    console.error('Error initializing team store:', error);
  }
};

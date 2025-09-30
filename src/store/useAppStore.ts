import { create } from 'zustand';
import { DataService } from '../services/data';
import { Match, Team, TeamStanding } from '../types';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

interface AppState {
  matches: Match[];
  teams: Team[];
  standings: TeamStanding[];
  isLoading: boolean;
  loadMatches: () => Promise<void>;
  loadTeams: () => Promise<void>;
  loadStandings: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  updateMatch: (match: Match) => void;
  setupRealTimeListeners: () => () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  matches: [],
  teams: [],
  standings: [],
  isLoading: false,

  loadMatches: async () => {
    set({ isLoading: true });
    try {
      const matches = await DataService.getMatches();
      set({ matches, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Error loading matches:', error);
    }
  },

  loadTeams: async () => {
    console.log('useAppStore: Starting to load teams...');
    set({ isLoading: true });
    try {
      const teams = await DataService.getTeams();
      console.log('useAppStore: Teams loaded:', teams?.length || 0, 'teams');
      console.log('useAppStore: Teams data:', teams);
      
      // Ensure teams is always an array
      const safeTeams = Array.isArray(teams) ? teams : [];
      set({ teams: safeTeams, isLoading: false });
    } catch (error) {
      console.error('useAppStore: Error loading teams:', error);
      set({ teams: [], isLoading: false });
    }
  },

  loadStandings: async () => {
    set({ isLoading: true });
    try {
      const standings = await DataService.getStandings();
      set({ standings, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Error loading standings:', error);
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  updateMatch: (updatedMatch: Match) => {
    const { matches } = get();
    const updatedMatches = matches.map(match => 
      match.id === updatedMatch.id ? updatedMatch : match
    );
    set({ matches: updatedMatches });
  },

  setupRealTimeListeners: () => {
    console.log('Setting up real-time listeners...');
    
    // For now, we'll use manual refresh instead of real-time listeners
    // because we need to fetch players for each team, which is complex
    // Real-time listeners will be implemented later if needed
    
    console.log('Real-time listeners setup complete (manual refresh mode)');
    
    // Return cleanup function
    return () => {
      console.log('Cleaning up real-time listeners...');
    };
  },
}));


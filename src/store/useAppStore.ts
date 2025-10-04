import { create } from 'zustand';
import { DataService } from '../services/data';
import { Match, Team, TeamStanding } from '../types';
import { realTimeService } from '../services/realTimeService';

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
      console.error('Error loading matches:', error);
      set({ matches: [], isLoading: false });
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
    
    // Connect to WebSocket
    realTimeService.connect().then(() => {
      console.log('✅ Real-time service connected');
      
      // Subscribe to match updates
      realTimeService.subscribe('match_update', (data) => {
        console.log('📨 Match update received:', data);
        const { match } = data;
        
        // Update matches in store
        set((state) => ({
          matches: state.matches.map(m => 
            m.id === match.id ? { ...m, ...match } : m
          )
        }));
      });
      
      // Subscribe to team updates
      realTimeService.subscribe('team_update', (data) => {
        console.log('📨 Team update received:', data);
        const { team } = data;
        
        // Update teams in store
        set((state) => ({
          teams: state.teams.map(t => 
            t.id === team.id ? { ...t, ...team } : t
          )
        }));
      });
      
      // Subscribe to application updates
      realTimeService.subscribe('application_update', (data) => {
        console.log('📨 Application update received:', data);
        // Handle application updates if needed
      });
      
      // Subscribe to transfer updates
      realTimeService.subscribe('transfer_update', (data) => {
        console.log('📨 Transfer update received:', data);
        // Handle transfer updates if needed
      });
      
    }).catch((error) => {
      console.error('❌ Real-time service connection failed:', error);
      console.log('Falling back to manual refresh mode');
    });
    
    console.log('Real-time listeners setup complete');
    
    // Return cleanup function
    return () => {
      console.log('Cleaning up real-time listeners...');
      realTimeService.disconnect();
    };
  },
}));


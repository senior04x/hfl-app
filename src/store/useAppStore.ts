import { create } from 'zustand';
import { DataService } from '../services/data';
import { Match, Team, TeamStanding } from '../types';

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
    set({ isLoading: true });
    try {
      const teams = await DataService.getTeams();
      set({ teams, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Error loading teams:', error);
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
}));

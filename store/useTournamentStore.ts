import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Tournament } from '../types';

interface TournamentState {
    tournaments: Tournament[];
    selectedTournament: Tournament | null;
    isLoading: boolean;
    setTournaments: (tournaments: Tournament[]) => void;
    setSelectedTournament: (tournament: Tournament | null) => void;
    setLoading: (loading: boolean) => void;
}

export const useTournamentStore = create<TournamentState>()(
    persist(
        (set) => ({
            tournaments: [],
            selectedTournament: null,
            isLoading: false,
            setTournaments: (tournaments) => set({ tournaments }),
            setSelectedTournament: (selectedTournament) => set({ selectedTournament }),
            setLoading: (isLoading) => set({ isLoading }),
        }),
        {
            name: 'tournament-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

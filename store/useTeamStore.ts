import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Team } from '../types';

interface TeamState {
    teams: Team[];
    selectedTeam: Team | null;
    isLoading: boolean;
    setTeams: (teams: Team[]) => void;
    setSelectedTeam: (team: Team | null) => void;
    setLoading: (loading: boolean) => void;
}

export const useTeamStore = create<TeamState>()(
    persist(
        (set) => ({
            teams: [],
            selectedTeam: null,
            isLoading: false,
            setTeams: (teams) => set({ teams }),
            setSelectedTeam: (selectedTeam) => set({ selectedTeam }),
            setLoading: (isLoading) => set({ isLoading }),
        }),
        {
            name: 'team-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

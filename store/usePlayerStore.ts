import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Player } from '../types';

interface PlayerState {
    players: Player[];
    selectedPlayer: Player | null;
    isLoading: boolean;
    setPlayers: (players: Player[]) => void;
    setSelectedPlayer: (player: Player | null) => void;
    setLoading: (loading: boolean) => void;
}

export const usePlayerStore = create<PlayerState>()(
    persist(
        (set) => ({
            players: [],
            selectedPlayer: null,
            isLoading: false,
            setPlayers: (players) => set({ players }),
            setSelectedPlayer: (selectedPlayer) => set({ selectedPlayer }),
            setLoading: (isLoading) => set({ isLoading }),
        }),
        {
            name: 'player-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

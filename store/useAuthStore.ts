import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
    isGuest: boolean;
    isAuthenticated: boolean;
    user: any | null;
    setGuest: (isGuest: boolean) => void;
    setAuth: (user: any) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            isGuest: false,
            isAuthenticated: false,
            user: null,
            setGuest: (isGuest) => set({ isGuest, isAuthenticated: false, user: null }),
            setAuth: (user) => set({ user, isAuthenticated: true, isGuest: false }),
            logout: () => set({ user: null, isAuthenticated: false, isGuest: false }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

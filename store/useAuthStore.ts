import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
    isGuest: boolean;
    isAuthenticated: boolean;
    user: any | null;
    unreadCount: number;
    isChatMuted: boolean;
    setGuest: (isGuest: boolean) => void;
    setAuth: (user: any) => void;
    logout: () => void;
    incrementUnreadCount: () => void;
    resetUnreadCount: () => void;
    toggleChatMute: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            isGuest: false,
            isAuthenticated: false,
            user: null,
            unreadCount: 0,
            isChatMuted: false,
            setGuest: (isGuest) => set({ isGuest, isAuthenticated: false, user: null, unreadCount: 0, isChatMuted: false }),
            setAuth: (user) => set({ user, isAuthenticated: true, isGuest: false }),
            logout: () => set({ user: null, isAuthenticated: false, isGuest: false, unreadCount: 0, isChatMuted: false }),
            incrementUnreadCount: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
            resetUnreadCount: () => set({ unreadCount: 0 }),
            toggleChatMute: () => set((state) => ({ isChatMuted: !state.isChatMuted })),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

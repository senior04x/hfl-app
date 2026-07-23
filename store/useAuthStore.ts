import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

const secureStorage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        return (await SecureStore.getItemAsync(name)) || null;
    },
    setItem: async (name: string, value: string): Promise<void> => {
        await SecureStore.setItemAsync(name, value);
    },
    removeItem: async (name: string): Promise<void> => {
        await SecureStore.deleteItemAsync(name);
    },
};

interface AuthState {
    isGuest: boolean;
    isAuthenticated: boolean;
    user: any | null; // Note: Ensure backend session.token is correctly stored here
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
            name: 'secure-auth-storage',
            storage: createJSONStorage(() => secureStorage),
        }
    )
);

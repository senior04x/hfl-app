import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
    isGuest: boolean;
    isAuthenticated: boolean;
    user: any | null;
    userAccounts: any[];
    unreadCount: number;
    isChatMuted: boolean;
    setGuest: (isGuest: boolean) => void;
    setAuth: (user: any, accounts?: any[]) => void;
    setUserAccounts: (accounts: any[]) => void;
    updateUser: (partialUser: any) => void;
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
            userAccounts: [],
            unreadCount: 0,
            isChatMuted: false,
            setGuest: (isGuest) => set({ isGuest, isAuthenticated: false, user: null, userAccounts: [], unreadCount: 0, isChatMuted: false }),
            setAuth: (user, accounts) => set((state) => {
                let mergedAccounts = accounts && accounts.length > 0 ? accounts : state.userAccounts;
                if (!mergedAccounts || mergedAccounts.length === 0) {
                    mergedAccounts = user ? [user] : [];
                }
                return {
                    user,
                    isAuthenticated: true,
                    isGuest: false,
                    userAccounts: mergedAccounts,
                };
            }),
            setUserAccounts: (accounts) => set({ userAccounts: accounts }),
            updateUser: (partialUser) => set((state) => {
                if (!state.user) return state;
                const updatedUser = { ...state.user, ...partialUser };
                const updatedAccounts = (state.userAccounts || []).map(acc => {
                    const accId = String(acc.id || acc._id || acc.teamId || acc.team_id || '');
                    const targetId = String(updatedUser.id || updatedUser._id || updatedUser.teamId || updatedUser.team_id || '');
                    if (accId && targetId && accId === targetId) {
                        return { ...acc, ...partialUser };
                    }
                    return acc;
                });
                return {
                    user: updatedUser,
                    userAccounts: updatedAccounts,
                };
            }),
            logout: () => set({ user: null, userAccounts: [], isAuthenticated: false, isGuest: false, unreadCount: 0, isChatMuted: false }),
            incrementUnreadCount: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
            resetUnreadCount: () => set({ unreadCount: 0 }),
            toggleChatMute: () => set((state) => ({ isChatMuted: !state.isChatMuted })),
        }),
        {
            name: 'amatora-auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

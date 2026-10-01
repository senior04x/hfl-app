import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthStorageFailure, authStorageDiagnostic } from '../utils/authStorageDiagnostic';
import { clearTransferLoginStorage } from '../services/transferLoginStorage';

let loginRevision = 0;
let storageQueue: Promise<unknown> = Promise.resolve();
const authStorage = {
    getItem: async (key: string) => { await storageQueue; return AsyncStorage.getItem(key); },
    setItem: (key: string, value: string) => {
        const write = storageQueue.then(() => AsyncStorage.setItem(key, value));
        storageQueue = write.catch(() => undefined);
        return write;
    },
    removeItem: (key: string) => {
        const remove = storageQueue.then(() => AsyncStorage.removeItem(key));
        storageQueue = remove.catch(() => undefined);
        return remove;
    },
};

interface AuthState {
    isGuest: boolean;
    isAuthenticated: boolean;
    user: any | null;
    userAccounts: any[];
    unreadCount: number;
    isChatMuted: boolean;
    setGuest: (isGuest: boolean) => void;
    setAuth: (user: any, accounts?: any[]) => Promise<void>;
    setUserAccounts: (accounts: any[]) => void;
    updateUser: (partialUser: any) => void;
    logout: () => void;
    incrementUnreadCount: () => void;
    resetUnreadCount: () => void;
    toggleChatMute: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            isGuest: false,
            isAuthenticated: false,
            user: null,
            userAccounts: [],
            unreadCount: 0,
            isChatMuted: false,
            setGuest: (isGuest) => { loginRevision++; void clearTransferLoginStorage().catch(() => undefined); set({ isGuest, isAuthenticated: false, user: null, userAccounts: [], unreadCount: 0, isChatMuted: false }); },
            setAuth: async (user, accounts) => {
                const revision = ++loginRevision;
                const state = get();
                const mergedAccounts = accounts?.length ? accounts : state.userAccounts.length ? state.userAccounts : user ? [user] : [];
                const next = { ...state, user, userAccounts: mergedAccounts, isAuthenticated: true, isGuest: false };
                // Do not show an authenticated screen until the login is durable.
                let payload: string;
                try { payload = JSON.stringify({ state: next, version: 0 }); }
                catch (error) { throw new AuthStorageFailure(authStorageDiagnostic(error, 'serialize')); }
                try { await authStorage.setItem('amatora-auth-storage', payload); }
                catch (error) { throw new AuthStorageFailure(authStorageDiagnostic(error)); }
                if (revision !== loginRevision) return;
                set({ user, userAccounts: mergedAccounts, isAuthenticated: true, isGuest: false });
            },
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
            logout: () => { loginRevision++; void clearTransferLoginStorage().catch(() => undefined); set({ user: null, userAccounts: [], isAuthenticated: false, isGuest: false, unreadCount: 0, isChatMuted: false }); },
            incrementUnreadCount: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
            resetUnreadCount: () => set({ unreadCount: 0 }),
            toggleChatMute: () => set((state) => ({ isChatMuted: !state.isChatMuted })),
        }),
        {
            name: 'amatora-auth-storage',
            skipHydration: true,
            storage: createJSONStorage(() => authStorage),
        }
    )
);

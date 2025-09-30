import { create } from 'zustand';
import { AuthService } from '../services/auth';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkAuthState: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: {
    id: 'temp-user',
    email: 'temp@example.com',
    displayName: 'Temporary User',
    isAdmin: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  isLoading: false,
  isAuthenticated: true,

  signUp: async (email: string, password: string, displayName: string) => {
    set({ isLoading: true });
    try {
      const user = await AuthService.signUp(email, password, displayName);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const user = await AuthService.signIn(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await AuthService.signOut();
      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  checkAuthState: async () => {
    set({ isLoading: true });
    try {
      const user = await AuthService.getCurrentUser();
      set({ 
        user, 
        isAuthenticated: !!user, 
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      console.error('Auth state check failed:', error);
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));

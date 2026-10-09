import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Separate from the member's organization and from authentication/authorization.
export const useSpectatorBrowseStore = create<{
    organization: { id: number; name: string } | null;
    selectOrganization: (organization: { id: number; name: string } | null) => void;
}>()(persist((set) => ({
    organization: null,
    selectOrganization: (organization) => set({ organization }),
}), { name: 'amatora-spectator-browse-v1', storage: createJSONStorage(() => AsyncStorage) }));

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PublicOrganization = { id: number; name: string; logoUrl?: string };
type State = {
    ownerId: string | null;
    selectedOrganization: PublicOrganization | null;
    select: (ownerId: string, organization: PublicOrganization) => void;
    clear: () => void;
};

// Public content preference only; never use this state to authorize a request.
export const usePublicOrganizationStore = create<State>()(persist((set) => ({
    ownerId: null,
    selectedOrganization: null,
    select: (ownerId, organization) => {
        if (!ownerId.trim() || !Number.isSafeInteger(organization.id) || organization.id <= 0 || !organization.name.trim()) {
            throw new Error('Invalid organization selection');
        }
        set({ ownerId, selectedOrganization: { id: organization.id, name: organization.name, logoUrl: organization.logoUrl } });
    },
    clear: () => set({ ownerId: null, selectedOrganization: null }),
}), {
    name: 'amatora-public-organization-choice',
    storage: createJSONStorage(() => AsyncStorage),
    skipHydration: true,
}));

export function publicOrganizationForUser(state: Pick<State, 'ownerId' | 'selectedOrganization'>, appUserId?: string) {
    const choice = state.selectedOrganization;
    return appUserId && state.ownerId === appUserId && choice && Number.isSafeInteger(choice.id) && choice.id > 0 &&
        typeof choice.name === 'string' && choice.name.trim() ? choice : null;
}

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Organization {
    id: number;
    name: string;
    slug: string;
    logoUrl?: string;
}

interface OrganizationState {
    selectedOrganizationId: number;
    organizations: Organization[];
    setSelectedOrganizationId: (id: number) => void;
    setOrganizations: (orgs: Organization[]) => void;
}

const DEFAULT_ORGANIZATIONS: Organization[] = [
    { id: 1, name: 'Havas Futbol Ligasi', slug: 'havas-liga' },
    { id: 2, name: 'Amatora Junior Academy', slug: 'amatora-junior' }
];

export const useOrganizationStore = create<OrganizationState>()(
    persist(
        (set) => ({
            selectedOrganizationId: 1,
            organizations: DEFAULT_ORGANIZATIONS,
            setSelectedOrganizationId: (id: number) => set({ selectedOrganizationId: id }),
            setOrganizations: (orgs: Organization[]) => set({ organizations: orgs }),
        }),
        {
            name: 'hfl-organization-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

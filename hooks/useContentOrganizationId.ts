import { useAuthStore } from '../store/useAuthStore';
import { useOrganizationStore } from '../store/useOrganizationStore';
import { publicOrganizationForUser, usePublicOrganizationStore } from '../store/usePublicOrganizationStore';
import { contentOrganizationId, publicOrganizationOwner } from '../utils/contentOrganization';

export function useContentOrganizationId(): number {
    const { user, isGuest } = useAuthStore();
    const legacyId = useOrganizationStore(state => state.selectedOrganizationId);
    const ownerId = publicOrganizationOwner(user, isGuest);
    const choice = usePublicOrganizationStore(state => publicOrganizationForUser(state, ownerId));
    return contentOrganizationId(user, legacyId, isGuest, choice?.id);
}

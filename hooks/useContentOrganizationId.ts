import { useAuthStore } from '../store/useAuthStore';
import { useOrganizationStore } from '../store/useOrganizationStore';
import { publicOrganizationForUser, usePublicOrganizationStore } from '../store/usePublicOrganizationStore';
import { contentOrganizationId } from '../utils/contentOrganization';

export function useContentOrganizationId(): number {
    const { user, isGuest } = useAuthStore();
    const legacyId = useOrganizationStore(state => state.selectedOrganizationId);
    const choice = usePublicOrganizationStore(state => publicOrganizationForUser(state, user?.appUserId));
    return contentOrganizationId(user, legacyId, isGuest, choice?.id);
}

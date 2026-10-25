export const isPublicViewer = (user: any, isGuest = false): boolean =>
    isGuest || Boolean(user?.role === 'user' && user?.appUserId);

// Content selection never grants membership or organization administration rights.
export function contentOrganizationId(user: any, selectedId: number, isGuest = false, personalChoiceId?: number): number {
    if (!isGuest && user?.role === 'user' && user?.appUserId) {
        if (!Number.isSafeInteger(personalChoiceId) || Number(personalChoiceId) <= 0) {
            throw new Error('Organization selection required');
        }
        return personalChoiceId!;
    }
    const ownId = user?.organizationId || user?.organization_id || user?.organization?.id;
    return !isPublicViewer(user, isGuest) && Number(ownId) > 0 ? Number(ownId) : selectedId;
}

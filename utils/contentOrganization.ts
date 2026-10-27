export const isPublicViewer = (user: any, isGuest = false): boolean =>
    isGuest || Boolean(user?.role === 'user' && user?.appUserId);

// A local browsing preference, never an authenticated identity or membership.
export const publicOrganizationOwner = (user: any, isGuest = false): string | undefined =>
    isGuest ? 'public-guest' : user?.appUserId;

// Content selection never grants membership or organization administration rights.
export function contentOrganizationId(user: any, selectedId: number, isGuest = false, personalChoiceId?: number): number {
    if (isPublicViewer(user, isGuest)) {
        if (!Number.isSafeInteger(personalChoiceId) || Number(personalChoiceId) <= 0) {
            throw new Error('Organization selection required');
        }
        return personalChoiceId!;
    }
    const ownId = user?.organizationId || user?.organization_id || user?.organization?.id;
    return !isPublicViewer(user, isGuest) && Number(ownId) > 0 ? Number(ownId) : selectedId;
}

// Presentation only. This flag never grants backend permissions or changes auth state.
export function isSpectatorProfile(user: any): boolean {
    return user?.role === 'user' && Boolean(user?.appUserId);
}

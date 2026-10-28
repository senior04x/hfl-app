export function profileTabPhoto(user: Record<string, any> | null | undefined): string | undefined {
    const candidate = user?.photo || user?.photo_url || user?.avatar || user?.logo || user?.logo_url;
    if (typeof candidate !== 'string') return undefined;
    try {
        const url = new URL(candidate.trim());
        if (url.protocol === 'https:' && url.hostname && !url.username && !url.password) return url.href;
    } catch { /* Missing or malformed photos retain the system profile symbol. */ }
    return undefined;
}

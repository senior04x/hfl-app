/** Read the JSON payload without including optional metadata appended after it. */
export function isProfileUpdateForPlayer(comment: unknown, playerId: string): boolean {
    if (typeof comment !== 'string' || !playerId) return false;
    const marker = '[PROFILE_UPDATE]';
    const markerIndex = comment.indexOf(marker);
    if (markerIndex < 0) return false;
    const payload = comment.slice(markerIndex + marker.length).trimStart();
    if (!payload.startsWith('{')) return false;
    let depth = 0;
    let quoted = false;
    let escaped = false;
    for (let index = 0; index < payload.length; index++) {
        const char = payload[index];
        if (quoted) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === '"') quoted = false;
        } else if (char === '"') quoted = true;
        else if (char === '{') depth++;
        else if (char === '}' && --depth === 0) {
            try {
                const data = JSON.parse(payload.slice(0, index + 1));
                return String(data.playerId ?? '') === playerId;
            } catch {
                return false;
            }
        }
    }
    return false;
}

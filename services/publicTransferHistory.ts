export interface TransferCareerItem {
    id: string; player_id: string; old_team_name: string; old_team_logo?: string;
    new_team_name: string; new_team_logo?: string; status: 'approved'; created_at: string;
}
export interface TransferCareerPage { items: TransferCareerItem[]; next_cursor: string | null }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cache = new Map<string, { expires: number; page: TransferCareerPage }>();
const pending = new Map<string, Promise<TransferCareerPage>>();
export function loadTransferCareer(playerId: string, after: string | null = null, refresh = false): Promise<TransferCareerPage> {
    if (!uuid.test(playerId) || (after !== null && !uuid.test(after))) return Promise.reject(new Error('Invalid career request'));
    const key = `${playerId}:${after || ''}`;
    if (refresh) cache.delete(key);
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return Promise.resolve(cached.page);
    const active = pending.get(key); if (active) return active;
    const request = (async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        try {
            const response = await fetch('https://xzzyhfyazwohdqqbjiiy.supabase.co/functions/v1/transfer-public-history', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_id: playerId, after }), signal: controller.signal,
            });
            if (!response.ok) throw new Error('Career unavailable');
            const data = await response.json();
            if (!Array.isArray(data?.items) || data.items.length > 20 ||
                !(data.next_cursor === null || (typeof data.next_cursor === 'string' && uuid.test(data.next_cursor))) ||
                data.items.some((item: any) => !item || !uuid.test(item.id) || item.player_id !== playerId || item.status !== 'approved')) {
                throw new Error('Invalid career response');
            }
            const page: TransferCareerPage = data;
            cache.delete(key); cache.set(key, { expires: Date.now() + 300000, page });
            if (cache.size > 100) cache.delete(cache.keys().next().value!);
            return page;
        } catch { throw new Error('Career unavailable'); }
        finally { clearTimeout(timer); }
    })().finally(() => pending.delete(key));
    pending.set(key, request);
    return request;
}

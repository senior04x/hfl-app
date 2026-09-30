export type TransferActor = 'player' | 'captain';
export type TransferParty = 'player' | 'old_team' | 'new_team';
export type TransferDirection = 'all' | 'incoming' | 'outgoing';
export type TransferDecision = 'approved' | 'rejected';
export interface TransferConsent { party: TransferParty; decision: TransferDecision; decided_at: string }
export interface AppTransfer {
    id: string; player_id: string; player_name: string; player_photo?: string; old_team_name: string; new_team_name: string;
    old_team_logo?: string; new_team_logo?: string; reason: string; created_at: string;
    status: 'pending' | TransferDecision; actor_party: TransferParty; consents: TransferConsent[];
}
export interface TransferSession { token: string; expiresAt: number; actor: TransferActor; subjectId: string }
export class TransferApiError extends Error {
    constructor(public status: number) { super('Transfer request failed'); }
}
const endpoint = 'https://xzzyhfyazwohdqqbjiiy.supabase.co/functions/v1/';

// Memory only: sessions are not persisted in AsyncStorage or shared across accounts.
const sessions = new Map<string, TransferSession>();
const sessionKey = (actor: TransferActor, id: string) => `${actor}:${id}`;
export function getTransferSession(actor: TransferActor, id: string): TransferSession | null {
    const key = sessionKey(actor, id), session = sessions.get(key);
    if (!session || session.expiresAt <= Date.now()) { sessions.delete(key); return null; }
    return session;
}
export function clearTransferSession(session: TransferSession) { sessions.delete(sessionKey(session.actor, session.subjectId)); }
export function clearTransferSessions() { sessions.clear(); }

async function post(name: string, body: Record<string, unknown>, token?: string, signal?: AbortSignal) {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    if (signal?.aborted) throw new TransferApiError(0);
    signal?.addEventListener('abort', cancel);
    const timer = setTimeout(cancel, 20000);
    try {
        const response = await fetch(endpoint + name, {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify(body), signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new TransferApiError(response.status);
        return data;
    } catch (error) {
        if (error instanceof TransferApiError) throw error;
        throw new TransferApiError(0);
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
}
export const transferAppService = {
    async verify(actor: TransferActor, subjectId: string, phone: string, code: string): Promise<TransferSession> {
        const data = await post(actor === 'captain' ? 'verify-otp' : 'verify-transfer-player',
            { phone, code, ...(actor === 'captain' ? { team_id: subjectId } : { player_id: subjectId }) });
        const expiresAt = Date.parse(data.expiresAt);
        if (!/^[a-f0-9]{64}$/i.test(data.sessionToken) || !Number.isFinite(expiresAt) || expiresAt <= Date.now()
            || (actor === 'captain' && data.team?.id !== subjectId) || (actor === 'player' && data.playerId !== subjectId)) {
            throw new TransferApiError(500);
        }
        const session = { actor, subjectId, token: data.sessionToken, expiresAt };
        sessions.set(sessionKey(actor, subjectId), session);
        return session;
    },
    async page(session: TransferSession, direction: TransferDirection, after?: string | null, transferId?: string, signal?: AbortSignal): Promise<{ items: AppTransfer[]; next_cursor: string | null }> {
        return post('transfer-app-page', { actor: session.actor, direction, after: after ?? null, transfer_id: transferId ?? null }, session.token, signal);
    },
    async captainPage(session: TransferSession, action: 'context' | 'players', query = '', after?: string | null, signal?: AbortSignal) {
        return post('team-transfer-page', { action, query, after: after ?? null, team_id: session.subjectId }, session.token, signal);
    },
    async decide(session: TransferSession, transfer: AppTransfer, decision: TransferDecision) {
        return post('transfer-consent', { transfer_id: transfer.id, party: transfer.actor_party, decision }, session.token);
    },
    async request(session: TransferSession, playerId: string, reason: string) {
        return post('request-transfer-app', { player_id: playerId, reason: reason.trim() }, session.token);
    },
};

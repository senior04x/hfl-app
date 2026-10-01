import * as SecureStore from 'expo-secure-store';
import { clearTransferSessions, clearTransferSession, getTransferSession, installTransferSession, TransferActor, TransferSession } from './transferAppService';

const INDEX_KEY = 'amatora.transfer.login.index.v1';
const keyFor = (actor: string, id: string) => `amatora.transfer.login.${actor}.${id}`;
let storageQueue: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
    const result = storageQueue.then(task, task);
    storageQueue = result.catch(() => undefined);
    return result;
}
async function removeStoredSessions() {
    const raw = await SecureStore.getItemAsync(INDEX_KEY);
    const keys: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(keys)) {
        for (const key of keys.slice(0, 20)) {
            if (typeof key === 'string' && /^amatora\.transfer\.login\.(player|captain)\.[0-9a-f-]{36}$/i.test(key)) {
                await SecureStore.deleteItemAsync(key);
            }
        }
    }
    await SecureStore.deleteItemAsync(INDEX_KEY);
}
export function clearTransferLoginStorage(): Promise<void> {
    clearTransferSessions();
    return serial(removeStoredSessions);
}
export function saveTransferLoginSessions(input: unknown): Promise<void> {
    return serial(async () => {
        clearTransferSessions();
        await removeStoredSessions();
        if (!Array.isArray(input) || input.length > 20) return;
        const keys: string[] = [];
        try {
            for (const value of input) {
                const session = installTransferSession({ ...value, expiresAt: Date.parse(value?.expiresAt) });
                if (!session) continue;
                const key = keyFor(session.actor, session.subjectId);
                if (!keys.includes(key)) keys.push(key);
                // Record keys first so a failed write can still be cleaned up.
                await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(keys));
                await SecureStore.setItemAsync(key, JSON.stringify(session));
            }
        } catch (error) {
            clearTransferSessions();
            await removeStoredSessions();
            throw error;
        }
    });
}

export function restoreTransferLoginSession(actor: TransferActor, subjectId: string): Promise<TransferSession | null> {
    return serial(async () => {
        const cached = getTransferSession(actor, subjectId);
        if (cached) return cached;
        if (!/^[0-9a-f-]{36}$/i.test(subjectId)) return null;
        const key = keyFor(actor, subjectId);
        const raw = await SecureStore.getItemAsync(key);
        if (!raw) return null;
        try {
            const value = JSON.parse(raw);
            if (value.actor !== actor || value.subjectId !== subjectId) return null;
            const session = installTransferSession(value);
            if (!session) await SecureStore.deleteItemAsync(key);
            return session;
        } catch { await SecureStore.deleteItemAsync(key); return null; }
    });
}
export function revokeTransferLoginSession(session: TransferSession): Promise<void> {
    clearTransferSession(session);
    return serial(() => SecureStore.deleteItemAsync(keyFor(session.actor, session.subjectId)));
}

import * as SecureStore from 'expo-secure-store';
import { clearTransferSessions, installTransferSession } from './transferAppService';

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

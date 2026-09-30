import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@amatora_calendar_cache_v1';
const MAX_BYTES = 128 * 1024;
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

// One bounded snapshot; never reuse data for another user, organization or filter.
export function createCalendarCache(storage: Pick<typeof AsyncStorage, 'getItem' | 'setItem'>) {
    return {
        async read(scope: string): Promise<any[] | null> {
            try {
                const raw = await storage.getItem(KEY);
                if (!raw || raw.length * 2 > MAX_BYTES) return null;
                const cached = JSON.parse(raw);
                const age = Date.now() - cached.savedAt;
                if (cached.scope !== scope || !Number.isFinite(age) || age < 0 || age > MAX_AGE) return null;
                if (!Array.isArray(cached.data) || !cached.data.every((group: any) =>
                    group && typeof group.id === 'string' && Array.isArray(group.tournaments) &&
                    group.tournaments.every((competition: any) => competition && Array.isArray(competition.matches))
                )) return null;
                return cached.data;
            } catch {
                return null;
            }
        },
        async write(scope: string, data: any[]): Promise<void> {
            try {
                const raw = JSON.stringify({ scope, data, savedAt: Date.now() });
                if (raw.length * 2 <= MAX_BYTES) await storage.setItem(KEY, raw);
            } catch {
                // A storage failure must not discard a successful network result.
            }
        },
    };
}

export const calendarCache = createCalendarCache(AsyncStorage);

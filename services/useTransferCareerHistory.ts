import { useCallback, useEffect, useRef, useState } from 'react';
import { loadTransferCareer, TransferCareerItem } from './publicTransferHistory';
export function useTransferCareerHistory(playerId: string) {
    const [items, setItems] = useState<TransferCareerItem[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const generation = useRef(0), busy = useRef(false);
    const load = useCallback(async (after: string | null = null, refresh = false) => {
        if (busy.current) return;
        const version = generation.current;
        busy.current = true; setLoading(true); setError(false);
        try {
            const page = await loadTransferCareer(playerId, after, refresh);
            if (version !== generation.current) return;
            setItems(old => after ? [...old, ...page.items.filter(item => !old.some(previous => previous.id === item.id))] : page.items);
            setCursor(page.next_cursor);
        } catch { if (version === generation.current) setError(true); }
        finally { if (version === generation.current) { busy.current = false; setLoading(false); } }
    }, [playerId]);
    useEffect(() => {
        generation.current++; busy.current = false; setItems([]); setCursor(null);
        void load();
        return () => { generation.current++; };
    }, [load]);
    return { items, loading, error, cursor, more: () => load(cursor), reload: () => load(null, true) };
}

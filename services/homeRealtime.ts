export function getHomeMatchEventFilters(matchIds: string[]): string[] {
    const ids = [...new Set(matchIds)].filter(id => /^[a-zA-Z0-9_-]+$/.test(id)).sort();
    const filters: string[] = [];
    for (let offset = 0; offset < ids.length; offset += 100) {
        filters.push(`match_id=in.(${ids.slice(offset, offset + 100).join(',')})`);
    }
    return filters;
}

/** Coalesce event bursts; never overlap refreshes or apply a result after disposal. */
export function createHomeStoryRefresh<T>(
    fetch: () => Promise<T>,
    apply: (data: T) => void,
    onError: (error: unknown) => void,
    delayMs = 500,
) {
    let disposed = false;
    let running = false;
    let pending = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
        timer = undefined;
        if (disposed || running) return;
        pending = false;
        running = true;
        try {
            const data = await fetch();
            if (!disposed) apply(data);
        } catch (error) {
            if (!disposed) onError(error);
        } finally {
            running = false;
            if (!disposed && pending) timer = setTimeout(run, delayMs);
        }
    };

    return {
        schedule() {
            if (disposed) return;
            pending = true;
            if (!running && timer === undefined) timer = setTimeout(run, delayMs);
        },
        dispose() {
            disposed = true;
            if (timer !== undefined) clearTimeout(timer);
        },
    };
}

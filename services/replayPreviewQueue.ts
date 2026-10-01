type Request = { grant: () => void; cancelled: boolean };
let active: Request | null = null;
const waiting: Request[] = [];
function next() {
    if (active) return;
    while (waiting.length) {
        const request = waiting.shift()!;
        if (request.cancelled) continue;
        active = request;
        request.grant();
        return;
    }
}
/** Only one Android preview decoder can exist at a time. */
export function acquireReplayPreview(grant: () => void): () => void {
    const request = { grant, cancelled: false };
    waiting.push(request);
    next();
    return () => {
        if (request.cancelled) return;
        request.cancelled = true;
        if (active === request) active = null;
        const index = waiting.indexOf(request);
        if (index >= 0) waiting.splice(index, 1);
        next();
    };
}

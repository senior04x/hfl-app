export function competitionSeason(start: unknown, end?: unknown): string {
    const year = (value: unknown) => {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value) || !Number.isFinite(Date.parse(value))) return null;
        return Number(value.slice(0, 4));
    };
    const first = year(start);
    if (first === null) return '';
    const last = year(end);
    return `${first}/${last !== null && last >= first ? last : first + 1}`;
}

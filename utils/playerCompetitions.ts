export const isFinishedMatch = (m: any) => ['finished', 'completed', 'ended', 'tugadi'].includes(String(m.status || '').toLowerCase());
export const playerGoals = (m: any) => (m.playerEvents || []).filter((e: any) => ['goal', 'penalty_goal'].includes(String(e.event_type).toLowerCase())).length;
export function groupPlayerMatches(matches: any[]) {
    const groups = new Map<string, { key: string; title: string; tournament: boolean; goals: number; data: any[] }>();
    const seen = new Set<string>();
    for (const match of matches) {
        const id = String(match.id || match._id);
        if (seen.has(id)) continue;
        seen.add(id);
        const tournament = match.tournament_id != null;
        const key = tournament ? 'tournament:' + match.tournament_id : 'league:' + (match.organization_id || '') + ':' + (match.league || 'unknown');
        if (!groups.has(key)) groups.set(key, { key, tournament, title: tournament ? (match.tournament?.name || 'Turnir #' + match.tournament_id) : (match.league || 'Liga'), goals: 0, data: [] });
        const group = groups.get(key)!;
        group.data.push(match);
        if (isFinishedMatch(match)) group.goals += playerGoals(match);
    }
    return [...groups.values()];
}

import { supabase } from './supabase';

const MATCH_FIELDS = 'id,home_team_id,away_team_id,home_score,away_score,status,match_date,match_time,round,stage,league,tournament_id,organization_id';
const cache = new Map<string, { time: number; data: any[] }>();
const pending = new Map<string, Promise<any[]>>();
async function pages(query: () => any): Promise<any[]> {
    const rows: any[] = [];
    for (let offset = 0; ; offset += 500) {
        const { data, error } = await query().order('id').range(offset, offset + 499);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < 500) return rows;
    }
}
async function byIds(table: string, columns: string, ids: any[]): Promise<any[]> {
    const unique = [...new Set(ids.filter(id => id != null).map(String))];
    const result: any[] = [];
    for (let start = 0; start < unique.length; start += 100) {
        result.push(...await pages(() => supabase.from(table).select(columns).in('id', unique.slice(start, start + 100))));
    }
    return result;
}
export async function getPlayerHistory(id: string, refresh = false): Promise<any[]> {
    if (!id) return [];
    const key = String(id);
    if (pending.has(key)) return pending.get(key)!;
    const saved = cache.get(key);
    if (!refresh && saved && Date.now() - saved.time < 300000) return saved.data;
    const request = (async () => {
        const [{ data: player, error }, events] = await Promise.all([
            supabase.from('applications').select('team_id').eq('id', id).single(),
            pages(() => supabase.from('match_events').select('id,match_id,event_type,minute,team_id').eq('player_id', id)),
        ]);
        if (error) throw error;
        const currentMatches = player?.team_id ? await pages(() => supabase.from('matches').select(MATCH_FIELDS)
            .or('home_team_id.eq.' + player.team_id + ',away_team_id.eq.' + player.team_id)) : [];
        const matchMap = new Map(currentMatches.map(m => [String(m.id), m]));
        const historical = await byIds('matches', MATCH_FIELDS, events.map(e => e.match_id).filter(id => !matchMap.has(String(id))));
        historical.forEach(m => matchMap.set(String(m.id), m));
        const allMatches = [...matchMap.values()];
        const [teams, tournaments] = await Promise.all([
            byIds('teams', 'id,name,logo_url', allMatches.flatMap(m => [m.home_team_id, m.away_team_id])),
            byIds('tournaments', 'id,name,logo_url', allMatches.map(m => m.tournament_id)),
        ]);
        const teamMap = new Map(teams.map(t => [String(t.id), t]));
        const tournamentMap = new Map(tournaments.map(t => [String(t.id), t]));
        const eventMap = new Map<string, any[]>();
        const seen = new Set<string>();
        events.forEach(event => {
            if (seen.has(String(event.id))) return;
            seen.add(String(event.id));
            const matchId = String(event.match_id);
            eventMap.set(matchId, [...(eventMap.get(matchId) || []), event]);
        });
        const result = allMatches.sort((a, b) => String(b.match_date || '').localeCompare(String(a.match_date || ''))).map(m => ({
            ...m, _id: m.id,
            homeTeamName: teamMap.get(String(m.home_team_id))?.name,
            homeTeamLogo: teamMap.get(String(m.home_team_id))?.logo_url,
            awayTeamName: teamMap.get(String(m.away_team_id))?.name,
            awayTeamLogo: teamMap.get(String(m.away_team_id))?.logo_url,
            tournament: tournamentMap.get(String(m.tournament_id)),
            playerEvents: eventMap.get(String(m.id)) || [],
        }));
        if (cache.size >= 30) cache.delete(cache.keys().next().value!);
        cache.set(key, { time: Date.now(), data: result });
        return result;
    })();
    pending.set(key, request);
    try { return await request; } finally { pending.delete(key); }
}

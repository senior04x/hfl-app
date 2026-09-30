import { supabase } from './supabase';

type Scope = { tournament: boolean; id: string | number | null; name: string; organizationId?: string | number; teamIds: any[] };
async function pages(query: () => any): Promise<any[]> {
    const rows: any[] = [];
    for (let offset = 0; ; offset += 500) {
        const { data, error } = await query().order('id').range(offset, offset + 499);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < 500) return rows;
    }
}
async function batches(ids: any[], query: (ids: string[]) => any) {
    const unique = [...new Set(ids.filter(id => id != null).map(String))];
    const result: any[] = [];
    for (let i = 0; i < unique.length; i += 100) result.push(...await pages(() => query(unique.slice(i, i + 100))));
    return result;
}
export async function loadCompetitionPlayerStats(scope: Scope) {
    if (scope.tournament ? scope.id == null : !scope.name.trim()) throw new Error('Competition is not resolved');
    const fields = 'id,first_name,last_name,photo_url,team_id,status,is_archived,phone,position';
    const roster = await batches(scope.teamIds, ids => supabase.from('applications').select(fields).eq('status', 'approved').in('team_id', ids));
    const activePlayers = roster.filter(p => !p.is_archived);
    const matches = await pages(() => {
        let query = supabase.from('matches').select('id,home_team_id,away_team_id,home_formation,away_formation,status')
            .in('status', ['finished', 'completed']);
        if (scope.tournament) query = query.eq('tournament_id', scope.id);
        else {
            // Keep league totals based on the existing team/roster behavior.
            const teamIds = [...new Set(scope.teamIds.filter(id => id != null).map(String))];
            if (!teamIds.length) return query.in('id', []);
            query = query.or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`);
        }
        return query;
    });
    const events = await batches(scope.tournament ? matches.map(m => m.id) : activePlayers.map(p => p.id), ids => supabase.from('match_events')
        .select('id,player_id,team_id,match_id,event_type').in(scope.tournament ? 'match_id' : 'player_id', ids));
    const playerMap = new Map(activePlayers.map(p => [String(p.id), p]));
    // Historical scorers remain in the ranking after a transfer or archiving.
    const missing = (scope.tournament ? events : []).map(e => e.player_id).filter(id => id != null && !playerMap.has(String(id)));
    const historical = await batches(missing, ids => supabase.from('applications').select(fields).in('id', ids));
    historical.forEach(p => playerMap.set(String(p.id), p));
    const eventTeam = new Map<string, any>();
    events.forEach(e => { if (e.player_id != null && e.team_id != null) eventTeam.set(String(e.player_id), e.team_id); });
    const players = [...playerMap.values()].map(p => ({ ...p, team_id: scope.tournament ? (eventTeam.get(String(p.id)) ?? p.team_id) : p.team_id }));
    const teams = await batches(players.map(p => p.team_id), ids => supabase.from('teams').select('id,name').in('id', ids));
    return { players, matches, events, teams };
}

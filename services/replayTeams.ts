import { supabase } from './supabase';

export async function enrichReplayTeams(events: any[]): Promise<any[]> {
    const ids = [...new Set(events.flatMap(event => [event.match?.home_team_id, event.match?.away_team_id]).filter(id => id != null).map(String))];
    const teams = new Map<string, any>();
    for (let offset = 0; offset < ids.length; offset += 100) {
        const { data, error } = await supabase.from('teams').select('id,name,logo_url').in('id', ids.slice(offset, offset + 100));
        if (error) throw error;
        (data || []).forEach(team => teams.set(String(team.id), team));
    }
    return events.map(event => ({ ...event, match: { ...event.match,
        home_team: teams.get(String(event.match?.home_team_id)) || event.match?.home_team,
        away_team: teams.get(String(event.match?.away_team_id)) || event.match?.away_team,
    } }));
}

import { supabase } from './supabase';
import { competitionSeason } from '../utils/competitionSeason';

export async function loadMatchCompetitionMetadata(matches: any[]): Promise<Map<string, any>> {
    const tournaments = new Map<string, any>();
    const leagues = new Map<string, any>();
    const tournamentIds = [...new Set(matches.filter(m => m.tournament_id != null).map(m => String(m.tournament_id)))];
    const leagueNamesByOrg = new Map<string, Set<string>>();
    for (const match of matches) {
        if (match.tournament_id != null || !match.league || match.organization_id == null) continue;
        const org = String(match.organization_id);
        const names = leagueNamesByOrg.get(org) || new Set<string>();
        names.add(match.league);
        leagueNamesByOrg.set(org, names);
    }
    for (let offset = 0; offset < tournamentIds.length; offset += 100) {
        const { data, error } = await supabase.from('tournaments')
            .select('id,name,logo_url,start_date,end_date').in('id', tournamentIds.slice(offset, offset + 100));
        if (error) throw error;
        for (const row of data || []) tournaments.set(String(row.id), row);
    }
    for (const [org, namesSet] of leagueNamesByOrg) {
        const names = [...namesSet];
        for (let offset = 0; offset < names.length; offset += 100) {
            const { data, error } = await supabase.from('leagues')
                .select('id,name,organization_id,start_date').eq('organization_id', org).in('name', names.slice(offset, offset + 100));
            if (error) throw error;
            for (const row of data || []) leagues.set(`${org}:${row.name}`, row);
        }
    }
    return new Map(matches.map(match => {
        const tournament = match.tournament_id != null;
        const record = tournament ? tournaments.get(String(match.tournament_id)) : leagues.get(`${match.organization_id}:${match.league}`);
        return [String(match.id || match._id), {
            competitionSeason: competitionSeason(record?.start_date, record?.end_date),
            competitionName: record?.name || (tournament ? `Turnir #${match.tournament_id}` : match.league || ''),
            ...(tournament ? { tournament: record } : {}),
        }];
    }));
}

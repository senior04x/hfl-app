import { supabase } from './supabase';

export type MatchFeed = 'live' | 'upcoming' | 'results';
export type MatchCursor = { date: string | null; time: string | null; id: string } | null;
const statuses: Record<MatchFeed, string[]> = {
    live: ['live','first_half','second_half','half_time','halftime','ongoing','in_progress','1st_half','2nd_half','1-taym','2-taym','tanaffus'],
    upcoming: ['scheduled','upcoming','pending','rejalashtirilgan'],
    results: ['finished','completed','ended','tugadi'],
};
function today() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
async function fetchPage(orgId: number | null, feed: MatchFeed, cursor: MatchCursor) {
    const ascending = feed === 'upcoming';
    let query = supabase.from('matches').select('id,organization_id,tournament_id,league,home_team_id,away_team_id,home_score,away_score,status,match_date,match_time')
        .in('status', statuses[feed]).order('match_date', { ascending, nullsFirst: false })
        .order('match_time', { ascending, nullsFirst: false })
        .order('id', { ascending }).limit(21);
    if (orgId !== null) query = query.eq('organization_id', orgId);
    if (feed === 'upcoming') query = query.gte('match_date', today());
    if (cursor) {
        if (!/^[0-9a-f-]{36}$/i.test(cursor.id)) throw new Error('Invalid match cursor');
        query = query.or(matchCursorFilter(cursor, ascending));
    }
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []).slice(0,20);
    const teamIds = [...new Set(rows.flatMap(m => [m.home_team_id,m.away_team_id]).filter(Boolean))];
    const orgIds = [...new Set(rows.map(m => m.organization_id).filter(id => id != null))];
    const tournamentIds = [...new Set(rows.map(m => m.tournament_id).filter(id => id != null))];
    const [teams, organizations, tournaments] = await Promise.all([
        teamIds.length ? supabase.from('teams').select('id,name,logo_url').in('id',teamIds) : {data:[],error:null},
        orgIds.length ? supabase.from('organizations').select('id,name').in('id',orgIds) : {data:[],error:null},
        tournamentIds.length ? supabase.from('tournaments').select('id,name').in('id',tournamentIds) : {data:[],error:null},
    ]);
    for (const response of [teams,organizations,tournaments]) if (response.error) throw response.error;
    const teamMap = new Map((teams.data || []).map(t => [String(t.id),t]));
    const orgMap = new Map((organizations.data || []).map(o => [String(o.id),o.name]));
    const tournamentMap = new Map((tournaments.data || []).map(t => [String(t.id),t.name]));
    const last = rows[rows.length-1];
    return { rows: rows.map(m => ({...m,homeTeam:teamMap.get(String(m.home_team_id)),awayTeam:teamMap.get(String(m.away_team_id)),
        organizationName:orgMap.get(String(m.organization_id)) || 'AMATORA',
        competitionName:tournamentMap.get(String(m.tournament_id)) || m.league || 'AMATORA'})),
        cursor: data && data.length > 20 && last ? {id:String(last.id),date:last.match_date ?? null,time:last.match_time ?? null} : null };
}

export function matchCursorFilter(cursor: NonNullable<MatchCursor>, ascending: boolean) {
    const equals: string[] = [], alternatives: string[] = [];
    const branch = (condition: string) => equals.length ? `and(${[...equals,condition].join(',')})` : condition;
    for (const [field,value] of [['match_date',cursor.date],['match_time',cursor.time],['id',cursor.id]]) {
        if (value == null) { equals.push(`${field}.is.null`); continue; }
        const quoted = `"${value.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"`;
        alternatives.push(branch(`${field}.${ascending ? 'gt' : 'lt'}.${quoted}`));
        if (field !== 'id') alternatives.push(branch(`${field}.is.null`));
        equals.push(`${field}.eq.${quoted}`);
    }
    return alternatives.join(',');
}

const firstPages = new Map<string,{expires:number;request:ReturnType<typeof fetchPage>}>();
export function invalidateSpectatorMatchPage(orgId:number|null, feed:MatchFeed) {
    firstPages.delete(`${orgId ?? 'all'}:${feed}:${today()}`);
}
export function loadSpectatorMatches(orgId:number|null, feed:MatchFeed, cursor:MatchCursor=null, refresh=false) {
    if (cursor) return fetchPage(orgId,feed,cursor);
    const key = `${orgId ?? 'all'}:${feed}:${today()}`;
    const cached = firstPages.get(key);
    if (!refresh && cached && cached.expires > Date.now()) return cached.request;
    const request = fetchPage(orgId,feed,null);
    const entry = {expires:Infinity,request}; firstPages.set(key,entry);
    if (firstPages.size > 12) firstPages.delete(firstPages.keys().next().value!);
    void request.then(() => {if(firstPages.get(key)===entry)entry.expires=Date.now()+30_000;},
        () => {if(firstPages.get(key)===entry)firstPages.delete(key);});
    return request;
}

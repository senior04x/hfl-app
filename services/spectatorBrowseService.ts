import { supabase } from './supabase';

const PAGE_SIZE = 20;
type Cursor = { tournament: string | null | false; league: string | null | false };
export const firstCompetitionCursor: Cursor = { tournament: null, league: null };
const competitionFields = 'id,name,logo_url,organization_id';

async function competitionPage(table: 'leagues' | 'tournaments', orgId: number | null, cursor: string | null | false) {
    if (cursor === false) return { rows: [], cursor: false as const };
    let query = supabase.from(table).select(competitionFields + (table === 'leagues' ? ',is_active' : ',status'))
        .order('id', { ascending: false }).limit(PAGE_SIZE + 1);
    if (table === 'leagues') query = query.or('is_active.is.null,is_active.eq.true');
    else query = query.or('status.is.null,and(status.neq.archived,status.neq.inactive)');
    if (orgId !== null) query = query.eq('organization_id', orgId);
    if (cursor !== null) query = query.lt('id', cursor);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []).slice(0, PAGE_SIZE).map((r: any) => ({ ...r, is_tournament: table === 'tournaments' }));
    return { rows, cursor: (data?.length || 0) > PAGE_SIZE ? String(rows[rows.length - 1].id) : false as const };
}

async function fetchSpectatorCompetitions(orgId: number | null, cursor: Cursor) {
    const [tournaments, leagues] = await Promise.all([
        competitionPage('tournaments', orgId, cursor.tournament),
        competitionPage('leagues', orgId, cursor.league),
    ]);
    const rows = [...tournaments.rows, ...leagues.rows];
    const ids = [...new Set(rows.map(r => r.organization_id).filter(id => id != null))];
    const organizations = ids.length
        ? await supabase.from('organizations').select('id,name').in('id', ids)
        : { data: [], error: null };
    if (organizations.error) throw organizations.error;
    const names = new Map((organizations.data || []).map(o => [String(o.id), o.name]));
    return { rows: rows.map(r => ({ ...r, organizationName: names.get(String(r.organization_id)) || 'AMATORA' })),
        cursor: { tournament: tournaments.cursor, league: leagues.cursor } };
}

const firstPages = new Map<string, { expires: number; request: ReturnType<typeof fetchSpectatorCompetitions> }>();
export function loadSpectatorCompetitions(orgId: number | null, cursor: Cursor = firstCompetitionCursor, refresh = false) {
    if (cursor.tournament !== null || cursor.league !== null) return fetchSpectatorCompetitions(orgId, cursor);
    const key = orgId === null ? 'all' : String(orgId);
    const cached = firstPages.get(key);
    if (!refresh && cached && cached.expires > Date.now()) return cached.request;
    const request = fetchSpectatorCompetitions(orgId, cursor);
    const entry = { expires: Infinity, request };
    firstPages.set(key, entry);
    if (firstPages.size > 8) firstPages.delete(firstPages.keys().next().value!);
    void request.then(() => { if (firstPages.get(key) === entry) entry.expires = Date.now() + 60_000; },
        () => { if (firstPages.get(key) === entry) firstPages.delete(key); });
    return request;
}

export async function loadSpectatorOrganizations(cursor: number | null = null) {
    let query = supabase.from('organizations').select('id,name').order('id', { ascending: true }).limit(PAGE_SIZE + 1);
    if (cursor !== null) query = query.gt('id', cursor);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []).slice(0, PAGE_SIZE);
    return { rows, cursor: (data?.length || 0) > PAGE_SIZE ? Number(rows[rows.length - 1].id) : false as const };
}

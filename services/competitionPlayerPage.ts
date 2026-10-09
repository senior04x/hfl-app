import { supabase } from './supabase';

export const PLAYER_PAGE_SIZE = 20;
export type PlayerPageScope = { tournament: boolean; id: string | number | null; teamIds: string[] };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapPlayer(p: any) {
    const stats = { goals: Number(p.goals), assists: Number(p.assists), yellowCards: Number(p.yellow),
        redCards: Number(p.red), matchesPlayed: Number(p.matches_played), rating: Number(p.rating) };
    return { id: p.id, _id: p.id, firstName: p.first_name || "O'yinchi", lastName: p.last_name || '',
        photo: p.photo_url || '', team_id: p.team_id, teamName: p.team_name || 'Jamoa',
        rank: Number(p.rank), ...stats, stats };
}

export async function loadCompetitionPlayerPage(scope: PlayerPageScope, stat: string, search: string,
    offset = 0, viewerId?: string) {
    if (scope.tournament && scope.id == null) throw new Error('Competition is not resolved');
    if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Invalid ranking offset');
    const { data, error } = await supabase.rpc('competition_player_page_v1', {
        p_tournament: scope.tournament, p_competition_id: scope.id == null ? null : String(scope.id),
        p_team_ids: [...new Set(scope.teamIds)], p_stat: stat, p_search: search.trim().slice(0, 100),
        p_offset: offset, p_limit: PLAYER_PAGE_SIZE,
        p_viewer_id: viewerId && uuid.test(viewerId) ? viewerId : null,
    });
    // Do not hide permission, SQL, timeout or network failures behind an expensive full fetch.
    if (error?.code === 'PGRST202') return null;
    if (error) throw error;
    if (!Array.isArray(data?.players) || data.players.length > PLAYER_PAGE_SIZE || typeof data.hasMore !== 'boolean'
        || typeof data.snapshot !== 'string') {
        throw new Error('Invalid ranking response');
    }
    return { players: data.players.map(mapPlayer), hasMore: data.hasMore, snapshot: data.snapshot,
        viewer: data.viewer ? mapPlayer(data.viewer) : null };
}

// A synchronous request gate also prevents double taps before React renders disabled=true.
export function createPlayerPageGate() {
    let generation = 0;
    let busy = false;
    return {
        reset() { generation += 1; busy = false; },
        begin() { if (busy) return null; busy = true; return generation; },
        current(token: number) { return generation === token; },
        finish(token: number) { if (generation === token) busy = false; },
    };
}

import { supabase } from './supabase';

export async function organizationPage(page = 0) {
    const { data, error } = await supabase.from('organizations')
        .select('id,name,slug,logo_url').order('id').range(page * 20, page * 20 + 20);
    if (error) throw error;
    return { rows: (data || []).slice(0, 20), more: (data || []).length > 20 };
}

export async function organizationCompetitions(orgId: number, page = 0) {
    const start = page * 20;
    const results = await Promise.all([
        supabase.from('leagues').select('id,name,organization_id,logo_url,is_active', { count: 'exact' })
            .eq('organization_id', orgId).or('is_active.eq.true,is_active.is.null').order('id').range(start,start+20),
        supabase.from('tournaments').select('id,name,organization_id,logo_url,status', { count: 'exact' })
            .eq('organization_id',orgId).or('status.is.null,and(status.neq.archived,status.neq.inactive)')
            .order('id').range(start,start+20),
        supabase.from('teams').select('id',{ count:'exact',head:true }).eq('organization_id',orgId),
    ]);
    for (const result of results) if (result.error) throw result.error;
    return {
        rows: [...(results[0].data || []).slice(0,20).map(row=>({...row,is_tournament:false})),
            ...(results[1].data || []).slice(0,20).map(row=>({...row,is_tournament:true}))],
        more: results.slice(0,2).some(result=>(result.data || []).length>20),
        total: (results[0].count || 0)+(results[1].count || 0), teams:results[2].count || 0,
    };
}

export function resolveMatchAssist(goal: any, events: any[]): any | null {
    if (!String(goal.event_type || goal.type || '').toLowerCase().includes('goal')) return null;
    const assists = events.filter(event => String(event.event_type || event.type || '').toLowerCase().includes('assist'));
    const linked = assists.filter(event => event.goal_event_id != null && String(event.goal_event_id) === String(goal.id));
    if (linked.length === 1) return linked[0];
    if (goal.minute == null || goal.team_id == null) return null;
    const sameMoment = (event: any) => event.minute != null && event.team_id != null &&
        Number(event.minute) === Number(goal.minute) && String(event.team_id) === String(goal.team_id);
    const goals = events.filter(event => String(event.event_type || event.type || '').toLowerCase().includes('goal') && sameMoment(event));
    const candidates = assists.filter(event => sameMoment(event) && event.goal_event_id == null);
    return goals.length === 1 && candidates.length === 1 ? candidates[0] : null;
}

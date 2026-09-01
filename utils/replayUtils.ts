export interface ReplayEventItem {
  id?: string;
  minute?: number | string;
  replay_video_url?: string;
  video_url?: string;
  replay_url?: string;
  video?: string;
  event_type?: string;
  type?: string;
  rawType?: string;
  team_id?: string;
  teamId?: string;
  player_id?: string;
  playerId?: string;
  playerName?: string;
  player_name?: string;
  player?: any;
  created_at?: string;
  [key: string]: any;
}

/**
 * Filters strictly for authentic goals with replay videos and deduplicates by minute, team, player, and video URL
 */
export function getDeduplicatedGoalReplays(events: ReplayEventItem[]): ReplayEventItem[] {
  if (!events || !Array.isArray(events)) return [];

  // 1. Strictly filter for genuine goals with replay videos (excluding assists, cards, fouls)
  const goalEvents = events.filter((e) => {
    const evType = String(e.type || e.rawType || e.event_type || '').toLowerCase();
    const hasVideo = !!(e.replay_video_url || e.video_url || e.replay_url || e.video);
    const isGoal = evType === 'goal' || evType.includes('goal');
    const notCardOrAssist = !evType.includes('yellow') && !evType.includes('red') && !evType.includes('assist');
    return hasVideo && isGoal && notCardOrAssist;
  });

  // 2. Deduplicate by (minute + team + player) and by video URL
  const dedupMap = new Map<string, ReplayEventItem>();
  goalEvents.forEach((ev) => {
    const min = Number(ev.minute) || 0;
    const team = String(ev.team_id || ev.teamId || '');
    const player = String(ev.playerId || ev.player_id || ev.playerName || ev.player_name || '');
    const video = String(ev.replay_video_url || ev.video_url || ev.replay_url || ev.video || '').split('?')[0];

    const primaryKey = `${min}_${team}_${player}`;
    const existing = dedupMap.get(primaryKey);

    if (!existing) {
      let isDuplicateVideo = false;
      for (const item of dedupMap.values()) {
        const itemVideo = String(item.replay_video_url || item.video_url || item.replay_url || item.video || '').split('?')[0];
        if (itemVideo && itemVideo === video) {
          isDuplicateVideo = true;
          break;
        }
      }
      if (!isDuplicateVideo) {
        dedupMap.set(primaryKey, ev);
      }
    } else {
      const existingTime = new Date(existing.created_at || 0).getTime();
      const currentTime = new Date(ev.created_at || 0).getTime();
      if (currentTime > existingTime) {
        dedupMap.set(primaryKey, ev);
      }
    }
  });

  return Array.from(dedupMap.values());
}

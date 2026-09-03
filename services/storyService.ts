import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoryGroup, StoryMediaItem } from '../components/MatchStoriesTray';
import { formatShortTeamName } from '../utils/stringUtils';
import { apiService, supabase } from './apiService';

const STORAGE_KEY = '@amatora_viewed_stories';
const LIKES_STORAGE_KEY = '@amatora_story_likes_v2';
const VIEWS_STORAGE_KEY = '@amatora_story_views_v2';
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export const storyService = {
  /**
   * Formats a timestamp into a relative time string (e.g., '15 daq. oldin', '3 soat oldin')
   */
  formatRelativeTime: (createdAtStr?: string): string => {
    if (!createdAtStr) return 'Hozirgina';
    try {
      const createdTime = new Date(createdAtStr).getTime();
      if (isNaN(createdTime)) return 'Hozirgina';
      const now = Date.now();
      const diffMs = Math.max(0, now - createdTime);
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 1) return 'Hozirgina';
      if (diffMinutes < 60) return `${diffMinutes} daq. oldin`;
      if (diffHours < 24) return `${diffHours} soat oldin`;
      return `${diffDays} kun oldin`;
    } catch {
      return 'Hozirgina';
    }
  },

  /**
   * Checks whether a story is expired (either past expiresAt or older than 48 hours).
   */
  isStoryExpired: (createdAtStr?: string, expiresAtStr?: string): boolean => {
    if (expiresAtStr) {
      try {
        const expiresTime = new Date(expiresAtStr).getTime();
        if (!isNaN(expiresTime)) {
          return Date.now() > expiresTime;
        }
      } catch {}
    }
    if (!createdAtStr) return false;
    try {
      const createdTime = new Date(createdAtStr).getTime();
      if (isNaN(createdTime)) return false;
      return (Date.now() - createdTime) > FORTY_EIGHT_HOURS_MS;
    } catch {
      return false;
    }
  },

  /**
   * Retrieves all story IDs that the user has viewed.
   */
  getViewedStoryIds: async (): Promise<string[]> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      return [];
    } catch (error) {
      console.warn('Error reading @amatora_viewed_stories from AsyncStorage:', error);
      return [];
    }
  },

  /**
   * Marks a specific story ID as viewed in persistent storage.
   */
  markStoryAsViewed: async (storyId: string): Promise<string[]> => {
    if (!storyId) return [];
    try {
      const currentViewed = await storyService.getViewedStoryIds();
      if (!currentViewed.includes(storyId)) {
        const updated = [...currentViewed, storyId];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      }
      return currentViewed;
    } catch (error) {
      console.warn('Error marking story as viewed in AsyncStorage:', error);
      return [];
    }
  },

  /**
   * Checks if a story has already been viewed.
   */
  isStoryViewed: async (storyId: string): Promise<boolean> => {
    try {
      const viewedIds = await storyService.getViewedStoryIds();
      return viewedIds.includes(storyId);
    } catch {
      return false;
    }
  },

  /**
   * Clears viewed stories history.
   */
  clearViewedStories: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Error clearing viewed stories:', error);
    }
  },

  /**
   * Retrieves persistent like and view statistics for a given story item
   */
  getStoryInteractions: async (
    storyId: string,
    userId?: string
  ): Promise<{ likesCount: number; viewsCount: number; isLiked: boolean }> => {
    try {
      const [likesRaw, viewsRaw] = await Promise.all([
        AsyncStorage.getItem(LIKES_STORAGE_KEY),
        AsyncStorage.getItem(VIEWS_STORAGE_KEY),
      ]);

      const likesMap = likesRaw ? JSON.parse(likesRaw) : {};
      const viewsMap = viewsRaw ? JSON.parse(viewsRaw) : {};

      const storyLikes: string[] = Array.isArray(likesMap[storyId]) ? likesMap[storyId] : [];
      const storyViews: number = typeof viewsMap[storyId] === 'number' ? viewsMap[storyId] : 0;

      const isLiked = Boolean(userId && storyLikes.includes(String(userId)));
      const likesCount = storyLikes.length;

      return {
        likesCount,
        viewsCount: Math.max(storyViews, likesCount),
        isLiked,
      };
    } catch (e) {
      console.warn('Error getting story interactions:', e);
      return { likesCount: 0, viewsCount: 0, isLiked: false };
    }
  },

  /**
   * Toggles a like for a story for the current user.
   * Real database sync + instant optimistic local persistence.
   */
  toggleLikeStory: async (
    storyId: string,
    userId: string
  ): Promise<{ isLiked: boolean; likesCount: number }> => {
    if (!storyId || !userId) return { isLiked: false, likesCount: 0 };
    try {
      const userIdStr = String(userId);
      const likesRaw = await AsyncStorage.getItem(LIKES_STORAGE_KEY);
      const likesMap = likesRaw ? JSON.parse(likesRaw) : {};
      const userList: string[] = Array.isArray(likesMap[storyId]) ? [...likesMap[storyId]] : [];

      const userIndex = userList.indexOf(userIdStr);
      let isLiked = false;

      if (userIndex >= 0) {
        // Unlike
        userList.splice(userIndex, 1);
        isLiked = false;
      } else {
        // Like
        userList.push(userIdStr);
        isLiked = true;
      }

      likesMap[storyId] = userList;
      await AsyncStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likesMap));

      // Attempt background Supabase broadcast / sync if table exists
      try {
        await supabase
          .from('story_likes')
          .upsert({ story_id: storyId, user_id: userIdStr, is_liked: isLiked });
      } catch {}

      return { isLiked, likesCount: userList.length };
    } catch (e) {
      console.warn('Error toggling story like:', e);
      return { isLiked: false, likesCount: 0 };
    }
  },

  /**
   * Increments story view count persistently.
   */
  recordStoryView: async (
    storyId: string,
    userId?: string
  ): Promise<{ viewsCount: number }> => {
    if (!storyId) return { viewsCount: 0 };
    try {
      const viewsRaw = await AsyncStorage.getItem(VIEWS_STORAGE_KEY);
      const viewsMap = viewsRaw ? JSON.parse(viewsRaw) : {};
      const currentViews: number = typeof viewsMap[storyId] === 'number' ? viewsMap[storyId] : 0;
      const newViews = currentViews + 1;

      viewsMap[storyId] = newViews;
      await AsyncStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(viewsMap));

      // Attempt background Supabase view count sync
      try {
        await supabase
          .from('story_views')
          .insert({ story_id: storyId, user_id: userId ? String(userId) : null });
      } catch {}

      return { viewsCount: newViews };
    } catch (e) {
      console.warn('Error recording story view:', e);
      return { viewsCount: 0 };
    }
  },

  /**
   * Generates stories ONLY when genuine real data exists in the database
   * and stories are within the 48-hour active window.
   */
  buildStoriesFromRealData: (
    matchesList: any[],
    sliderList: any[],
    viewedIds: string[] = []
  ): StoryGroup[] => {
    const list: StoryGroup[] = [];
    const viewedSet = new Set(viewedIds);

    // 1. Genuine Live Matches
    const liveMatches = (matchesList || []).filter(
      (m) => m && m.status === 'live' && (m.homeTeamName || m.homeTeam?.name) && (m.awayTeamName || m.awayTeam?.name)
    );
    liveMatches.forEach((m, idx) => {
      const hName = m.homeTeamName || m.homeTeam?.name;
      const aName = m.awayTeamName || m.awayTeam?.name;
      const storyId = `story-live-${m._id || m.id || idx}`;
      const avatar = m.homeTeamLogo || m.homeTeam?.logo || m.awayTeamLogo || m.awayTeam?.logo || undefined;
      const videoMedia = m.liveStreamUrl || m.videoUrl || '';
      const createdAt = m.created_at || m.date || m.match_date || new Date().toISOString();

      if (storyService.isStoryExpired(createdAt)) return;

      list.push({
        id: storyId,
        title: `${formatShortTeamName(hName, 6)} - ${formatShortTeamName(aName, 6)}`,
        subtitle: `${m.tournamentName || "O'yin"} • JONLI EFIR`,
        avatarUrl: avatar,
        category: 'live_match',
        isLive: true,
        createdAt,
        isViewed: viewedSet.has(storyId),
        items: [
          {
            id: `media-live-${m._id || m.id || idx}`,
            mediaUrl: videoMedia,
            mediaType: videoMedia ? 'video' : 'image',
            title: `${hName} vs ${aName}`,
            subtitle: `${m.tournamentName || "Super Liga"} • Jonli efir`,
            matchId: m._id || m.id,
            matchScore: {
              home: m.score?.home ?? m.home_score ?? 0,
              away: m.score?.away ?? m.away_score ?? 0,
            },
            homeTeam: { name: hName, logo: m.homeTeamLogo || m.homeTeam?.logo },
            awayTeam: { name: aName, logo: m.awayTeamLogo || m.awayTeam?.logo },
            round: m.round || m.tour,
            matchTime: m.match_time || m.time,
            matchDate: m.date || m.match_date,
            tournamentName: m.tournamentName || m.league || 'Super Liga',
            status: m.status || 'live',
            createdAt,
            actionText: "JONLI EFIRGA O'TISH",
          },
        ],
      });
    });

    // 2. Genuine Top Players
    (sliderList || []).forEach((item, idx) => {
      if (item && item.topPlayer && (item.topPlayer.name || item.topPlayer.fullName)) {
        const pName = item.topPlayer.name || item.topPlayer.fullName;
        const storyId = `story-player-${item.id || item._id || idx}`;
        const avatar = item.topPlayer.photoUrl || item.topPlayer.avatar || item.topPlayer.photo || undefined;
        const playerGoals = item.topPlayer.goals || 0;
        const playerRating = item.topPlayer.rating || 9.2;
        const playerTeam = item.topPlayer.teamName || item.leagueName || 'Amatora';
        const createdAt = item.created_at || new Date().toISOString();

        if (storyService.isStoryExpired(createdAt)) return;

        list.push({
          id: storyId,
          title: formatShortTeamName(pName, 10),
          subtitle: `⚽ ${playerGoals} gol • ⭐ ${playerRating}`,
          avatarUrl: avatar,
          category: 'league_summary',
          createdAt,
          isViewed: viewedSet.has(storyId),
          items: [
            {
              id: `media-player-${item.id || item._id || idx}`,
              mediaUrl: item.videoUrl || '',
              mediaType: item.videoUrl ? 'video' : 'image',
              title: `${pName} - To'purar`,
              subtitle: `${playerTeam} • ${playerGoals} ta gol`,
              playerName: pName,
              playerPhoto: avatar,
              matchId: item.matchId,
              createdAt,
              actionText: item.matchId ? "O'YINGA O'TISH" : "TO'LIQ REYTING",
            },
          ],
        });
      }
    });

    // 3. Genuine Central / Finished Matches
    const validMatches = (matchesList || []).filter(
      (m) => m && m.status !== 'live' && (m.homeTeamName || m.homeTeam?.name) && (m.awayTeamName || m.awayTeam?.name)
    );

    const centralMatches = validMatches
      .filter((m) => m.importance === 'markaziy' || m.importance === 'ortacha' || m.status === 'finished')
      .slice(0, 4);

    centralMatches.forEach((m, idx) => {
      const hName = m.homeTeamName || m.homeTeam?.name;
      const aName = m.awayTeamName || m.awayTeam?.name;
      const storyId = `story-match-${m._id || m.id || idx}`;
      const avatar = m.homeTeamLogo || m.homeTeam?.logo || m.awayTeamLogo || m.awayTeam?.logo || undefined;
      const isFinished = m.status === 'finished';
      const videoMedia = m.videoUrl || m.replay_url || '';
      const createdAt = m.created_at || m.date || m.match_date || new Date().toISOString();

      if (storyService.isStoryExpired(createdAt)) return;

      list.push({
        id: storyId,
        title: `${formatShortTeamName(hName, 6)} - ${formatShortTeamName(aName, 6)}`,
        subtitle: isFinished
          ? `${m.score?.home ?? m.home_score ?? 0}:${m.score?.away ?? m.away_score ?? 0} • Natija`
          : `${m.match_time || m.time || '19:00'} • Markaziy o'yin`,
        avatarUrl: avatar,
        category: isFinished ? 'goal_highlight' : 'top_moment',
        createdAt,
        isViewed: viewedSet.has(storyId),
        items: [
          {
            id: `media-match-${m._id || m.id || idx}`,
            mediaUrl: videoMedia,
            mediaType: videoMedia ? 'video' : 'image',
            title: `${hName} vs ${aName}`,
            subtitle: isFinished
              ? `Natija: ${m.score?.home ?? m.home_score ?? 0} - ${m.score?.away ?? m.away_score ?? 0}`
              : `${m.venue || 'Amatora Arena'} • ${m.match_time || m.time || '19:00'}`,
            matchId: m._id || m.id,
            matchScore: isFinished
              ? { home: m.score?.home ?? m.home_score ?? 0, away: m.score?.away ?? m.away_score ?? 0 }
              : (m.score ? { home: m.score.home ?? 0, away: m.score.away ?? 0 } : undefined),
            homeTeam: { name: hName, logo: m.homeTeamLogo || m.homeTeam?.logo },
            awayTeam: { name: aName, logo: m.awayTeamLogo || m.awayTeam?.logo },
            round: m.round || m.tour,
            matchTime: m.match_time || m.time,
            matchDate: m.date || m.match_date,
            tournamentName: m.tournamentName || m.league || 'Amatora Liga',
            status: m.status || (isFinished ? 'finished' : 'scheduled'),
            createdAt,
            actionText: "O'YIN TAFSILOTLARI",
          },
        ],
      });
    });

    return list;
  },

  /**
   * Builds one StoryGroup per team from the COACH-CURATED `team_story_replays`
   * (trener/rahbar `MyTeamScreen`/`TeamProfileScreen`da tanlagan replaylar) —
   * ENDI avtomatik "eng oxirgi gol" emas, balki treneri ATAYLAB tanlagan
   * replaylar ko'rsatiladi. Bitta jamoa bir nechta faol (muddati o'tmagan)
   * story'ga ega bo'lsa — hammasi BITTA halqa (StoryGroup) ichida, alohida
   * item sifatida ketma-ket ko'rsatiladi (xuddi Instagram'dagi bitta odamning
   * bir nechta post'i bir halqada bo'lgani kabi). `curatedReplays` allaqachon
   * `expires_at > now()` bo'yicha filtrlangan holda keladi
   * (apiService.getAllTeamStoryReplays()).
   */
  buildTeamReplayStories: (
    curatedReplays: any[],
    teamsWithPoints: any[],
    matchesList: any[],
    viewedIds: string[] = [],
    ownTeamId?: string | number
  ): StoryGroup[] => {
    const viewedSet = new Set(viewedIds);
    const teamsById = new Map((teamsWithPoints || []).map((t: any) => [String(t.id ?? t._id), t]));
    const matchesById = new Map((matchesList || []).map((m: any) => [String(m.id ?? m._id), m]));
    const ownIdStr = ownTeamId != null ? String(ownTeamId) : null;

    // team_id bo'yicha guruhlash — bitta jamoaning barcha faol story'lari
    const byTeam = new Map<string, any[]>();
    (curatedReplays || []).forEach((row: any) => {
      const teamId = String(row?.team_id ?? '');
      const ev = row?.match_events;
      if (!teamId || !ev || !ev.replay_video_url) return;
      if (!byTeam.has(teamId)) byTeam.set(teamId, []);
      byTeam.get(teamId)!.push(row);
    });

    // Bitta jamoa uchun StoryGroup quradi. `ownTeamId`ga mos jamoa uchun
    // story'lar bo'lmasa ham (bo'sh `items`) baribir chaqiriladi — bu holda
    // MatchStoriesTray "+" (story qo'shish) halqasini ko'rsatadi.
    const buildGroupForTeam = (team: any): StoryGroup => {
      const teamId = String(team.id ?? team._id);
      const teamName = team.name || teamsById.get(teamId)?.name || 'Jamoa';
      const storyId = `story-team-curated-${teamId}`;

      // Eskisidan yangisiga (tomosha tartibi xronologik bo'lishi uchun)
      const rows = (byTeam.get(teamId) || []).slice().sort(
        (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const newestRow = rows[rows.length - 1];

      const items: StoryMediaItem[] = rows.map((row: any) => {
        const ev = row.match_events;
        const match = matchesById.get(String(ev?.match_id));
        const opponentName = match
          ? (String(match.home_team_id ?? match.homeTeamId) === teamId
              ? (match.awayTeamName || match.away_team_name)
              : (match.homeTeamName || match.home_team_name))
          : '';
        const homeTeam = match
          ? { name: match.homeTeamName || match.home_team_name || 'Uy', logo: match.homeTeamLogo || match.home_team_logo }
          : undefined;
        const awayTeam = match
          ? { name: match.awayTeamName || match.away_team_name || 'Mehmon', logo: match.awayTeamLogo || match.away_team_logo }
          : undefined;
        const matchScore = match
          ? { home: match.score?.home ?? match.home_score ?? 0, away: match.score?.away ?? match.away_score ?? 0 }
          : undefined;

        return {
          id: `media-team-story-${row.id}`,
          mediaUrl: ev.replay_video_url,
          mediaType: 'video',
          title: teamName,
          subtitle: opponentName ? `${teamName} vs ${opponentName}` : teamName,
          matchId: match?.id || match?._id || ev.match_id,
          teamId,
          eventId: ev.id,
          homeTeam,
          awayTeam,
          matchScore,
          round: match?.round || match?.tour,
          matchTime: match?.match_time || match?.time,
          matchDate: match?.date || match?.match_date,
          tournamentName: match?.tournamentName || match?.league || 'Amatora Liga',
          status: match?.status || 'finished',
          minute: ev.minute,
          createdAt: row.created_at,
          expiresAt: row.expires_at,
          actionText: "O'YIN TAFSILOTLARI",
        } as StoryMediaItem;
      });

      return {
        id: storyId,
        title: formatShortTeamName(teamName, 10),
        subtitle: items.length > 1 ? `${items.length} ta gol replay` : items.length === 1 ? 'Gol replay' : "Story qo'shish",
        avatarUrl: team.logo || team.logo_url,
        category: 'goal_highlight',
        createdAt: newestRow?.created_at,
        expiresAt: newestRow?.expires_at,
        isOwn: ownIdStr === teamId,
        isViewed: viewedSet.has(storyId),
        items,
      } as StoryGroup;
    };

    const groups: StoryGroup[] = [];

    // Faqat haqiqiy faol story'lari (items > 0) bor jamoalarni ko'rsatamiz (bo'sh "+" halqasi chiqarilmaydi)
    if (ownIdStr && byTeam.has(ownIdStr)) {
      const ownTeam = teamsById.get(ownIdStr);
      if (ownTeam) {
        const ownGrp = buildGroupForTeam(ownTeam);
        if (ownGrp.items && ownGrp.items.length > 0) groups.push(ownGrp);
      }
    }

    const orderedOtherTeams = (teamsWithPoints || [])
      .filter((t: any) => String(t.id ?? t._id) !== ownIdStr && byTeam.has(String(t.id ?? t._id)))
      .sort((a: any, b: any) => (b.points || 0) - (a.points || 0));

    orderedOtherTeams.forEach((t: any) => {
      const otherGrp = buildGroupForTeam(t);
      if (otherGrp.items && otherGrp.items.length > 0) groups.push(otherGrp);
    });

    return groups;
  },

  /**
   * Fetches and builds stories for the home screen tray within the 48-hour active window.
   */
  fetchLatestTourGoalStories: async (
    matchesList: any[],
    sliderList: any[],
    viewedIds: string[] = [],
    orgId?: string | number,
    ownTeamId?: string | number
  ): Promise<StoryGroup[]> => {
    try {
      const orgMatches = orgId
        ? (matchesList || []).filter(
            (m) => String(m?.organization_id ?? m?.organizationId ?? orgId) === String(orgId)
          )
        : (matchesList || []);

      const rounds = orgMatches
        .map((m) => Number(m?.round ?? m?.tour))
        .filter((r) => Number.isFinite(r));
      const latestRound = rounds.length > 0 ? Math.max(...rounds) : null;

      const scopedMatches = latestRound !== null
        ? orgMatches.filter((m) => Number(m?.round ?? m?.tour) === latestRound)
        : orgMatches;

      const baseStories = storyService.buildStoriesFromRealData(scopedMatches, sliderList, viewedIds);

      let teamReplayStories: StoryGroup[] = [];
      try {
        const teamIdsInOrg = new Set<string>();
        orgMatches.forEach((m: any) => {
          if (m?.home_team_id ?? m?.homeTeamId) teamIdsInOrg.add(String(m.home_team_id ?? m.homeTeamId));
          if (m?.away_team_id ?? m?.awayTeamId) teamIdsInOrg.add(String(m.away_team_id ?? m.awayTeamId));
        });
        // O'z jamoasi hali birorta o'yin o'ynamagan (org matches ichida
        // ko'rinmagan) bo'lsa ham, "+" halqasi chiqishi uchun majburan qo'shamiz.
        if (ownTeamId != null) teamIdsInOrg.add(String(ownTeamId));

        // ENDI trenerlar `team_story_replays`da ATAYLAB tanlagan (ko'p-storyli,
        // 48 soatda avtomatik eskiruvchi) replaylar olinadi — avvalgi avtomatik
        // "har jamoaning eng oxirgi goli" mantig'i o'rniga.
        const [allCuratedReplays, teamsWithPoints] = await Promise.all([
          apiService.getAllTeamStoryReplays(),
          apiService.getTeams(),
        ]);

        const scopedTeams = (teamsWithPoints || []).filter((t: any) =>
          teamIdsInOrg.has(String(t.id ?? t._id))
        );
        const curatedForOrg = (allCuratedReplays || []).filter((row: any) =>
          teamIdsInOrg.has(String(row?.team_id))
        );

        teamReplayStories = storyService.buildTeamReplayStories(
          curatedForOrg,
          scopedTeams,
          orgMatches,
          viewedIds,
          ownTeamId
        );
      } catch (e) {
        console.warn('Error building team replay stories:', e);
      }

      return [...teamReplayStories, ...baseStories];
    } catch (error) {
      console.warn('Error building latest-tour stories:', error);
      return [];
    }
  },
};


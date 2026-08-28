import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoryGroup, StoryMediaItem } from '../components/MatchStoriesTray';
import { formatShortTeamName } from '../utils/stringUtils';

const STORAGE_KEY = '@amatora_viewed_stories';

export const storyService = {
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
   * Generates stories ONLY when genuine real data exists in the database.
   * If no valid match or player data exists, returns empty array [].
   */
  buildStoriesFromRealData: (
    matchesList: any[],
    sliderList: any[],
    viewedIds: string[] = []
  ): StoryGroup[] => {
    const list: StoryGroup[] = [];
    const viewedSet = new Set(viewedIds);

    // 1. Genuine Live Matches (Only if real match exists with real teams)
    const liveMatches = (matchesList || []).filter(
      (m) => m && m.status === 'live' && (m.homeTeamName || m.homeTeam?.name) && (m.awayTeamName || m.awayTeam?.name)
    );
    liveMatches.forEach((m, idx) => {
      const hName = m.homeTeamName || m.homeTeam?.name;
      const aName = m.awayTeamName || m.awayTeam?.name;
      const storyId = `story-live-${m._id || m.id || idx}`;
      const avatar = m.homeTeamLogo || m.homeTeam?.logo || m.awayTeamLogo || m.awayTeam?.logo || undefined;
      const videoMedia = m.liveStreamUrl || m.videoUrl || '';

      list.push({
        id: storyId,
        title: `${formatShortTeamName(hName, 6)} - ${formatShortTeamName(aName, 6)}`,
        subtitle: `${m.tournamentName || "O'yin"} • JONLI EFIR`,
        avatarUrl: avatar,
        category: 'live_match',
        isLive: true,
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
            actionText: "JONLI EFIRGA O'TISH",
          },
        ],
      });
    });

    // 2. Genuine Top Players (Only if player name & real data actually exist)
    (sliderList || []).forEach((item, idx) => {
      if (item && item.topPlayer && (item.topPlayer.name || item.topPlayer.fullName)) {
        const pName = item.topPlayer.name || item.topPlayer.fullName;
        const storyId = `story-player-${item.id || item._id || idx}`;
        const avatar = item.topPlayer.photoUrl || item.topPlayer.avatar || item.topPlayer.photo || undefined;
        const playerGoals = item.topPlayer.goals || 0;
        const playerRating = item.topPlayer.rating || 9.2;
        const playerTeam = item.topPlayer.teamName || item.leagueName || 'Amatora';

        list.push({
          id: storyId,
          title: formatShortTeamName(pName, 10),
          subtitle: `⚽ ${playerGoals} gol • ⭐ ${playerRating}`,
          avatarUrl: avatar,
          category: 'league_summary',
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
              actionText: item.matchId ? "O'YINGA O'TISH" : "TO'LIQ REYTING",
            },
          ],
        });
      }
    });

    // 3. Genuine Central / Finished Matches (Only if real match with 2 teams exists)
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

      list.push({
        id: storyId,
        title: `${formatShortTeamName(hName, 6)} - ${formatShortTeamName(aName, 6)}`,
        subtitle: isFinished
          ? `${m.score?.home ?? m.home_score ?? 0}:${m.score?.away ?? m.away_score ?? 0} • Natija`
          : `${m.match_time || m.time || '19:00'} • Markaziy o'yin`,
        avatarUrl: avatar,
        category: isFinished ? 'goal_highlight' : 'top_moment',
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
              : undefined,
            homeTeam: { name: hName, logo: m.homeTeamLogo || m.homeTeam?.logo },
            awayTeam: { name: aName, logo: m.awayTeamLogo || m.awayTeam?.logo },
            actionText: "O'YIN TAFSILOTLARI",
          },
        ],
      });
    });

    return list;
  },
};

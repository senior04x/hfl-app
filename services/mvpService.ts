import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface MvpCandidate {
  playerId: string;
  playerName: string;
  playerPhoto?: string;
  teamName?: string;
  teamLogo?: string;
  votesCount: number;
  percentage: number;
}

export interface MatchMvpSummary {
  matchId: string;
  totalVotes: number;
  userVotedPlayerId: string | null;
  candidates: MvpCandidate[];
}

const MVP_STORAGE_PREFIX = '@amatora_mvp_match_';
const USER_MVP_VOTES_KEY = '@amatora_my_mvp_votes';

export const mvpService = {
  /**
   * Fetches Fan MVP voting summary and player vote breakdown for a given match.
   */
  getMatchMvpVotes: async (
    matchId: string,
    currentUserIdOrDeviceId?: string
  ): Promise<MatchMvpSummary> => {
    if (!matchId) {
      return { matchId: '', totalVotes: 0, userVotedPlayerId: null, candidates: [] };
    }

    let userVotedPlayerId: string | null = null;

    // 1. Check local AsyncStorage for current user's vote
    try {
      const myVotesRaw = await AsyncStorage.getItem(USER_MVP_VOTES_KEY);
      if (myVotesRaw) {
        const myVotes = JSON.parse(myVotesRaw);
        if (myVotes && myVotes[matchId]) {
          userVotedPlayerId = myVotes[matchId];
        }
      }
    } catch (e) {
      console.warn('Error reading local MVP vote:', e);
    }

    // 2. Fetch from Supabase match_mvp_votes table
    try {
      const { data, error } = await supabase
        .from('match_mvp_votes')
        .select('*')
        .eq('match_id', String(matchId));

      if (!error && data) {
        const voteCountByPlayer: Record<string, { count: number; name: string; photo?: string; team?: string }> = {};
        let totalVotes = 0;

        data.forEach((vote: any) => {
          const pId = String(vote.player_id);
          if (!voteCountByPlayer[pId]) {
            voteCountByPlayer[pId] = {
              count: 0,
              name: vote.player_name || 'O\'yinchi',
              photo: vote.player_photo,
              team: vote.team_name,
            };
          }
          voteCountByPlayer[pId].count += 1;
          totalVotes += 1;

          if (currentUserIdOrDeviceId && (vote.user_id === currentUserIdOrDeviceId || vote.device_id === currentUserIdOrDeviceId)) {
            userVotedPlayerId = pId;
          }
        });

        const candidates: MvpCandidate[] = Object.keys(voteCountByPlayer).map((pId) => {
          const item = voteCountByPlayer[pId];
          const pct = totalVotes > 0 ? Math.round((item.count / totalVotes) * 100) : 0;
          return {
            playerId: pId,
            playerName: item.name,
            playerPhoto: item.photo,
            teamName: item.team,
            votesCount: item.count,
            percentage: pct,
          };
        }).sort((a, b) => b.votesCount - a.votesCount);

        const summary: MatchMvpSummary = {
          matchId,
          totalVotes,
          userVotedPlayerId,
          candidates,
        };

        // Cache summary
        await AsyncStorage.setItem(`${MVP_STORAGE_PREFIX}${matchId}`, JSON.stringify(summary));
        return summary;
      }
    } catch (err) {
      console.warn('Supabase getMatchMvpVotes error, using local fallback:', err);
    }

    // 3. Fallback from local AsyncStorage
    try {
      const cached = await AsyncStorage.getItem(`${MVP_STORAGE_PREFIX}${matchId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          ...parsed,
          userVotedPlayerId: userVotedPlayerId || parsed.userVotedPlayerId,
        };
      }
    } catch (cErr) {}

    return {
      matchId,
      totalVotes: userVotedPlayerId ? 1 : 0,
      userVotedPlayerId,
      candidates: [],
    };
  },

  /**
   * Casts a Fan MVP vote for a specific player in a match.
   * Persists to Supabase and saves locally in AsyncStorage.
   */
  castMvpVote: async (params: {
    matchId: string;
    playerId: string;
    userIdOrDeviceId: string;
    playerName?: string;
    playerPhoto?: string;
    teamName?: string;
  }): Promise<{ success: boolean; summary: MatchMvpSummary }> => {
    const { matchId, playerId, userIdOrDeviceId, playerName, playerPhoto, teamName } = params;

    // 1. Save user's voted player in AsyncStorage
    try {
      const myVotesRaw = await AsyncStorage.getItem(USER_MVP_VOTES_KEY);
      const myVotes = myVotesRaw ? JSON.parse(myVotesRaw) : {};
      myVotes[matchId] = playerId;
      await AsyncStorage.setItem(USER_MVP_VOTES_KEY, JSON.stringify(myVotes));
    } catch (sErr) {
      console.warn('Error saving MVP vote locally:', sErr);
    }

    // 2. Persist to Supabase
    try {
      const payload: any = {
        match_id: String(matchId),
        player_id: String(playerId),
        user_id: String(userIdOrDeviceId),
        device_id: String(userIdOrDeviceId),
        player_name: playerName || '',
        player_photo: playerPhoto || '',
        team_name: teamName || '',
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('match_mvp_votes')
        .upsert(payload, { onConflict: 'match_id,user_id' });

      if (error) {
        console.warn('Supabase match_mvp_votes upsert warning:', error.message);
      }
    } catch (dbErr) {
      console.warn('Supabase castMvpVote network error, saved to AsyncStorage:', dbErr);
    }

    // 3. Return updated summary
    const updatedSummary = await mvpService.getMatchMvpVotes(matchId, userIdOrDeviceId);
    return { success: true, summary: updatedSummary };
  },

  /**
   * Retrieves the current user's voted player ID for a match.
   */
  getUserMvpVote: async (matchId: string): Promise<string | null> => {
    try {
      const myVotesRaw = await AsyncStorage.getItem(USER_MVP_VOTES_KEY);
      if (myVotesRaw) {
        const myVotes = JSON.parse(myVotesRaw);
        return myVotes[matchId] || null;
      }
    } catch (e) {
      console.warn('Error getting user MVP vote:', e);
    }
    return null;
  },
};

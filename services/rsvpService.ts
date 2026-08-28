import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type RsvpStatus = 'going' | 'not_going' | 'maybe';

export interface RsvpAttendee {
  userId: string;
  userName: string;
  status: RsvpStatus;
  userPhoto?: string;
  teamId?: string;
  updatedAt: string;
}

export interface MatchRsvpStats {
  matchId: string;
  going: number;
  notGoing: number;
  maybe: number;
  total: number;
  userStatus: RsvpStatus | null;
  attendees: RsvpAttendee[];
}

const RSVP_STORAGE_PREFIX = '@amatora_rsvp_match_';
const USER_RSVPS_KEY = '@amatora_my_rsvps';

export const rsvpService = {
  /**
   * Fetches RSVP / Attendance statistics for a specific match.
   * Checks Supabase first, falls back and syncs with AsyncStorage.
   */
  getMatchRsvpStats: async (matchId: string, currentUserId?: string): Promise<MatchRsvpStats> => {
    if (!matchId) {
      return {
        matchId: '',
        going: 0,
        notGoing: 0,
        maybe: 0,
        total: 0,
        userStatus: null,
        attendees: [],
      };
    }

    let userStatus: RsvpStatus | null = null;

    // 1. Check local AsyncStorage cache for instant response & offline readiness
    try {
      const myRsvpsRaw = await AsyncStorage.getItem(USER_RSVPS_KEY);
      if (myRsvpsRaw) {
        const myRsvps = JSON.parse(myRsvpsRaw);
        if (myRsvps && myRsvps[matchId]) {
          userStatus = myRsvps[matchId];
        }
      }
    } catch (e) {
      console.warn('Error reading local RSVP status:', e);
    }

    try {
      // 2. Query Supabase for real match attendance
      const { data, error } = await supabase
        .from('match_rsvps')
        .select('*')
        .eq('match_id', String(matchId));

      if (!error && data && data.length > 0) {
        let going = 0;
        let notGoing = 0;
        let maybe = 0;
        const attendees: RsvpAttendee[] = [];

        data.forEach((row: any) => {
          const st = (row.status || '').toLowerCase() as RsvpStatus;
          if (st === 'going') going++;
          else if (st === 'not_going') notGoing++;
          else if (st === 'maybe') maybe++;

          if (currentUserId && (String(row.user_id) === String(currentUserId) || String(row.player_id) === String(currentUserId))) {
            userStatus = st;
          }

          attendees.push({
            userId: row.user_id || row.player_id,
            userName: row.user_name || row.player_name || 'Muxlis',
            userPhoto: row.user_photo || row.photo_url,
            status: st,
            teamId: row.team_id,
            updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
          });
        });

        const stats: MatchRsvpStats = {
          matchId,
          going,
          notGoing,
          maybe,
          total: going + notGoing + maybe,
          userStatus,
          attendees,
        };

        // Cache stats locally
        await AsyncStorage.setItem(`${RSVP_STORAGE_PREFIX}${matchId}`, JSON.stringify(stats));
        return stats;
      }
    } catch (dbErr) {
      console.warn('Supabase getMatchRsvpStats error, reading local fallback:', dbErr);
    }

    // 3. Fallback to cached stats in AsyncStorage
    try {
      const cached = await AsyncStorage.getItem(`${RSVP_STORAGE_PREFIX}${matchId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          ...parsed,
          userStatus: userStatus || parsed.userStatus,
        };
      }
    } catch (cErr) {}

    return {
      matchId,
      going: userStatus === 'going' ? 1 : 0,
      notGoing: userStatus === 'not_going' ? 1 : 0,
      maybe: userStatus === 'maybe' ? 1 : 0,
      total: userStatus ? 1 : 0,
      userStatus,
      attendees: [],
    };
  },

  /**
   * Submits or updates a user's RSVP status for a match.
   * Persists to Supabase and saves locally in AsyncStorage.
   */
  submitRsvp: async (params: {
    matchId: string;
    userId: string;
    status: RsvpStatus;
    userName?: string;
    userPhoto?: string;
    teamId?: string;
  }): Promise<{ success: boolean; stats: MatchRsvpStats }> => {
    const { matchId, userId, status, userName, userPhoto, teamId } = params;

    // 1. Save user RSVP in local AsyncStorage immediately
    try {
      const myRsvpsRaw = await AsyncStorage.getItem(USER_RSVPS_KEY);
      const myRsvps = myRsvpsRaw ? JSON.parse(myRsvpsRaw) : {};
      myRsvps[matchId] = status;
      await AsyncStorage.setItem(USER_RSVPS_KEY, JSON.stringify(myRsvps));
    } catch (sErr) {
      console.warn('Error saving RSVP to AsyncStorage:', sErr);
    }

    // 2. Persist to Supabase table
    try {
      const payload: any = {
        match_id: String(matchId),
        user_id: String(userId),
        status: status,
        user_name: userName || '',
        user_photo: userPhoto || '',
        team_id: teamId || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('match_rsvps')
        .upsert(payload, { onConflict: 'match_id,user_id' });

      if (error) {
        console.warn('Supabase match_rsvps upsert warning:', error.message);
      }
    } catch (dbErr) {
      console.warn('Supabase submitRsvp network error, saved to AsyncStorage:', dbErr);
    }

    // 3. Fetch latest stats and return
    const updatedStats = await rsvpService.getMatchRsvpStats(matchId, userId);
    return { success: true, stats: updatedStats };
  },

  /**
   * Gets current user's RSVP for a specific match from local cache.
   */
  getUserRsvp: async (matchId: string): Promise<RsvpStatus | null> => {
    try {
      const myRsvpsRaw = await AsyncStorage.getItem(USER_RSVPS_KEY);
      if (myRsvpsRaw) {
        const myRsvps = JSON.parse(myRsvpsRaw);
        return myRsvps[matchId] || null;
      }
    } catch (e) {
      console.warn('Error getting user RSVP:', e);
    }
    return null;
  },
};

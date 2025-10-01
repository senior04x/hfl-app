import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Match, Team, Player, TeamStanding } from '../types';

export class DataService {
  // Teams
  static async getTeams(): Promise<Team[]> {
    try {
      console.log('Fetching teams from Firebase directly...');
      
      // Fetch directly from Firebase
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      console.log('Firebase teams snapshot:', teamsSnapshot.size, 'documents found');
      
      if (teamsSnapshot.empty) {
        console.log('No teams found in Firebase');
        return [];
      }
      
      const teams = await Promise.all(teamsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        console.log('Team data:', doc.id, data);
        
        // Safely handle timestamp conversion
        const safeToDate = (timestamp: any): Date => {
          if (!timestamp) return new Date();
          if (timestamp.toDate && typeof timestamp.toDate === 'function') {
            return timestamp.toDate();
          }
          if (timestamp instanceof Date) {
            return timestamp;
          }
          if (typeof timestamp === 'string') {
            return new Date(timestamp);
          }
          return new Date();
        };
        
        // Get players for this team
        const playersQuery = query(collection(db, 'players'), where('teamId', '==', doc.id));
        const playersSnapshot = await getDocs(playersQuery);
        const players = playersSnapshot.docs.map(playerDoc => ({
          id: playerDoc.id,
          ...playerDoc.data(),
          createdAt: safeToDate(playerDoc.data().createdAt),
          updatedAt: safeToDate(playerDoc.data().updatedAt),
        }));
        
        return {
          id: doc.id,
          ...data,
          players,
          createdAt: safeToDate(data.createdAt),
          updatedAt: safeToDate(data.updatedAt),
        };
      })) as Team[];
      
      console.log('Teams from Firebase:', teams.length, 'teams found');
      console.log('Teams data:', teams);
      return teams;
    } catch (error) {
      console.error('Error getting teams:', error);
      console.error('Error details:', error.message);
      return [];
    }
  }

  static async getTeam(teamId: string): Promise<Team | null> {
    try {
      const teamDoc = await getDoc(doc(db, 'teams', teamId));
      if (!teamDoc.exists()) return null;

      const data = teamDoc.data();
      
      // Safely handle timestamp conversion
      const safeToDate = (timestamp: any): Date => {
        if (!timestamp) return new Date();
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
          return timestamp.toDate();
        }
        if (timestamp instanceof Date) {
          return timestamp;
        }
        if (typeof timestamp === 'string') {
          return new Date(timestamp);
        }
        return new Date();
      };

      // Get players for this team
      const playersQuery = query(collection(db, 'players'), where('teamId', '==', teamId));
      const playersSnapshot = await getDocs(playersQuery);
      const players = playersSnapshot.docs.map(playerDoc => ({
        id: playerDoc.id,
        ...playerDoc.data(),
        createdAt: safeToDate(playerDoc.data().createdAt),
        updatedAt: safeToDate(playerDoc.data().updatedAt),
      }));

      return {
        id: teamDoc.id,
        ...data,
        players,
        createdAt: safeToDate(data.createdAt),
        updatedAt: safeToDate(data.updatedAt),
      } as Team;
    } catch (error) {
      console.error('Error getting team:', error);
      throw error;
    }
  }

  // Matches
  static async getMatches(): Promise<Match[]> {
    try {
      console.log('Fetching matches from admin panel API...');
      
      // Try to fetch from admin panel API first
      try {
        const apiBaseUrl = process.env.API_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.38:3000';
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(`${apiBaseUrl}/api/matches`, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const matchesData = await response.json();
          console.log('Matches from admin panel API:', matchesData.length, 'matches found');
          
          // Fetch team details for each match
          const matches = await Promise.all(
            matchesData.map(async (match: any) => {
              const homeTeam = await this.getTeam(match.homeTeamId);
              const awayTeam = await this.getTeam(match.awayTeamId);
              
              return {
                ...match,
                homeTeam: homeTeam!,
                awayTeam: awayTeam!,
              } as Match;
            })
          );
          
          return matches;
        }
      } catch (apiError) {
        if (apiError.name === 'AbortError') {
          console.log('Admin panel API timeout, falling back to Firebase...');
        } else if (apiError.message.includes('ERR_CONNECTION_REFUSED')) {
          console.log('Admin panel API server not running, falling back to Firebase...');
        } else {
          console.log('Admin panel API not available, falling back to Firebase...', apiError.message);
        }
      }
      
      // Fallback to Firebase
      const matchesSnapshot = await getDocs(
        query(collection(db, 'matches'), orderBy('matchDate', 'desc'))
      );
      
      if (matchesSnapshot.empty) {
        console.log('No matches found in Firebase');
        return [];
      }
      
      const matches = await Promise.all(
        matchesSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const homeTeam = await this.getTeam(data.homeTeamId);
          const awayTeam = await this.getTeam(data.awayTeamId);
          
          // Safely handle timestamp conversion
          const safeToDate = (timestamp: any): Date => {
            if (!timestamp) return new Date();
            if (timestamp.toDate && typeof timestamp.toDate === 'function') {
              return timestamp.toDate();
            }
            if (timestamp instanceof Date) {
              return timestamp;
            }
            if (typeof timestamp === 'string') {
              return new Date(timestamp);
            }
            return new Date();
          };

          return {
            id: doc.id,
            ...data,
            homeTeam: homeTeam!,
            awayTeam: awayTeam!,
            matchDate: safeToDate(data.matchDate),
            leagueType: data.leagueType || '',
            createdAt: safeToDate(data.createdAt),
            updatedAt: safeToDate(data.updatedAt),
          } as Match;
        })
      );

      return matches;
    } catch (error) {
      console.error('Error getting matches:', error);
      return [];
    }
  }

  static async getMatch(matchId: string): Promise<Match | null> {
    try {
      const matchDoc = await getDoc(doc(db, 'matches', matchId));
      if (!matchDoc.exists()) return null;

      const data = matchDoc.data();
      const homeTeam = await this.getTeam(data.homeTeamId);
      const awayTeam = await this.getTeam(data.awayTeamId);

      // Safely handle timestamp conversion
      const safeToDate = (timestamp: any): Date => {
        if (!timestamp) return new Date();
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
          return timestamp.toDate();
        }
        if (timestamp instanceof Date) {
          return timestamp;
        }
        if (typeof timestamp === 'string') {
          return new Date(timestamp);
        }
        return new Date();
      };

      return {
        id: matchDoc.id,
        ...data,
        homeTeam: homeTeam!,
        awayTeam: awayTeam!,
        matchDate: safeToDate(data.matchDate),
        leagueType: data.leagueType || '',
        createdAt: safeToDate(data.createdAt),
        updatedAt: safeToDate(data.updatedAt),
      } as Match;
    } catch (error) {
      console.error('Error getting match:', error);
      throw error;
    }
  }

  // Real-time match updates
  static subscribeToMatch(matchId: string, callback: (match: Match | null) => void) {
    const matchRef = doc(db, 'matches', matchId);
    
    return onSnapshot(matchRef, async (doc) => {
      if (!doc.exists()) {
        callback(null);
        return;
      }

      try {
        const data = doc.data();
        const homeTeam = await this.getTeam(data.homeTeamId);
        const awayTeam = await this.getTeam(data.awayTeamId);

        // Safely handle timestamp conversion
        const safeToDate = (timestamp: any): Date => {
          if (!timestamp) return new Date();
          if (timestamp.toDate && typeof timestamp.toDate === 'function') {
            return timestamp.toDate();
          }
          if (timestamp instanceof Date) {
            return timestamp;
          }
          if (typeof timestamp === 'string') {
            return new Date(timestamp);
          }
          return new Date();
        };

        const match: Match = {
          id: doc.id,
          ...data,
          homeTeam: homeTeam!,
          awayTeam: awayTeam!,
          matchDate: safeToDate(data.matchDate),
          leagueType: data.leagueType || '',
          createdAt: safeToDate(data.createdAt),
          updatedAt: safeToDate(data.updatedAt),
        };

        callback(match);
      } catch (error) {
        console.error('Error in match subscription:', error);
        callback(null);
      }
    });
  }

  // Admin functions
  static async createMatch(matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'matches'), {
        ...matchData,
        matchDate: Timestamp.fromDate(matchData.matchDate),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating match:', error);
      throw error;
    }
  }

  static async updateMatchScore(matchId: string, score: { home: number; away: number }): Promise<void> {
    try {
      await updateDoc(doc(db, 'matches', matchId), {
        'score.home': score.home,
        'score.away': score.away,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating match score:', error);
      throw error;
    }
  }

  static async updateMatchStatus(matchId: string, status: 'scheduled' | 'live' | 'finished'): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(doc(db, 'matches', matchId), updateData);
    } catch (error) {
      console.error('Error updating match status:', error);
      throw error;
    }
  }

  // Get single player by ID
  static async getPlayer(playerId: string): Promise<Player | null> {
    try {
      console.log('Fetching player with ID:', playerId);
      
      const playerDoc = await getDoc(doc(db, 'players', playerId));
      if (!playerDoc.exists()) {
        console.log('Player not found in Firebase');
        return null;
      }

      const data = playerDoc.data();
      console.log('Player data from Firebase:', data);
      
      // Safely handle timestamp conversion
      const safeToDate = (timestamp: any): Date => {
        if (!timestamp) return new Date();
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
          return timestamp.toDate();
        }
        if (timestamp instanceof Date) {
          return timestamp;
        }
        if (typeof timestamp === 'string') {
          return new Date(timestamp);
        }
        return new Date();
      };

      const player: Player = {
        id: playerDoc.id,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phone: data.phone || '',
        email: data.email || '',
        photo: data.photo || '',
        teamId: data.teamId || '',
        teamName: data.teamName || '',
        position: data.position || '',
        number: data.number || 0,
        goals: data.goals || 0,
        assists: data.assists || 0,
        yellowCards: data.yellowCards || 0,
        redCards: data.redCards || 0,
        matchesPlayed: data.matchesPlayed || 0,
        status: data.status || 'active',
        createdAt: safeToDate(data.createdAt),
        updatedAt: safeToDate(data.updatedAt),
      };

      console.log('Processed player data:', player);
      return player;
    } catch (error) {
      console.error('Error getting player:', error);
      throw error;
    }
  }

  // Standings
  static async getStandings(): Promise<TeamStanding[]> {
    try {
      const standingsSnapshot = await getDocs(collection(db, 'standings'));
      if (standingsSnapshot.empty) {
        console.log('No standings found in Firebase');
        return [];
      }
      return standingsSnapshot.docs.map(doc => doc.data()) as TeamStanding[];
    } catch (error) {
      console.error('Error getting standings:', error);
      return [];
    }
  }
}

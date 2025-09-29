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
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      return teamsSnapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Team[];
    } catch (error) {
      console.error('Error getting teams:', error);
      throw error;
    }
  }

  static async getTeam(teamId: string): Promise<Team | null> {
    try {
      const teamDoc = await getDoc(doc(db, 'teams', teamId));
      if (!teamDoc.exists()) return null;

      return {
        ...teamDoc.data(),
        createdAt: teamDoc.data()?.createdAt?.toDate() || new Date(),
        updatedAt: teamDoc.data()?.updatedAt?.toDate() || new Date(),
      } as Team;
    } catch (error) {
      console.error('Error getting team:', error);
      throw error;
    }
  }

  // Matches
  static async getMatches(): Promise<Match[]> {
    try {
      const matchesSnapshot = await getDocs(
        query(collection(db, 'matches'), orderBy('scheduledAt', 'desc'))
      );
      
      const matches = await Promise.all(
        matchesSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const homeTeam = await this.getTeam(data.homeTeamId);
          const awayTeam = await this.getTeam(data.awayTeamId);
          
          return {
            id: doc.id,
            ...data,
            homeTeam: homeTeam!,
            awayTeam: awayTeam!,
            scheduledAt: data.scheduledAt?.toDate() || new Date(),
            startedAt: data.startedAt?.toDate(),
            finishedAt: data.finishedAt?.toDate(),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Match;
        })
      );

      return matches;
    } catch (error) {
      console.error('Error getting matches:', error);
      throw error;
    }
  }

  static async getMatch(matchId: string): Promise<Match | null> {
    try {
      const matchDoc = await getDoc(doc(db, 'matches', matchId));
      if (!matchDoc.exists()) return null;

      const data = matchDoc.data();
      const homeTeam = await this.getTeam(data.homeTeamId);
      const awayTeam = await this.getTeam(data.awayTeamId);

      return {
        id: matchDoc.id,
        ...data,
        homeTeam: homeTeam!,
        awayTeam: awayTeam!,
        scheduledAt: data.scheduledAt?.toDate() || new Date(),
        startedAt: data.startedAt?.toDate(),
        finishedAt: data.finishedAt?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
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

        const match: Match = {
          id: doc.id,
          ...data,
          homeTeam: homeTeam!,
          awayTeam: awayTeam!,
          scheduledAt: data.scheduledAt?.toDate() || new Date(),
          startedAt: data.startedAt?.toDate(),
          finishedAt: data.finishedAt?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
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
        scheduledAt: Timestamp.fromDate(matchData.scheduledAt),
        startedAt: matchData.startedAt ? Timestamp.fromDate(matchData.startedAt) : null,
        finishedAt: matchData.finishedAt ? Timestamp.fromDate(matchData.finishedAt) : null,
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

      if (status === 'live') {
        updateData.startedAt = Timestamp.now();
      } else if (status === 'finished') {
        updateData.finishedAt = Timestamp.now();
      }

      await updateDoc(doc(db, 'matches', matchId), updateData);
    } catch (error) {
      console.error('Error updating match status:', error);
      throw error;
    }
  }

  // Standings
  static async getStandings(): Promise<TeamStanding[]> {
    try {
      const standingsSnapshot = await getDocs(collection(db, 'standings'));
      return standingsSnapshot.docs.map(doc => doc.data()) as TeamStanding[];
    } catch (error) {
      console.error('Error getting standings:', error);
      throw error;
    }
  }
}

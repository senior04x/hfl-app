// Firebase Firestore removed - using MongoDB API only
import { Match, Team, Player, TeamStanding } from '../types';
import { offlineService } from './offlineService';

export class DataService {
  // Teams
  static async getTeams(): Promise<Team[]> {
    return await offlineService.fetchWithOfflineSupport(
      'teams',
      async () => {
        console.log('Fetching teams from MongoDB API...');
        
        // Use timeout for faster response
        const timeoutPromise = new Promise<Team[]>((_, reject) => 
          setTimeout(() => reject(new Error('Teams fetch timeout')), 5000)
        );
        
        const fetchPromise = (async () => {
          // Fetch from MongoDB API
          const apiBaseUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
          
          const response = await fetch(`${apiBaseUrl}/api/teams`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
          }
          
          const result = await response.json();
          console.log('MongoDB API response:', result);
          
          if (!result.success) {
            throw new Error('API returned error');
          }
          
          const teams = result.data || [];
          console.log('Teams from MongoDB API:', teams.length, 'teams found');
          console.log('Teams data:', teams);
          return teams;
        })();
        
        // Race between fetch and timeout
        return await Promise.race([fetchPromise, timeoutPromise]);
      },
      true // Use cache
    ) || [];
  }

  static async getTeam(teamId: string): Promise<Team | null> {
    try {
      console.log('🔍 Getting team with ID:', teamId);
      
      // Validate teamId
      if (!teamId || typeof teamId !== 'string') {
        console.error('❌ Invalid teamId:', teamId);
        return null;
      }

      // Fetch from MongoDB API
          const apiBaseUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
      
      const response = await fetch(`${apiBaseUrl}/api/teams/${teamId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.log('❌ Team not found in MongoDB API:', teamId);
        return null;
      }
      
      const result = await response.json();
      console.log('📋 Team data from MongoDB API:', result);
      
      if (!result.success) {
        console.log('❌ API returned error');
        return null;
      }
      
      const team = result.data;
      console.log('✅ Team loaded successfully:', team);
      return team;
    } catch (error) {
      console.error('❌ Error getting team:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Team ID:', teamId);
      return null;
    }
  }

  // Matches
  static async getMatches(): Promise<Match[]> {
    try {
      console.log('Fetching matches from MongoDB API...');
      
      // Use timeout for faster response
      const timeoutPromise = new Promise<Match[]>((_, reject) => 
        setTimeout(() => reject(new Error('Matches fetch timeout')), 5000)
      );
      
      const fetchPromise = (async () => {
        // Fetch from MongoDB API
          const apiBaseUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
        
        const response = await fetch(`${apiBaseUrl}/api/matches`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('MongoDB API matches response:', result);
        
        if (!result.success) {
          throw new Error('API returned error');
        }
        
        const matches = result.data || [];
        console.log('Matches from MongoDB API:', matches.length, 'matches found');
        console.log('Matches data:', matches);
        return matches;
      })();
      
      // Race between fetch and timeout
      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error getting matches from MongoDB API:', error);
      console.error('Error details:', error.message);
      
      // No fallback - MongoDB API only
      console.log('MongoDB API failed, returning empty array');
      return [];
    }
  }

  static async getMatch(matchId: string): Promise<Match | null> {
    try {
      // Fetch from MongoDB API
          const apiBaseUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
      
      const response = await fetch(`${apiBaseUrl}/api/matches/${matchId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.log('❌ Match not found in MongoDB API:', matchId);
        return null;
      }
      
      const result = await response.json();
      
      if (!result.success) {
        console.log('❌ API returned error');
        return null;
      }
      
      return result.data;
    } catch (error) {
      console.error('Error getting match:', error);
      return null;
    }
  }

  // Real-time match updates - using polling instead of Firebase
  static subscribeToMatch(matchId: string, callback: (match: Match | null) => void) {
    // Polling every 5 seconds for real-time updates
    const interval = setInterval(async () => {
      try {
        const match = await this.getMatch(matchId);
        callback(match);
      } catch (error) {
        console.error('Error in match polling:', error);
        callback(null);
      }
    }, 5000);

    // Return cleanup function
    return () => clearInterval(interval);
  }

  // Admin functions - using MongoDB API
  static async createMatch(matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
          const apiBaseUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
      
      const response = await fetch(`${apiBaseUrl}/api/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(matchData),
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const result = await response.json();
      return result.data.id;
    } catch (error) {
      console.error('Error creating match:', error);
      throw error;
    }
  }

  static async updateMatchScore(matchId: string, score: { home: number; away: number }): Promise<void> {
    try {
          const apiBaseUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
      
      const response = await fetch(`${apiBaseUrl}/api/matches/${matchId}/score`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(score),
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating match score:', error);
      throw error;
    }
  }

  static async updateMatchStatus(matchId: string, status: 'scheduled' | 'live' | 'finished'): Promise<void> {
    try {
          const apiBaseUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
      
      const response = await fetch(`${apiBaseUrl}/api/matches/${matchId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating match status:', error);
      throw error;
    }
  }

  // Get single player by ID
  static async getPlayer(playerId: string): Promise<Player | null> {
    try {
      console.log('Fetching player with ID:', playerId);
      
      // Fetch from MongoDB API
          const apiBaseUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
      
      const response = await fetch(`${apiBaseUrl}/api/players/${playerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.log('❌ Player not found in MongoDB API:', playerId);
        return null;
      }
      
      const result = await response.json();
      
      if (!result.success) {
        console.log('❌ API returned error');
        return null;
      }
      
      console.log('Processed player data:', result.data);
      return result.data;
    } catch (error) {
      console.error('Error getting player:', error);
      return null;
    }
  }

  // Standings
  static async getStandings(): Promise<TeamStanding[]> {
    try {
      // Fetch from MongoDB API
          const apiBaseUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
      
      const response = await fetch(`${apiBaseUrl}/api/standings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.log('❌ Standings not found in MongoDB API');
        return [];
      }
      
      const result = await response.json();
      
      if (!result.success) {
        console.log('❌ API returned error');
        return [];
      }
      
      return result.data || [];
    } catch (error) {
      console.error('Error getting standings:', error);
      return [];
    }
  }
}

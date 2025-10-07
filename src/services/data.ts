// Firebase Firestore removed - using MongoDB API only
import { Match, Team, Player, TeamStanding } from '../types';
import { offlineService } from './offlineService';
import { retryService } from './retryService';

export class DataService {
  // Teams
  static async getTeams(): Promise<Team[]> {
    return await offlineService.fetchWithOfflineSupport(
      'teams',
      async () => {
        console.log('Fetching teams from MongoDB API...');
        
        // Use timeout for faster response
        let timeoutId: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<Team[]>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Teams fetch timeout')), 5000);
        });
        
        const fetchPromise = retryService.retryOnNetworkError(async () => {
          // Try local API first, then fallback to direct backend
          let response: Response;
          let apiSource = 'local';
          
          // Use Heroku backend directly
          console.log('DataService: Using Heroku backend...');
          apiSource = 'heroku';
          const localBackendUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
          console.log('DataService: Fetching from Heroku backend:', localBackendUrl);
          
          response = await fetch(`${localBackendUrl}/api/teams`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
          }
          
          const result = await response.json();
          console.log(`MongoDB API response from ${apiSource}:`, result);
          
          if (!result.success) {
            throw new Error(result.error || 'API returned error');
          }
          
          const teams = result.data || [];
          console.log('Teams from MongoDB API:', teams.length, 'teams found');
          console.log('Teams data:', teams);
          
          // Map _id to id for frontend compatibility
          const mappedTeams = teams.map((team: any) => {
            const { _id, ...teamWithoutId } = team;
            return {
              ...teamWithoutId,
              _id: _id ? _id.toString() : team._id,
              id: _id ? _id.toString() : (team.id ? team.id.toString() : Math.random().toString(36).substr(2, 9)),
            };
          });
          
          console.log('Mapped teams:', mappedTeams.length, 'teams');
          console.log('First mapped team:', mappedTeams[0]);
          return mappedTeams;
        }, {
          config: {
            maxAttempts: 3,
            baseDelay: 1000,
            maxDelay: 5000,
          },
          onRetry: (attempt, error) => {
            console.log(`🔄 Teams fetch retry ${attempt}: ${error.message}`);
          },
        });
        
        // Race between fetch and timeout
        try {
          const result = await Promise.race([fetchPromise, timeoutPromise]);
          if (timeoutId) clearTimeout(timeoutId);
          return result;
        } catch (error) {
          if (timeoutId) clearTimeout(timeoutId);
          throw error;
        }
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

      // Try local API first, then fallback to direct backend
      let response: Response;
      let apiSource = 'local';
      
      // Use Heroku backend directly
      console.log('DataService: Using Heroku backend...');
      apiSource = 'heroku';
      const localBackendUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
      console.log('DataService: Fetching from Heroku backend:', localBackendUrl);
      
      response = await fetch(`${localBackendUrl}/api/teams/${teamId}`, {
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
      console.log(`📋 Team data from ${apiSource}:`, result);
      
      if (!result.success) {
        console.log('❌ API returned error');
        return null;
      }
      
      const team = result.data;
      console.log('✅ Team loaded successfully:', team);
      return team;
    } catch (error) {
      console.error('❌ Error getting team:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Team ID:', teamId);
      return null;
    }
  }

  // Matches
  static async getMatches(): Promise<Match[]> {
    return await offlineService.fetchWithOfflineSupport(
      'matches',
      async () => {
        console.log('Fetching matches from MongoDB API...');
        
        // Use timeout for faster response
        let timeoutId: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<Match[]>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Matches fetch timeout')), 5000);
        });
        
        const fetchPromise = retryService.retryOnNetworkError(async () => {
          // Try local API first, then fallback to direct backend
          let response: Response;
          let apiSource = 'local';
          
          try {
            console.log('DataService: Trying local API first...');
            response = await fetch('/api/matches', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
          } catch (localError) {
            console.log('DataService: Local API failed, trying direct backend...');
            apiSource = 'backend';
            const backendUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
            console.log('DataService: Fetching from backend API:', backendUrl);
            
            response = await fetch(`${backendUrl}/api/matches`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
          }
          
          if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
          }
          
          const result = await response.json();
          console.log(`MongoDB API response from ${apiSource}:`, result);
          
          if (!result.success) {
            throw new Error(result.error || 'API returned error');
          }
          
          const matches = result.data || [];
          console.log('Matches from MongoDB API:', matches.length, 'matches found');
          console.log('Matches data:', matches);
          return matches;
        }, {
          config: {
            maxAttempts: 3,
            baseDelay: 1000,
            maxDelay: 5000,
          },
          onRetry: (attempt, error) => {
            console.log(`🔄 Matches fetch retry ${attempt}: ${error.message}`);
          },
        });
        
        // Race between fetch and timeout
        try {
          const result = await Promise.race([fetchPromise, timeoutPromise]);
          if (timeoutId) clearTimeout(timeoutId);
          return result;
        } catch (error) {
          if (timeoutId) clearTimeout(timeoutId);
          throw error;
        }
      },
      true // Use cache
    ) || [];
  }

  static async getMatch(matchId: string): Promise<Match | null> {
    try {
      // Try local API first, then fallback to direct backend
      let response: Response;
      let apiSource = 'local';
      
      try {
        console.log('DataService: Trying local API first...');
        response = await fetch(`/api/matches/${matchId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (localError) {
        console.log('DataService: Local API failed, trying direct backend...');
        apiSource = 'backend';
        const backendUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
        console.log('DataService: Fetching from backend API:', backendUrl);
        
        response = await fetch(`${backendUrl}/api/matches/${matchId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
      
      if (!response.ok) {
        console.log('❌ Match not found in MongoDB API:', matchId);
        return null;
      }
      
      const result = await response.json();
      console.log(`📋 Match data from ${apiSource}:`, result);
      
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
      // Try local API first, then fallback to direct backend
      let response: Response;
      let apiSource = 'local';
      
      try {
        console.log('DataService: Trying local API first...');
        response = await fetch('/api/matches', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(matchData),
        });
      } catch (localError) {
        console.log('DataService: Local API failed, trying direct backend...');
        apiSource = 'backend';
        const backendUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
        console.log('DataService: Fetching from backend API:', backendUrl);
        
        response = await fetch(`${backendUrl}/api/matches`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(matchData),
        });
      }
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`📋 Create match response from ${apiSource}:`, result);
      return result.data.id;
    } catch (error) {
      console.error('Error creating match:', error);
      throw error;
    }
  }

  static async updateMatchScore(matchId: string, score: { home: number; away: number }): Promise<void> {
    try {
      // Try local API first, then fallback to direct backend
      let response: Response;
      let apiSource = 'local';
      
      try {
        console.log('DataService: Trying local API first...');
        response = await fetch(`/api/matches/${matchId}/score`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(score),
        });
      } catch (localError) {
        console.log('DataService: Local API failed, trying direct backend...');
        apiSource = 'backend';
        const backendUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
        console.log('DataService: Fetching from backend API:', backendUrl);
        
        response = await fetch(`${backendUrl}/api/matches/${matchId}/score`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(score),
        });
      }
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      console.log(`📋 Update match score response from ${apiSource}:`, 'Success');
    } catch (error) {
      console.error('Error updating match score:', error);
      throw error;
    }
  }

  static async updateMatchStatus(matchId: string, status: 'scheduled' | 'live' | 'finished'): Promise<void> {
    try {
      // Try local API first, then fallback to direct backend
      let response: Response;
      let apiSource = 'local';
      
      try {
        console.log('DataService: Trying local API first...');
        response = await fetch(`/api/matches/${matchId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        });
      } catch (localError) {
        console.log('DataService: Local API failed, trying direct backend...');
        apiSource = 'backend';
        const backendUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
        console.log('DataService: Fetching from backend API:', backendUrl);
        
        response = await fetch(`${backendUrl}/api/matches/${matchId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        });
      }
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      console.log(`📋 Update match status response from ${apiSource}:`, 'Success');
    } catch (error) {
      console.error('Error updating match status:', error);
      throw error;
    }
  }

  // Get single player by ID
  static async getPlayer(playerId: string): Promise<Player | null> {
    try {
      console.log('Fetching player with ID:', playerId);
      
      // Try local API first, then fallback to direct backend
      let response: Response;
      let apiSource = 'local';
      
      // Use Heroku backend directly
      console.log('DataService: Using Heroku backend...');
      apiSource = 'heroku';
      const localBackendUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
      console.log('DataService: Fetching from Heroku backend:', localBackendUrl);
      
      response = await fetch(`${localBackendUrl}/api/players/${playerId}`, {
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
      console.log(`MongoDB API response from ${apiSource}:`, result);
      
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
    return await offlineService.fetchWithOfflineSupport(
      'standings',
      async () => {
        console.log('Fetching standings from MongoDB API...');
        
        // Use timeout for faster response
        let timeoutId: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<TeamStanding[]>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Standings fetch timeout')), 5000);
        });
        
        const fetchPromise = retryService.retryOnNetworkError(async () => {
          // Try local API first, then fallback to direct backend
          let response: Response;
          let apiSource = 'local';
          
          try {
            console.log('DataService: Trying local API first...');
            response = await fetch('/api/standings', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
          } catch (localError) {
            console.log('DataService: Local API failed, trying direct backend...');
            apiSource = 'backend';
            const backendUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
            console.log('DataService: Fetching from backend API:', backendUrl);
            
            response = await fetch(`${backendUrl}/api/standings`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
          }
          
          if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
          }
          
          const result = await response.json();
          console.log(`MongoDB API response from ${apiSource}:`, result);
          
          if (!result.success) {
            throw new Error(result.error || 'API returned error');
          }
          
          const standings = result.data || [];
          console.log('Standings from MongoDB API:', standings.length, 'standings found');
          console.log('Standings data:', standings);
          return standings;
        }, {
          config: {
            maxAttempts: 3,
            baseDelay: 1000,
            maxDelay: 5000,
          },
          onRetry: (attempt, error) => {
            console.log(`🔄 Standings fetch retry ${attempt}: ${error.message}`);
          },
        });
        
        // Race between fetch and timeout
        try {
          const result = await Promise.race([fetchPromise, timeoutPromise]);
          if (timeoutId) clearTimeout(timeoutId);
          return result;
        } catch (error) {
          if (timeoutId) clearTimeout(timeoutId);
          throw error;
        }
      },
      true // Use cache
    ) || [];
  }
}

// MongoDB Service for HFL Mobile App
// Handles MongoDB operations for mobile app

interface MongoDBConfig {
  uri: string;
  database: string;
  collections: {
    teams: string;
    players: string;
    matches: string;
    standings: string;
    applications: string;
  };
}

class MongoDBService {
  private config: MongoDBConfig;
  private isConnected: boolean = false;
  private baseUrl: string;

  constructor() {
    this.config = {
      uri: process.env.EXPO_PUBLIC_MONGODB_URI || 'mongodb+srv://hfl_user:HFL2023secure@cluster0.sqbtxra.mongodb.net/hfl_football_league?retryWrites=true&w=majority&appName=Cluster0',
      database: 'hfl_football_league',
      collections: {
        teams: 'teams',
        players: 'players',
        matches: 'matches',
        standings: 'standings',
        applications: 'leagueApplications'
      }
    };
    
    // Use hardcoded URL as fallback for network requests
    this.baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://hfl-backend-360d7733bad1.herokuapp.com';
    console.log('MongoDBService initialized with base URL:', this.baseUrl);
  }

  // Check if service is connected
  isServiceConnected(): boolean {
    return this.isConnected;
  }

  // Teams operations
  async getTeams(): Promise<any[]> {
    try {
      console.log('Fetching teams from:', `${this.baseUrl}/api/teams`);
      const response = await fetch(`${this.baseUrl}/api/teams`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📋 Raw teams response from backend:', JSON.stringify(result, null, 2));
      
      if (result.success && result.data) {
        console.log('✅ Teams data extracted:', result.data);
        return result.data;
      } else {
        console.log('❌ No teams data in response');
        return [];
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      return [];
    }
  }

  async getTeamById(id: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/teams/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch team');
      }
    } catch (error) {
      console.error('Error fetching team:', error);
      throw error;
    }
  }

  // Players operations
  async getPlayers(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/players`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch players');
      }
    } catch (error) {
      console.error('Error fetching players:', error);
      throw error;
    }
  }

  async getPlayerById(id: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/players/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch player');
      }
    } catch (error) {
      console.error('Error fetching player:', error);
      throw error;
    }
  }

  // Matches operations
  async getMatches(status?: string): Promise<any[]> {
    try {
      const url = status 
        ? `${this.baseUrl}/api/matches?status=${status}`
        : `${this.baseUrl}/api/matches`;
        
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch matches');
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      throw error;
    }
  }

  async getMatchById(id: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/matches/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch match');
      }
    } catch (error) {
      console.error('Error fetching match:', error);
      throw error;
    }
  }

  // Standings operations
  async getStandings(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/standings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch standings');
      }
    } catch (error) {
      console.error('Error fetching standings:', error);
      throw error;
    }
  }

  // Applications operations
  async createApplication(applicationData: any): Promise<any> {
    try {
      console.log('Creating application with data:', applicationData);
      console.log('Using base URL:', this.baseUrl);
      
      const apiUrl = `${this.baseUrl}/api/applications`;
      console.log('Full API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(applicationData),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Response result:', result);
      
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create application');
      }
    } catch (error) {
      console.error('Error creating application:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async getApplicationsByPhone(phone: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/applications/${phone}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch applications');
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      throw error;
    }
  }

  // OTP operations
  async requestOtp(phone: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to request OTP');
      }
    } catch (error) {
      console.error('Error requesting OTP:', error);
      throw error;
    }
  }

  async verifyOtp(phone: string, code: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, code }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to verify OTP');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  }

  // Leagues operations
  async getLeagues(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      console.log('Fetching leagues from:', `${this.baseUrl}/api/leagues`);
      const response = await fetch(`${this.baseUrl}/api/leagues`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Leagues fetched successfully:', result);
      return result;
    } catch (error) {
      console.error('Error fetching leagues:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Tournaments operations
  async getTournamentsByLeague(leagueId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      console.log('Fetching tournaments for league:', leagueId);
      const response = await fetch(`${this.baseUrl}/api/tournaments/${leagueId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Tournaments fetched successfully:', result);
      return result;
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getTournamentById(tournamentId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('Fetching tournament by ID:', tournamentId);
      const response = await fetch(`${this.baseUrl}/api/tournaments/${tournamentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Tournament fetched successfully:', result);
      return result;
    } catch (error) {
      console.error('Error fetching tournament:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Slider operations
  async getSliderItems(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      console.log('Fetching slider items from:', `${this.baseUrl}/api/slider`);
      const response = await fetch(`${this.baseUrl}/api/slider`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Slider items fetched successfully:', result);
      return result;
    } catch (error) {
      console.error('Error fetching slider items:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getActiveSliderItems(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const response = await this.getSliderItems();
      
      if (response.success && response.data) {
        // Filter only active items
        const activeItems = response.data.filter((item: any) => item.isActive);
        return {
          success: true,
          data: activeItems
        };
      }
      
      return response;
    } catch (error) {
      console.error('Error getting active slider items:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Leagues operations
  async getLeagues(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      console.log('Fetching leagues from:', `${this.baseUrl}/api/leagues`);
      const response = await fetch(`${this.baseUrl}/api/leagues`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Leagues fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('Error fetching leagues:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get all tournaments (for debugging)
  async getAllTournaments(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      console.log('🔍 Fetching all tournaments for debugging...');
      const response = await fetch(`${this.baseUrl}/api/tournaments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('All tournaments API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('All tournaments API error:', response.status, errorText);
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${response.statusText}` 
        };
      }

      const result = await response.json();
      console.log('All tournaments API response:', result);
      return result;
    } catch (error) {
      console.error('Error fetching all tournaments:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Tournaments operations
  async getTournamentsByLeague(leagueId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      console.log('🏆 Fetching tournaments for league ID:', leagueId);
      const response = await fetch(`${this.baseUrl}/api/tournaments/${leagueId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('Tournaments API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Tournaments API error:', response.status, errorText);
        
        // If 404 error, try to get all tournaments and filter client-side
        if (response.status === 404) {
          console.log('🔄 404 error - trying to get all tournaments and filter client-side...');
          try {
            const allTournamentsResult = await this.getAllTournaments();
            if (allTournamentsResult.success && allTournamentsResult.data) {
              // Filter tournaments by league ID
              const filteredTournaments = allTournamentsResult.data.filter((tournament: any) => {
                const belongsToLeague = tournament.leagueId === leagueId || tournament.league === leagueId;
                return belongsToLeague;
              });
              
              console.log('✅ Fallback: Found', filteredTournaments.length, 'tournaments for league', leagueId, 'from all tournaments');
              return { success: true, data: filteredTournaments };
            }
          } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
          }
        }
        
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${response.statusText}` 
        };
      }

      const result = await response.json();
      console.log('Tournaments API response:', result);
      console.log('🔍 Raw tournaments data:', result.data?.map((t: any) => ({ 
        name: t.name, 
        leagueId: t.leagueId, 
        league: t.league,
        _id: t._id 
      })));
      
      if (result.success && result.data) {
        // Filter tournaments by league ID to ensure they belong to the correct league
        const filteredTournaments = result.data.filter((tournament: any) => {
          const belongsToLeague = tournament.leagueId === leagueId || tournament.league === leagueId;
          if (!belongsToLeague) {
            console.log('⚠️ Tournament', tournament.name, 'does not belong to league', leagueId, 'actual leagueId:', tournament.leagueId || tournament.league);
          }
          return belongsToLeague;
        });
        
        console.log('✅ Tournaments fetched successfully for league', leagueId, ':', filteredTournaments.length, 'tournaments (filtered from', result.data.length, 'total)');
        return { success: true, data: filteredTournaments };
      } else {
        console.log('No tournaments found for league:', leagueId);
        return { success: true, data: [] };
      }
    } catch (error) {
      console.error('Error fetching tournaments for league', leagueId, ':', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Teams by tournament operations
  async getTeamsByTournament(tournamentId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      // Backend'da tournamentId filter ishlamayapti, shuning uchun frontend'da filter qilamiz
      console.log('🔍 Fetching all teams and filtering by tournamentId:', tournamentId);
      const allTeams = await this.getTeams();
      console.log('📋 All teams from backend:', allTeams);
      
      if (Array.isArray(allTeams) && allTeams.length > 0) {
        const filteredTeams = allTeams.filter(team => 
          team.tournamentId === tournamentId
        );
        console.log('✅ Filtered teams for tournament:', filteredTeams);
        return {
          success: true,
          data: filteredTeams
        };
      } else {
        console.log('❌ No teams found or empty array');
        return {
          success: true,
          data: []
        };
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Team management operations
  async getTeamById(teamId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🔍 Fetching team by ID:', teamId);
      const response = await fetch(`${this.baseUrl}/api/teams/${teamId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📋 Team data result:', result);

      if (result.success && result.data) {
        return {
          success: true,
          data: result.data
        };
      } else {
        return {
          success: false,
          error: result.error || 'Team not found'
        };
      }
    } catch (error) {
      console.error('Error fetching team:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateTeam(teamId: string, updateData: any): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔧 Updating team:', teamId, updateData);
      const response = await fetch(`${this.baseUrl}/api/teams/${teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📋 Update team result:', result);

      return {
        success: result.success || false,
        error: result.error
      };
    } catch (error) {
      console.error('Error updating team:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getPlayersByTeam(teamId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      console.log('🔍 Fetching players by team:', teamId);
      const response = await fetch(`${this.baseUrl}/api/teams/${teamId}/players`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📋 Team players result:', result);

      if (result.success && result.data) {
        return {
          success: true,
          data: result.data
        };
      } else {
        return {
          success: false,
          error: result.error || 'No players found'
        };
      }
    } catch (error) {
      console.error('Error fetching team players:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async removePlayerFromTeam(playerId: string, teamId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ Removing player from team:', playerId, teamId);
      const response = await fetch(`${this.baseUrl}/api/players/${playerId}/remove-from-team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📋 Remove player result:', result);

      return {
        success: result.success || false,
        error: result.error
      };
    } catch (error) {
      console.error('Error removing player from team:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Tournament operations
  async getTournamentById(tournamentId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('Fetching tournament by ID:', tournamentId);
      const response = await fetch(`${this.baseUrl}/api/tournaments/${tournamentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Tournament fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('Error fetching tournament:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Standings operations
  async getStandings(tournamentId: string, round?: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const url = round 
        ? `${this.baseUrl}/api/tournaments/${tournamentId}/standings?round=${round}`
        : `${this.baseUrl}/api/tournaments/${tournamentId}/standings`;
      
      console.log('Fetching standings for tournament:', tournamentId, round ? `round: ${round}` : '');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Standings fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('Error fetching standings:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Top scorers operations
  async getTopScorers(tournamentId: string, round?: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const url = round 
        ? `${this.baseUrl}/api/tournaments/${tournamentId}/top-scorers?round=${round}`
        : `${this.baseUrl}/api/tournaments/${tournamentId}/top-scorers`;
      
      console.log('Fetching top scorers for tournament:', tournamentId, round ? `round: ${round}` : '');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Top scorers fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('Error fetching top scorers:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Top assists operations
  async getTopAssists(tournamentId: string, round?: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const url = round 
        ? `${this.baseUrl}/api/tournaments/${tournamentId}/top-assists?round=${round}`
        : `${this.baseUrl}/api/tournaments/${tournamentId}/top-assists`;
      
      console.log('Fetching top assists for tournament:', tournamentId, round ? `round: ${round}` : '');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Top assists fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('Error fetching top assists:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Matches operations
  async getMatchesByTournament(tournamentId: string, round?: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const url = round 
        ? `${this.baseUrl}/api/tournaments/${tournamentId}/matches?round=${round}`
        : `${this.baseUrl}/api/tournaments/${tournamentId}/matches`;
      
      console.log('Fetching matches for tournament:', tournamentId, round ? `round: ${round}` : '');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Matches fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('Error fetching matches:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Leagues operations
  async getLeagues(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      console.log('Fetching leagues from:', `${this.baseUrl}/api/leagues`);
      const response = await fetch(`${this.baseUrl}/api/leagues`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Leagues fetched successfully:', result);
      
      if (result.success && result.data) {
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error || 'Failed to fetch leagues' };
      }
    } catch (error) {
      console.error('Error fetching leagues:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get tournament standings (real data)
  async getTournamentStandings(tournamentId: string, round?: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const url = round 
        ? `${this.baseUrl}/api/tournaments/${tournamentId}/standings?round=${round}`
        : `${this.baseUrl}/api/tournaments/${tournamentId}/standings`;
      
      console.log('🏆 Fetching tournament standings for:', tournamentId, round ? `round: ${round}` : '');
      console.log('🌐 API URL:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('Tournament standings API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Tournament standings API error:', response.status, errorText);
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${response.statusText}` 
        };
      }

      const result = await response.json();
      console.log('✅ Tournament standings fetched successfully:', result);
      
      if (result.success && result.data) {
        return { success: true, data: result.data };
      } else {
        console.log('No standings found for tournament:', tournamentId);
        return { success: true, data: [] };
      }
    } catch (error) {
      console.error('Error fetching tournament standings:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get tournament top scorers (real data)
  async getTournamentTopScorers(tournamentId: string, round?: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const url = round 
        ? `${this.baseUrl}/api/tournaments/${tournamentId}/top-scorers?round=${round}`
        : `${this.baseUrl}/api/tournaments/${tournamentId}/top-scorers`;
      
      console.log('🥅 Fetching tournament top scorers for:', tournamentId, round ? `round: ${round}` : '');
      console.log('🌐 API URL:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('Tournament top scorers API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Tournament top scorers API error:', response.status, errorText);
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${response.statusText}` 
        };
      }

      const result = await response.json();
      console.log('✅ Tournament top scorers fetched successfully:', result);
      
      if (result.success && result.data) {
        return { success: true, data: result.data };
      } else {
        console.log('No top scorers found for tournament:', tournamentId);
        return { success: true, data: [] };
      }
    } catch (error) {
      console.error('Error fetching tournament top scorers:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get tournament top assists (real data)
  async getTournamentTopAssists(tournamentId: string, round?: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const url = round 
        ? `${this.baseUrl}/api/tournaments/${tournamentId}/top-assists?round=${round}`
        : `${this.baseUrl}/api/tournaments/${tournamentId}/top-assists`;
      
      console.log('🎯 Fetching tournament top assists for:', tournamentId, round ? `round: ${round}` : '');
      console.log('🌐 API URL:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('Tournament top assists API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Tournament top assists API error:', response.status, errorText);
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${response.statusText}` 
        };
      }

      const result = await response.json();
      console.log('✅ Tournament top assists fetched successfully:', result);
      
      if (result.success && result.data) {
        return { success: true, data: result.data };
      } else {
        console.log('No top assists found for tournament:', tournamentId);
        return { success: true, data: [] };
      }
    } catch (error) {
      console.error('Error fetching tournament top assists:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      console.log('Checking health for URL:', this.baseUrl);
      
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('Health check response status:', response.status);
      console.log('Health check response ok:', response.ok);

      if (response.ok) {
        this.isConnected = true;
        console.log('Health check successful');
        return true;
      } else {
        this.isConnected = false;
        console.log('Health check failed - response not ok');
        return false;
      }
    } catch (error) {
      console.error('Health check failed:', error);
      console.error('Health check error type:', typeof error);
      console.error('Health check error message:', error instanceof Error ? error.message : 'Unknown error');
      this.isConnected = false;
      return false;
    }
  }
}

// Export singleton instance
export const mongodbService = new MongoDBService();
export default MongoDBService;
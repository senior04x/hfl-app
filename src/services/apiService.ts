import { ApiResponse, ApiError } from '../types';
import { env } from '../types/env';

class ApiService {
  private baseUrl: string;

  constructor() {
    // Use backend API directly
    this.baseUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com';
    console.log('API Base URL:', this.baseUrl);
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        }));
        
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response');
      }

      const data: ApiResponse<T> = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Network error occurred');
    }
  }

  // Teams API
  async getTeams(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.request('/api/teams');
      console.log('Raw API response:', response);
      
      // Backend returns {success: true, data: [...]} format
      if (response && response.success && response.data) {
        return {
          success: true,
          data: response.data
        };
      }
      
      return response;
    } catch (error) {
      console.error('Error in getTeams:', error);
      throw error;
    }
  }

  async getTeam(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/teams/${id}`);
  }

  async createTeam(teamData: any): Promise<ApiResponse<any>> {
    return this.request('/api/teams', {
      method: 'POST',
      body: JSON.stringify(teamData),
    });
  }

  async updateTeam(id: string, teamData: any): Promise<ApiResponse<any>> {
    return this.request(`/api/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(teamData),
    });
  }

  async deleteTeam(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/teams/${id}`, {
      method: 'DELETE',
    });
  }

  // Matches API
  async getMatches(status?: string): Promise<ApiResponse<any[]>> {
    const endpoint = status ? `/api/matches?status=${status}` : '/api/matches';
    return this.request(endpoint);
  }

  async getMatch(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/matches/${id}`);
  }

  // Players API
  async getPlayers(): Promise<ApiResponse<any[]>> {
    return this.request('/api/players');
  }

  async getPlayer(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/players/${id}`);
  }

  // Standings API
  async getStandings(): Promise<ApiResponse<any[]>> {
    return this.request('/api/standings');
  }

  // Applications API
  async createApplication(applicationData: any): Promise<ApiResponse<any>> {
    return this.request('/api/applications', {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
  }

  async getApplicationsByPhone(phone: string): Promise<ApiResponse<any[]>> {
    return this.request(`/api/applications/${phone}`);
  }

  // OTP API
  async requestOtp(phone: string): Promise<ApiResponse<any>> {
    return this.request('/api/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async verifyOtp(phone: string, code: string): Promise<ApiResponse<any>> {
    return this.request('/api/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  }

  async simpleLogin(phone: string): Promise<ApiResponse<any>> {
    return this.request('/api/simple-login', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async trainerLogin(phone: string): Promise<ApiResponse<any>> {
    return this.request('/api/teams', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<any>> {
    return this.request('/health');
  }
}

export const apiService = new ApiService();
export default apiService;
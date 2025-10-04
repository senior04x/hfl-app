// Transfer Service for HFL Mobile App
// Handles player and team transfers

interface TransferRequest {
  id?: string;
  playerId: string;
  currentTeamId: string;
  newTeamId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

interface TeamTransferRequest {
  id?: string;
  teamId: string;
  currentTournamentId: string;
  newTournamentId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

class TransferService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  }

  // Submit player transfer request
  async submitPlayerTransfer(transferData: Omit<TransferRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/transfers/player`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...transferData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return { success: true, data: result.data };
    } catch (error: any) {
      console.error('Error submitting player transfer:', error);
      return { success: false, error: error.message };
    }
  }

  // Submit team transfer request
  async submitTeamTransfer(transferData: Omit<TeamTransferRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/transfers/team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...transferData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return { success: true, data: result.data };
    } catch (error: any) {
      console.error('Error submitting team transfer:', error);
      return { success: false, error: error.message };
    }
  }

  // Get player transfer requests
  async getPlayerTransfers(playerId: string): Promise<{ success: boolean; data?: TransferRequest[]; error?: string }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/transfers/player/${playerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return { success: true, data: result.data };
    } catch (error: any) {
      console.error('Error fetching player transfers:', error);
      return { success: false, error: error.message };
    }
  }

  // Get team transfer requests
  async getTeamTransfers(teamId: string): Promise<{ success: boolean; data?: TeamTransferRequest[]; error?: string }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/transfers/team/${teamId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return { success: true, data: result.data };
    } catch (error: any) {
      console.error('Error fetching team transfers:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all transfer requests (for admin)
  async getAllTransfers(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/transfers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return { success: true, data: result.data };
    } catch (error: any) {
      console.error('Error fetching all transfers:', error);
      return { success: false, error: error.message };
    }
  }

  // Update transfer status (admin only)
  async updateTransferStatus(transferId: string, status: 'approved' | 'rejected', adminNotes?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/transfers/${transferId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          adminNotes,
          updatedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return { success: true, data: result.data };
    } catch (error: any) {
      console.error('Error updating transfer status:', error);
      return { success: false, error: error.message };
    }
  }

  // Cancel transfer request
  async cancelTransfer(transferId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/transfers/${transferId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return { success: true, data: result.data };
    } catch (error: any) {
      console.error('Error canceling transfer:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const transferService = new TransferService();
export default TransferService;

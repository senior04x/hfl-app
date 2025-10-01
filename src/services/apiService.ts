// HFL Mobile API Service
// Backend server bilan bog'lanish uchun

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export interface OtpRequestResponse {
  success: boolean;
  message: string;
  phone: string;
  expiresIn: number;
  error?: string;
}

export interface OtpVerifyResponse {
  success: boolean;
  message: string;
  player: {
    id: string;
    phone: string;
    firstName: string;
    lastName: string;
    position: string;
    number: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  session: {
    playerId: string;
    sessionId: string;
    createdAt: string;
    expiresAt: string;
  };
  reason?: string;
  error?: string;
}

export interface ApiError {
  success: false;
  error: string;
  details?: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
    console.log('🌐 API Service initialized with base URL:', this.baseUrl);
  }

  /**
   * Send OTP request to phone number
   */
  async requestOtp(phone: string): Promise<OtpRequestResponse> {
    try {
      console.log('📱 Requesting OTP for phone:', phone);
      
      const response = await fetch(`${this.baseUrl}/api/request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'OTP request failed');
      }

      console.log('✅ OTP request successful');
      return data;
      
    } catch (error: any) {
      console.error('❌ OTP request error:', error);
      throw error;
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(phone: string, code: string): Promise<OtpVerifyResponse> {
    try {
      console.log('🔍 Verifying OTP for phone:', phone, 'code:', code);
      
      const response = await fetch(`${this.baseUrl}/api/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, code }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }

      console.log('✅ OTP verification successful');
      return data;
      
    } catch (error: any) {
      console.error('❌ OTP verification error:', error);
      throw error;
    }
  }

  /**
   * Check server health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return false;
    }
  }

  /**
   * Get server status
   */
  async getServerStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return await response.json();
    } catch (error) {
      console.error('❌ Server status check failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;

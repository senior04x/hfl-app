// Network Health Service for HFL Mobile App
// Monitors network connectivity and API health

import NetInfo from '@react-native-community/netinfo';

interface HealthCheck {
  isOnline: boolean;
  apiHealth: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  responseTime: number;
  errors: string[];
}

interface ApiEndpoint {
  name: string;
  url: string;
  timeout: number;
}

class NetworkHealthService {
  private healthStatus: HealthCheck = {
    isOnline: true,
    apiHealth: 'healthy',
    lastCheck: 0,
    responseTime: 0,
    errors: [],
  };

  private apiEndpoints: ApiEndpoint[] = [
    {
      name: 'teams',
      url: '/api/teams',
      timeout: 5000,
    },
    {
      name: 'matches',
      url: '/api/matches',
      timeout: 5000,
    },
    {
      name: 'players',
      url: '/api/players',
      timeout: 5000,
    },
    {
      name: 'standings',
      url: '/api/standings',
      timeout: 5000,
    },
  ];

  private backendUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://hfl-backend-360d7733bad1.herokuapp.com';

  constructor() {
    this.initializeNetworkMonitoring();
  }

  // Initialize network monitoring
  private initializeNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.healthStatus.isOnline;
      this.healthStatus.isOnline = state.isConnected ?? false;
      
      if (wasOffline && this.healthStatus.isOnline) {
        console.log('🌐 Network restored - performing health check');
        this.performHealthCheck();
      } else if (!this.healthStatus.isOnline) {
        console.log('📴 Network lost');
        this.healthStatus.apiHealth = 'unhealthy';
      }
    });
  }

  // Perform comprehensive health check
  async performHealthCheck(): Promise<HealthCheck> {
    console.log('🔍 Performing network health check...');
    
    const startTime = Date.now();
    const errors: string[] = [];
    let healthyEndpoints = 0;
    let totalEndpoints = this.apiEndpoints.length;

    // Check each API endpoint
    for (const endpoint of this.apiEndpoints) {
      try {
        await this.checkEndpoint(endpoint);
        healthyEndpoints++;
      } catch (error) {
        const errorMsg = `Endpoint ${endpoint.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error('❌', errorMsg);
      }
    }

    // Check WebSocket connectivity
    try {
      await this.checkWebSocketHealth();
      healthyEndpoints++;
      totalEndpoints++;
    } catch (error) {
      const errorMsg = `WebSocket failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error('❌', errorMsg);
    }

    const responseTime = Date.now() - startTime;
    const healthRatio = healthyEndpoints / totalEndpoints;

    // Determine overall health
    let apiHealth: 'healthy' | 'degraded' | 'unhealthy';
    if (healthRatio >= 0.8) {
      apiHealth = 'healthy';
    } else if (healthRatio >= 0.5) {
      apiHealth = 'degraded';
    } else {
      apiHealth = 'unhealthy';
    }

    this.healthStatus = {
      isOnline: this.healthStatus.isOnline,
      apiHealth,
      lastCheck: Date.now(),
      responseTime,
      errors,
    };

    console.log(`🏥 Health check complete: ${apiHealth} (${healthyEndpoints}/${totalEndpoints} endpoints healthy)`);
    
    return this.healthStatus;
  }

  // Check individual endpoint
  private async checkEndpoint(endpoint: ApiEndpoint): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), endpoint.timeout);
    });

    const fetchPromise = fetch(endpoint.url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'API returned error');
    }
  }

  // Check WebSocket health
  private async checkWebSocketHealth(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${this.backendUrl.replace('http', 'ws')}/ws`);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(new Error('WebSocket connection failed'));
      };
    });
  }

  // Get current health status
  getHealthStatus(): HealthCheck {
    return { ...this.healthStatus };
  }

  // Check if system is healthy
  isHealthy(): boolean {
    return this.healthStatus.isOnline && this.healthStatus.apiHealth === 'healthy';
  }

  // Check if system is degraded but functional
  isDegraded(): boolean {
    return this.healthStatus.isOnline && this.healthStatus.apiHealth === 'degraded';
  }

  // Get health recommendations
  getHealthRecommendations(): string[] {
    const recommendations: string[] = [];

    if (!this.healthStatus.isOnline) {
      recommendations.push('Check your internet connection');
    }

    if (this.healthStatus.apiHealth === 'unhealthy') {
      recommendations.push('Some services are unavailable. Try refreshing the app.');
    } else if (this.healthStatus.apiHealth === 'degraded') {
      recommendations.push('Some services are slow. The app may work with limited functionality.');
    }

    if (this.healthStatus.responseTime > 10000) {
      recommendations.push('Network is slow. Consider switching to a better connection.');
    }

    if (this.healthStatus.errors.length > 0) {
      recommendations.push('Some features may not work properly due to connection issues.');
    }

    return recommendations;
  }

  // Force health check
  async forceHealthCheck(): Promise<HealthCheck> {
    return this.performHealthCheck();
  }

  // Get error summary
  getErrorSummary(): {
    totalErrors: number;
    networkErrors: number;
    apiErrors: number;
    recentErrors: string[];
  } {
    const networkErrors = this.healthStatus.errors.filter(error => 
      error.includes('Failed to fetch') || error.includes('Network')
    ).length;

    const apiErrors = this.healthStatus.errors.filter(error => 
      error.includes('HTTP') || error.includes('API')
    ).length;

    return {
      totalErrors: this.healthStatus.errors.length,
      networkErrors,
      apiErrors,
      recentErrors: this.healthStatus.errors.slice(-5), // Last 5 errors
    };
  }
}

// Export singleton instance
export const networkHealthService = new NetworkHealthService();
export default NetworkHealthService;

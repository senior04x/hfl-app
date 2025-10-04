// Real-time Service for HFL Mobile App
// Uses WebSocket for real-time updates

interface RealTimeConfig {
  serverUrl: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

interface RealTimeMessage {
  type: 'match_update' | 'team_update' | 'player_update' | 'application_update' | 'transfer_update';
  data: any;
  timestamp: string;
}

class RealTimeService {
  private config: RealTimeConfig;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private listeners: Map<string, (data: any) => void> = new Map();
  private isConnected = false;

  constructor(config: RealTimeConfig) {
    this.config = config;
  }

  // Connect to WebSocket server
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.serverUrl);
        
        this.ws.onopen = () => {
          console.log('🔌 WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: RealTimeMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          this.isConnected = false;
          this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('🔌 WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        console.error('Error creating WebSocket:', error);
        reject(error);
      }
    });
  }

  // Disconnect from WebSocket
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
  }

  // Schedule reconnection
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log('🔌 Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * this.reconnectAttempts;
    
    console.log(`🔌 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  // Handle incoming messages
  private handleMessage(message: RealTimeMessage): void {
    console.log('📨 Real-time message received:', message.type);
    
    // Notify all listeners for this message type
    const listeners = this.listeners.get(message.type);
    if (listeners) {
      listeners(message.data);
    }

    // Also notify general listeners
    const generalListeners = this.listeners.get('*');
    if (generalListeners) {
      generalListeners(message);
    }
  }

  // Subscribe to specific message types
  subscribe(messageType: string, callback: (data: any) => void): () => void {
    this.listeners.set(messageType, callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(messageType);
    };
  }

  // Subscribe to all messages
  subscribeToAll(callback: (message: RealTimeMessage) => void): () => void {
    return this.subscribe('*', callback);
  }

  // Send message to server
  send(message: any): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent');
    }
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Get reconnect attempts
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}

// Export singleton instance
export const realTimeService = new RealTimeService({
  serverUrl: process.env.EXPO_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001/ws',
  reconnectInterval: 5000, // 5 seconds
  maxReconnectAttempts: 5,
});

export default RealTimeService;

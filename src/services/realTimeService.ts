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
      // Skip WebSocket connection for now to avoid errors
      console.log('🔌 WebSocket connection disabled for development');
      resolve();
      return;
      try {
        console.log('🔌 Attempting WebSocket connection to:', this.config.serverUrl);
        this.ws = new WebSocket(this.config.serverUrl);

        // Set connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            console.error('🔌 WebSocket connection timeout');
            this.ws.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000); // 10 second timeout

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('🔌 WebSocket connected successfully');
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
            console.error('Raw message:', event.data);
          }
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          this.isConnected = false;

          // Only schedule reconnect if it wasn't a manual disconnect
          if (event.code !== 1000) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('🔌 WebSocket error:', error);
          console.error('WebSocket state:', this.ws?.readyState);
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
    // Exponential backoff with jitter
    const baseDelay = this.config.reconnectInterval;
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts - 1) + jitter, 30000); // Max 30 seconds

    console.log(`🔌 Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
        // Don't schedule another reconnect here, let the error handler do it
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
  serverUrl: process.env.EXPO_PUBLIC_WEBSOCKET_URL || 'wss://hfl-backend.onrender.com',
  reconnectInterval: 5000, // 5 seconds
  maxReconnectAttempts: 5,
});

export default RealTimeService;

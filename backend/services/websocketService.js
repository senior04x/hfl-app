// WebSocket Service for HFL Backend
// Handles real-time updates

const WebSocket = require('ws');
const mongoService = require('./mongodbService');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map();
    this.isInitialized = false;
  }

  // Initialize WebSocket server
  initialize(server) {
    if (this.isInitialized) {
      console.log('WebSocket server already initialized');
      return;
    }

    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws, req) => {
      console.log('🔌 New WebSocket connection');
      
      const clientId = this.generateClientId();
      this.clients.set(clientId, {
        ws,
        id: clientId,
        connectedAt: new Date(),
        subscriptions: new Set()
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        data: { clientId, message: 'Connected to HFL Real-time' },
        timestamp: new Date().toISOString()
      }));

      // Handle incoming messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(clientId, data);
        } catch (error) {
          console.error('Error parsing client message:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        console.log('🔌 WebSocket disconnected:', clientId);
        this.clients.delete(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(clientId);
      });
    });

    this.isInitialized = true;
    console.log('🔌 WebSocket server initialized');
  }

  // Generate unique client ID
  generateClientId() {
    return 'client_' + Math.random().toString(36).substr(2, 9);
  }

  // Handle client messages
  handleClientMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (data.type) {
      case 'subscribe':
        this.handleSubscribe(clientId, data.topics);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(clientId, data.topics);
        break;
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', data: { timestamp: new Date().toISOString() } });
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  // Handle subscription
  handleSubscribe(clientId, topics) {
    const client = this.clients.get(clientId);
    if (!client) return;

    topics.forEach(topic => {
      client.subscriptions.add(topic);
    });

    console.log(`Client ${clientId} subscribed to:`, topics);
  }

  // Handle unsubscription
  handleUnsubscribe(clientId, topics) {
    const client = this.clients.get(clientId);
    if (!client) return;

    topics.forEach(topic => {
      client.subscriptions.delete(topic);
    });

    console.log(`Client ${clientId} unsubscribed from:`, topics);
  }

  // Send message to specific client
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending message to client:', error);
    }
  }

  // Broadcast message to all clients
  broadcast(message) {
    this.clients.forEach((client, clientId) => {
      this.sendToClient(clientId, message);
    });
  }

  // Broadcast to subscribed clients
  broadcastToSubscribers(topic, message) {
    this.clients.forEach((client, clientId) => {
      if (client.subscriptions.has(topic)) {
        this.sendToClient(clientId, message);
      }
    });
  }

  // Send match update
  async sendMatchUpdate(matchId, matchData) {
    const message = {
      type: 'match_update',
      data: {
        matchId,
        match: matchData,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    this.broadcastToSubscribers('matches', message);
    console.log('📨 Match update broadcasted:', matchId);
  }

  // Send team update
  async sendTeamUpdate(teamId, teamData) {
    const message = {
      type: 'team_update',
      data: {
        teamId,
        team: teamData,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    this.broadcastToSubscribers('teams', message);
    console.log('📨 Team update broadcasted:', teamId);
  }

  // Send player update
  async sendPlayerUpdate(playerId, playerData) {
    const message = {
      type: 'player_update',
      data: {
        playerId,
        player: playerData,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    this.broadcastToSubscribers('players', message);
    console.log('📨 Player update broadcasted:', playerId);
  }

  // Send application update
  async sendApplicationUpdate(applicationId, applicationData) {
    const message = {
      type: 'application_update',
      data: {
        applicationId,
        application: applicationData,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    this.broadcastToSubscribers('applications', message);
    console.log('📨 Application update broadcasted:', applicationId);
  }

  // Send transfer update
  async sendTransferUpdate(transferId, transferData) {
    const message = {
      type: 'transfer_update',
      data: {
        transferId,
        transfer: transferData,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    this.broadcastToSubscribers('transfers', message);
    console.log('📨 Transfer update broadcasted:', transferId);
  }

  // Get connected clients count
  getConnectedClientsCount() {
    return this.clients.size;
  }

  // Get client info
  getClientInfo(clientId) {
    return this.clients.get(clientId);
  }

  // Get all clients
  getAllClients() {
    return Array.from(this.clients.values());
  }
}

// Export singleton instance
const webSocketService = new WebSocketService();
module.exports = webSocketService;

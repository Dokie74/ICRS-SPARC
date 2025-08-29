// src/backend/realtime/WebSocketManager.js
// Real-time WebSocket management for ICRS_SPARC with enhanced connection handling
// Provides real-time updates for inventory changes, user sessions, and system events

const WebSocket = require('ws');
const EventEmitter = require('events');

/**
 * WebSocket Manager for real-time communication
 * Handles client connections, authentication, and event broadcasting
 */
class WebSocketManager extends EventEmitter {
  constructor(server, authService, monitoring = null) {
    super();
    this.server = server;
    this.authService = authService;
    this.monitoring = monitoring;
    this.clients = new Map();
    this.subscriptions = new Map();
    this.isInitialized = false;
    this.heartbeatInterval = 30000; // 30 seconds
    this.heartbeatTimer = null;
  }

  /**
   * Initialize WebSocket server
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create WebSocket server
      this.wss = new WebSocket.Server({ 
        server: this.server,
        path: '/realtime',
        verifyClient: this.verifyClient.bind(this)
      });

      // Set up connection handling
      this.wss.on('connection', this.handleConnection.bind(this));
      
      // Set up heartbeat mechanism
      this.startHeartbeat();

      // Set up error handling
      this.wss.on('error', (error) => {
        console.error('WebSocket Server Error:', error);
        this.monitoring?.log({
          level: 'error',
          message: 'WebSocket server error',
          service: 'WebSocketManager',
          context: { error: error.message }
        });
      });

      this.isInitialized = true;
      console.log('WebSocket Manager initialized');
      
      this.monitoring?.log({
        level: 'info',
        message: 'WebSocket Manager initialized successfully',
        service: 'WebSocketManager'
      });

    } catch (error) {
      console.error('Failed to initialize WebSocket Manager:', error);
      throw error;
    }
  }

  /**
   * Shutdown WebSocket manager
   */
  async shutdown() {
    console.log('Shutting down WebSocket Manager...');
    
    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    // Close all client connections
    this.clients.forEach((clientInfo, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1001, 'Server shutting down');
      }
    });

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }

    this.clients.clear();
    this.subscriptions.clear();
    this.isInitialized = false;
    
    console.log('WebSocket Manager shutdown complete');
  }

  /**
   * Verify client connection
   */
  async verifyClient(info) {
    try {
      const url = new URL(info.req.url, `http://${info.req.headers.host}`);
      const token = url.searchParams.get('token');
      
      if (!token) {
        console.log('WebSocket connection rejected: No token provided');
        return false;
      }

      // Validate token
      const validationResult = await this.authService.validateToken(token);
      if (!validationResult.success) {
        console.log('WebSocket connection rejected: Invalid token');
        return false;
      }

      // Store user info for connection handling
      info.req.user = validationResult.data.user;
      info.req.permissions = validationResult.data.permissions;
      
      return true;
    } catch (error) {
      console.error('Error verifying WebSocket client:', error);
      return false;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, req) {
    const user = req.user;
    const permissions = req.permissions;
    const clientId = this.generateClientId();
    
    console.log(`New WebSocket connection: ${clientId} (User: ${user.email})`);
    
    // Store client info
    const clientInfo = {
      id: clientId,
      user,
      permissions,
      connectedAt: new Date(),
      lastPing: new Date(),
      isAlive: true,
      subscriptions: new Set()
    };
    
    this.clients.set(ws, clientInfo);
    
    // Set up event handlers
    ws.on('message', (message) => this.handleMessage(ws, message));
    ws.on('close', (code, reason) => this.handleDisconnection(ws, code, reason));
    ws.on('error', (error) => this.handleError(ws, error));
    ws.on('pong', () => this.handlePong(ws));
    
    // Send welcome message
    this.sendToClient(ws, {
      type: 'connection.established',
      data: {
        clientId,
        connectedAt: clientInfo.connectedAt.toISOString(),
        user: {
          id: user.id,
          email: user.email
        }
      }
    });

    // Record connection metric
    this.monitoring?.recordMetric('websocket_connection_established', 1, {
      user_id: user.id,
      user_role: permissions?.role
    });

    // Emit connection event
    this.emit('client.connected', { clientId, user, permissions });
  }

  /**
   * Handle incoming message from client
   */
  handleMessage(ws, message) {
    try {
      const clientInfo = this.clients.get(ws);
      if (!clientInfo) return;

      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'ping':
          this.sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
          break;
          
        case 'subscribe':
          this.handleSubscription(ws, data.channel, data.filters);
          break;
          
        case 'unsubscribe':
          this.handleUnsubscription(ws, data.channel);
          break;
          
        default:
          console.log(`Unknown message type: ${data.type}`);
      }
      
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      this.sendToClient(ws, {
        type: 'error',
        error: 'Invalid message format'
      });
    }
  }

  /**
   * Handle client subscription to channels
   */
  handleSubscription(ws, channel, filters = {}) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;

    // Validate subscription permissions
    if (!this.canSubscribeToChannel(clientInfo.permissions, channel)) {
      this.sendToClient(ws, {
        type: 'subscription.denied',
        channel,
        error: 'Insufficient permissions'
      });
      return;
    }

    // Add to subscriptions
    const subscriptionKey = `${channel}:${JSON.stringify(filters)}`;
    
    if (!this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.set(subscriptionKey, new Set());
    }
    
    this.subscriptions.get(subscriptionKey).add(ws);
    clientInfo.subscriptions.add(subscriptionKey);
    
    console.log(`Client ${clientInfo.id} subscribed to ${channel}`);
    
    this.sendToClient(ws, {
      type: 'subscription.confirmed',
      channel,
      filters
    });
    
    this.monitoring?.recordMetric('websocket_subscription', 1, {
      channel,
      user_id: clientInfo.user.id
    });
  }

  /**
   * Handle client unsubscription
   */
  handleUnsubscription(ws, channel) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;

    // Remove from all matching subscriptions
    const toRemove = [];
    clientInfo.subscriptions.forEach(subscriptionKey => {
      if (subscriptionKey.startsWith(`${channel}:`)) {
        toRemove.push(subscriptionKey);
      }
    });
    
    toRemove.forEach(subscriptionKey => {
      const subscribers = this.subscriptions.get(subscriptionKey);
      if (subscribers) {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
          this.subscriptions.delete(subscriptionKey);
        }
      }
      clientInfo.subscriptions.delete(subscriptionKey);
    });
    
    console.log(`Client ${clientInfo.id} unsubscribed from ${channel}`);
    
    this.sendToClient(ws, {
      type: 'unsubscription.confirmed',
      channel
    });
  }

  /**
   * Handle client disconnection
   */
  handleDisconnection(ws, code, reason) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;
    
    console.log(`WebSocket disconnection: ${clientInfo.id} (Code: ${code}, Reason: ${reason})`);
    
    // Remove from all subscriptions
    clientInfo.subscriptions.forEach(subscriptionKey => {
      const subscribers = this.subscriptions.get(subscriptionKey);
      if (subscribers) {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
          this.subscriptions.delete(subscriptionKey);
        }
      }
    });
    
    // Remove client
    this.clients.delete(ws);
    
    // Record disconnection metric
    this.monitoring?.recordMetric('websocket_connection_closed', 1, {
      user_id: clientInfo.user.id,
      code,
      duration: Date.now() - clientInfo.connectedAt.getTime()
    });
    
    // Emit disconnection event
    this.emit('client.disconnected', { 
      clientId: clientInfo.id, 
      user: clientInfo.user, 
      code, 
      reason 
    });
  }

  /**
   * Handle WebSocket errors
   */
  handleError(ws, error) {
    const clientInfo = this.clients.get(ws);
    console.error(`WebSocket error for client ${clientInfo?.id}:`, error);
    
    this.monitoring?.log({
      level: 'error',
      message: 'WebSocket client error',
      service: 'WebSocketManager',
      context: { 
        clientId: clientInfo?.id,
        userId: clientInfo?.user?.id,
        error: error.message 
      }
    });
  }

  /**
   * Handle pong response
   */
  handlePong(ws) {
    const clientInfo = this.clients.get(ws);
    if (clientInfo) {
      clientInfo.isAlive = true;
      clientInfo.lastPing = new Date();
    }
  }

  /**
   * Broadcast message to subscribed clients
   */
  broadcast(channel, message, filters = {}) {
    const subscriptionKey = `${channel}:${JSON.stringify(filters)}`;
    const subscribers = this.subscriptions.get(subscriptionKey);
    
    if (!subscribers || subscribers.size === 0) {
      // Also try to send to general channel subscribers
      const generalKey = `${channel}:{}`;
      const generalSubscribers = this.subscriptions.get(generalKey);
      if (generalSubscribers) {
        this.sendToSubscribers(generalSubscribers, channel, message);
      }
      return;
    }
    
    this.sendToSubscribers(subscribers, channel, message);
  }

  /**
   * Send message to specific subscribers
   */
  sendToSubscribers(subscribers, channel, message) {
    let sentCount = 0;
    const payload = {
      type: 'event',
      channel,
      data: message,
      timestamp: new Date().toISOString()
    };
    
    subscribers.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendToClient(ws, payload);
        sentCount++;
      } else {
        // Remove dead connections
        subscribers.delete(ws);
      }
    });
    
    this.monitoring?.recordMetric('websocket_message_broadcast', 1, {
      channel,
      recipient_count: sentCount
    });
  }

  /**
   * Send message to specific client
   */
  sendToClient(ws, message) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('Error sending message to client:', error);
    }
  }

  /**
   * Start heartbeat mechanism
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.clients.forEach((clientInfo, ws) => {
        if (!clientInfo.isAlive) {
          // Client didn't respond to ping, terminate connection
          ws.terminate();
          return;
        }
        
        clientInfo.isAlive = false;
        ws.ping();
      });
    }, this.heartbeatInterval);
  }

  /**
   * Check if client can subscribe to channel
   */
  canSubscribeToChannel(permissions, channel) {
    const channelPermissions = {
      'inventory.changes': 'inventory.read',
      'user.sessions': 'users.read',
      'system.notifications': null, // All authenticated users
      'audit.events': 'audit.view'
    };
    
    const requiredPermission = channelPermissions[channel];
    if (!requiredPermission) return true;
    
    return permissions.capabilities?.includes(requiredPermission) || false;
  }

  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    const stats = {
      totalConnections: this.clients.size,
      totalSubscriptions: Array.from(this.subscriptions.values())
        .reduce((sum, subscribers) => sum + subscribers.size, 0),
      channels: Array.from(this.subscriptions.keys())
        .map(key => key.split(':')[0])
        .filter((channel, index, arr) => arr.indexOf(channel) === index),
      userConnections: {}
    };
    
    this.clients.forEach(clientInfo => {
      const userId = clientInfo.user.id;
      if (!stats.userConnections[userId]) {
        stats.userConnections[userId] = 0;
      }
      stats.userConnections[userId]++;
    });
    
    return stats;
  }

  /**
   * Health check
   */
  async healthCheck() {
    const stats = this.getConnectionStats();
    
    return {
      status: 'healthy',
      details: {
        initialized: this.isInitialized,
        connections: stats.totalConnections,
        subscriptions: stats.totalSubscriptions,
        channels: stats.channels.length,
        heartbeat_interval: this.heartbeatInterval
      }
    };
  }
}

module.exports = WebSocketManager;
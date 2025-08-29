// WebSocket service for real-time updates in ICRS SPARC
// Provides connection management, event subscription, and automatic reconnection

import { useAppStore } from '../stores/useAppStore';

class RealtimeService {
  constructor() {
    this.connection = null;
    this.subscriptions = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectInterval = 1000; // Start with 1 second
    this.maxReconnectInterval = 30000; // Max 30 seconds
    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;
    this.isConnecting = false;
    this.isDestroyed = false;
    this.token = null;
    
    // Bind methods to maintain proper context
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
    this.attemptReconnect = this.attemptReconnect.bind(this);
  }
  
  // Initialize connection with authentication token
  initialize(token) {
    this.token = token;
    if (!this.isDestroyed) {
      this.connect();
    }
  }
  
  // Establish WebSocket connection
  connect() {
    if (this.isConnecting || this.isDestroyed) {
      return;
    }
    
    if (this.connection?.readyState === WebSocket.OPEN) {
      return;
    }
    
    this.isConnecting = true;
    
    try {
      // Update store with connecting status
      const store = useAppStore.getState();
      store.realtime.setConnectionStatus('connecting');
      
      // Construct WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = process.env.NODE_ENV === 'development' ? ':5001' : '';
      const wsUrl = `${protocol}//${host}${port}/realtime`;
      
      // Create WebSocket connection
      this.connection = new WebSocket(wsUrl);
      
      // Set up event handlers
      this.connection.onopen = this.handleOpen;
      this.connection.onmessage = this.handleMessage;
      this.connection.onclose = this.handleClose;
      this.connection.onerror = this.handleError;
      
      // Set connection timeout
      setTimeout(() => {
        if (this.connection?.readyState === WebSocket.CONNECTING) {
          console.warn('WebSocket connection timeout');
          this.connection?.close();
        }
      }, 10000);
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }
  
  // Handle connection open
  handleOpen(event) {
    console.log('WebSocket connected');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    const store = useAppStore.getState();
    store.realtime.setConnectionStatus('connected');
    store.realtime.resetReconnectAttempts();
    
    // Send authentication if token is available
    if (this.token) {
      this.send({
        type: 'auth',
        token: this.token
      });
    }
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Resubscribe to all active subscriptions
    this.resubscribeAll();
  }
  
  // Handle incoming messages
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      // Handle heartbeat pong
      if (message.type === 'pong') {
        this.handleHeartbeatResponse();
        return;
      }
      
      // Handle authentication response
      if (message.type === 'auth_response') {
        if (message.success) {
          console.log('WebSocket authenticated successfully');
        } else {
          console.error('WebSocket authentication failed:', message.error);
        }
        return;
      }
      
      // Handle regular events
      if (message.event && message.payload) {
        this.handleEvent(message.event, message.payload);
      }
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error, event.data);
    }
  }
  
  // Handle connection close
  handleClose(event) {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.isConnecting = false;
    this.stopHeartbeat();
    
    const store = useAppStore.getState();
    store.realtime.setConnectionStatus('disconnected');
    
    // Don't reconnect if closed intentionally or if destroyed
    if (!this.isDestroyed && event.code !== 1000) {
      this.attemptReconnect();
    }
  }
  
  // Handle connection error
  handleError(error) {
    console.error('WebSocket error:', error);
    this.isConnecting = false;
    
    if (!this.isDestroyed) {
      this.attemptReconnect();
    }
  }
  
  // Attempt to reconnect with exponential backoff
  attemptReconnect() {
    if (this.isDestroyed || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      const store = useAppStore.getState();
      store.realtime.setConnectionStatus('failed');
      return;
    }
    
    this.reconnectAttempts++;
    
    const store = useAppStore.getState();
    store.realtime.setConnectionStatus('reconnecting');
    store.realtime.incrementReconnectAttempts();
    
    // Calculate delay with exponential backoff and jitter
    const baseDelay = Math.min(
      this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectInterval
    );
    const jitter = Math.random() * 1000; // Add up to 1 second jitter
    const delay = baseDelay + jitter;
    
    console.log(`Attempting to reconnect in ${Math.round(delay / 1000)} seconds... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.connect();
      }
    }, delay);
  }
  
  // Start heartbeat to keep connection alive
  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.heartbeatInterval = setInterval(() => {
      if (this.connection?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
        
        // Set timeout for heartbeat response
        this.heartbeatTimeout = setTimeout(() => {
          console.warn('Heartbeat timeout - closing connection');
          this.connection?.close();
        }, 5000);
      }
    }, 30000); // Send heartbeat every 30 seconds
  }
  
  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }
  
  // Handle heartbeat response
  handleHeartbeatResponse() {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
    
    const store = useAppStore.getState();
    store.realtime.setLastHeartbeat(Date.now());
  }
  
  // Send message to server
  send(message) {
    if (this.connection?.readyState === WebSocket.OPEN) {
      try {
        this.connection.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return false;
      }
    }
    return false;
  }
  
  // Subscribe to an event
  subscribe(eventName, callback, options = {}) {
    if (!eventName || typeof callback !== 'function') {
      throw new Error('Event name and callback are required');
    }
    
    const subscriptionId = `${eventName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store subscription
    if (!this.subscriptions.has(eventName)) {
      this.subscriptions.set(eventName, new Map());
    }
    
    this.subscriptions.get(eventName).set(subscriptionId, {
      callback,
      options
    });
    
    // Send subscription message if connected
    if (this.connection?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'subscribe',
        event: eventName,
        subscriptionId,
        options
      });
    }
    
    // Return unsubscribe function
    return () => this.unsubscribe(eventName, subscriptionId);
  }
  
  // Unsubscribe from an event
  unsubscribe(eventName, subscriptionId) {
    const eventSubscriptions = this.subscriptions.get(eventName);
    if (eventSubscriptions) {
      eventSubscriptions.delete(subscriptionId);
      
      // Remove event entirely if no subscriptions left
      if (eventSubscriptions.size === 0) {
        this.subscriptions.delete(eventName);
      }
      
      // Send unsubscribe message if connected
      if (this.connection?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'unsubscribe',
          event: eventName,
          subscriptionId
        });
      }
    }
  }
  
  // Resubscribe to all active subscriptions (used after reconnection)
  resubscribeAll() {
    this.subscriptions.forEach((subscriptions, eventName) => {
      subscriptions.forEach((subscription, subscriptionId) => {
        this.send({
          type: 'subscribe',
          event: eventName,
          subscriptionId,
          options: subscription.options
        });
      });
    });
  }
  
  // Handle incoming events
  handleEvent(eventName, payload) {
    const eventSubscriptions = this.subscriptions.get(eventName);
    if (eventSubscriptions) {
      eventSubscriptions.forEach((subscription) => {
        try {
          subscription.callback(payload);
        } catch (error) {
          console.error(`Error in ${eventName} callback:`, error);
        }
      });
    }
    
    // Also update the global store
    const store = useAppStore.getState();
    store.realtime.addPendingUpdate({
      event: eventName,
      payload,
      timestamp: Date.now()
    });
  }
  
  // Disconnect and cleanup
  disconnect() {
    this.isDestroyed = true;
    this.stopHeartbeat();
    
    if (this.connection) {
      this.connection.close(1000, 'Intentional disconnect');
      this.connection = null;
    }
    
    this.subscriptions.clear();
    
    const store = useAppStore.getState();
    store.realtime.setConnectionStatus('disconnected');
  }
  
  // Get connection status
  getStatus() {
    if (this.isDestroyed) return 'destroyed';
    if (this.isConnecting) return 'connecting';
    
    switch (this.connection?.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'disconnected';
    }
  }
  
  // Get statistics
  getStats() {
    return {
      status: this.getStatus(),
      reconnectAttempts: this.reconnectAttempts,
      subscriptionsCount: Array.from(this.subscriptions.values())
        .reduce((total, subs) => total + subs.size, 0),
      eventsCount: this.subscriptions.size
    };
  }
}

// Create singleton instance
const realtimeService = new RealtimeService();

// React hook for using the realtime service
export const useRealtimeService = () => {
  return realtimeService;
};

// React hook for subscribing to events
export const useRealtimeSubscription = (eventName, callback, dependencies = []) => {
  const { useEffect } = require('react');
  
  useEffect(() => {
    if (!eventName || !callback) return;
    
    const unsubscribe = realtimeService.subscribe(eventName, callback);
    return unsubscribe;
  }, [eventName, callback, ...dependencies]);
};

// Export singleton instance
export default realtimeService;
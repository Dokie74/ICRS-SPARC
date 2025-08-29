// Tests for WebSocket real-time service
// Ensures reliable connection management and event handling

import RealtimeService, { useRealtimeService, useRealtimeSubscription } from '../../../src/frontend/services/RealtimeService';
import { renderHook, act } from '@testing-library/react';

// Mock WebSocket
const mockWebSocket = {
  readyState: WebSocket.CONNECTING,
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

// Mock WebSocket constructor
global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket);

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Mock useAppStore
jest.mock('../../../src/frontend/stores/useAppStore', () => ({
  useAppStore: {
    getState: jest.fn(() => ({
      realtime: {
        setConnectionStatus: jest.fn(),
        resetReconnectAttempts: jest.fn(),
        incrementReconnectAttempts: jest.fn(),
        setLastHeartbeat: jest.fn(),
        addPendingUpdate: jest.fn()
      }
    }))
  }
}));

describe('RealtimeService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWebSocket.readyState = WebSocket.CONNECTING;
    mockWebSocket.close.mockClear();
    mockWebSocket.send.mockClear();
    
    // Create new service instance for each test
    service = new RealtimeService();
  });

  afterEach(() => {
    if (service) {
      service.disconnect();
    }
  });

  describe('Connection Management', () => {
    it('should initialize with disconnected state', () => {
      expect(service.getStatus()).toBe('disconnected');
    });

    it('should establish WebSocket connection when initialized', () => {
      service.initialize('test-token');

      expect(WebSocket).toHaveBeenCalledWith(
        expect.stringContaining('/realtime')
      );
    });

    it('should not create multiple connections', () => {
      mockWebSocket.readyState = WebSocket.OPEN;
      
      service.initialize('test-token');
      service.connect(); // Second call should not create new connection

      expect(WebSocket).toHaveBeenCalledTimes(1);
    });

    it('should handle connection open event', () => {
      service.initialize('test-token');
      
      // Simulate connection open
      act(() => {
        service.handleOpen();
      });

      expect(service.getStatus()).toBe('connected');
    });

    it('should handle connection close event', () => {
      service.initialize('test-token');
      
      act(() => {
        service.handleOpen();
      });

      expect(service.getStatus()).toBe('connected');

      act(() => {
        service.handleClose({ code: 1006, reason: 'Connection lost' });
      });

      expect(service.getStatus()).toBe('disconnected');
    });

    it('should attempt reconnection on unexpected close', (done) => {
      service.initialize('test-token');

      act(() => {
        service.handleClose({ code: 1006, reason: 'Connection lost' });
      });

      // Should attempt to reconnect
      setTimeout(() => {
        expect(WebSocket).toHaveBeenCalledTimes(2);
        done();
      }, 1100); // Slightly more than reconnect interval
    });

    it('should not reconnect on intentional disconnect', () => {
      service.initialize('test-token');

      act(() => {
        service.handleClose({ code: 1000, reason: 'Intentional' });
      });

      // Should not attempt to reconnect
      setTimeout(() => {
        expect(WebSocket).toHaveBeenCalledTimes(1);
      }, 1100);
    });

    it('should respect max reconnection attempts', () => {
      service.maxReconnectAttempts = 2;
      service.initialize('test-token');

      // Trigger multiple failures
      for (let i = 0; i < 3; i++) {
        act(() => {
          service.handleClose({ code: 1006, reason: 'Connection lost' });
        });
      }

      expect(service.reconnectAttempts).toBe(2);
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      service.initialize('test-token');
      act(() => {
        service.handleOpen();
      });
    });

    it('should send authentication message on connection', () => {
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'auth',
          token: 'test-token'
        })
      );
    });

    it('should handle incoming messages', () => {
      const mockCallback = jest.fn();
      service.subscribe('test.event', mockCallback);

      const message = {
        event: 'test.event',
        payload: { data: 'test' }
      };

      act(() => {
        service.handleMessage({
          data: JSON.stringify(message)
        });
      });

      expect(mockCallback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should handle heartbeat pong', () => {
      const message = { type: 'pong' };

      act(() => {
        service.handleMessage({
          data: JSON.stringify(message)
        });
      });

      // Should clear heartbeat timeout
      expect(service.heartbeatTimeout).toBeNull();
    });

    it('should handle authentication response', () => {
      const message = {
        type: 'auth_response',
        success: true
      };

      act(() => {
        service.handleMessage({
          data: JSON.stringify(message)
        });
      });

      expect(console.log).toHaveBeenCalledWith(
        'WebSocket authenticated successfully'
      );
    });

    it('should handle malformed messages gracefully', () => {
      act(() => {
        service.handleMessage({
          data: 'invalid json'
        });
      });

      expect(console.error).toHaveBeenCalledWith(
        'Failed to parse WebSocket message:',
        expect.any(Error),
        'invalid json'
      );
    });
  });

  describe('Subscription Management', () => {
    beforeEach(() => {
      service.initialize('test-token');
      act(() => {
        service.handleOpen();
      });
    });

    it('should create subscription', () => {
      const callback = jest.fn();
      const unsubscribe = service.subscribe('test.event', callback);

      expect(service.subscriptions.has('test.event')).toBe(true);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should send subscription message to server', () => {
      const callback = jest.fn();
      service.subscribe('test.event', callback);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify(expect.objectContaining({
          type: 'subscribe',
          event: 'test.event'
        }))
      );
    });

    it('should handle multiple subscriptions for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      service.subscribe('test.event', callback1);
      service.subscribe('test.event', callback2);

      const eventSubscriptions = service.subscriptions.get('test.event');
      expect(eventSubscriptions.size).toBe(2);
    });

    it('should unsubscribe correctly', () => {
      const callback = jest.fn();
      const unsubscribe = service.subscribe('test.event', callback);

      unsubscribe();

      expect(service.subscriptions.has('test.event')).toBe(false);
    });

    it('should send unsubscribe message to server', () => {
      const callback = jest.fn();
      const unsubscribe = service.subscribe('test.event', callback);

      // Clear previous calls
      mockWebSocket.send.mockClear();

      unsubscribe();

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify(expect.objectContaining({
          type: 'unsubscribe',
          event: 'test.event'
        }))
      );
    });

    it('should handle subscription errors', () => {
      expect(() => {
        service.subscribe(null, jest.fn());
      }).toThrow('Event name and callback are required');

      expect(() => {
        service.subscribe('test.event', null);
      }).toThrow('Event name and callback are required');
    });
  });

  describe('Heartbeat Management', () => {
    beforeEach(() => {
      service.initialize('test-token');
      act(() => {
        service.handleOpen();
      });
    });

    it('should start heartbeat on connection', () => {
      expect(service.heartbeatInterval).toBeTruthy();
    });

    it('should send ping messages periodically', (done) => {
      // Fast-forward time and trigger interval
      setTimeout(() => {
        expect(mockWebSocket.send).toHaveBeenCalledWith(
          JSON.stringify({ type: 'ping' })
        );
        done();
      }, 30100); // Just over heartbeat interval
    });

    it('should stop heartbeat on disconnect', () => {
      const intervalId = service.heartbeatInterval;
      
      service.disconnect();

      expect(service.heartbeatInterval).toBeNull();
    });

    it('should handle heartbeat timeout', (done) => {
      // Simulate heartbeat timeout
      service.heartbeatTimeout = setTimeout(() => {
        expect(mockWebSocket.close).toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors', () => {
      service.initialize('test-token');

      act(() => {
        service.handleError(new Error('Connection failed'));
      });

      expect(console.error).toHaveBeenCalledWith(
        'WebSocket error:',
        expect.any(Error)
      );
    });

    it('should handle send failures gracefully', () => {
      mockWebSocket.send.mockImplementation(() => {
        throw new Error('Send failed');
      });

      service.initialize('test-token');
      act(() => {
        service.handleOpen();
      });

      const result = service.send({ type: 'test' });
      expect(result).toBe(false);
    });

    it('should handle callback errors in event handlers', () => {
      service.initialize('test-token');
      act(() => {
        service.handleOpen();
      });

      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      service.subscribe('test.event', errorCallback);

      act(() => {
        service.handleMessage({
          data: JSON.stringify({
            event: 'test.event',
            payload: { data: 'test' }
          })
        });
      });

      expect(console.error).toHaveBeenCalledWith(
        'Error in test.event callback:',
        expect.any(Error)
      );
    });
  });

  describe('Statistics and Status', () => {
    it('should provide connection statistics', () => {
      const callback = jest.fn();
      service.subscribe('test.event', callback);

      const stats = service.getStats();

      expect(stats).toEqual({
        status: 'disconnected',
        reconnectAttempts: 0,
        subscriptionsCount: 1,
        eventsCount: 1
      });
    });

    it('should track reconnection attempts', () => {
      service.initialize('test-token');

      act(() => {
        service.handleClose({ code: 1006, reason: 'Connection lost' });
      });

      expect(service.reconnectAttempts).toBe(1);
    });
  });

  describe('Cleanup and Destruction', () => {
    it('should clean up resources on disconnect', () => {
      service.initialize('test-token');
      const callback = jest.fn();
      service.subscribe('test.event', callback);

      service.disconnect();

      expect(service.isDestroyed).toBe(true);
      expect(service.subscriptions.size).toBe(0);
      expect(service.heartbeatInterval).toBeNull();
    });

    it('should not reconnect after destruction', () => {
      service.initialize('test-token');
      service.disconnect();

      act(() => {
        service.handleClose({ code: 1006, reason: 'Connection lost' });
      });

      // Should not attempt reconnection
      setTimeout(() => {
        expect(WebSocket).toHaveBeenCalledTimes(1);
      }, 1100);
    });
  });
});

describe('React Hooks', () => {
  describe('useRealtimeService', () => {
    it('should return the singleton service instance', () => {
      const { result } = renderHook(() => useRealtimeService());

      expect(result.current).toBeInstanceOf(RealtimeService);
    });
  });

  describe('useRealtimeSubscription', () => {
    it('should subscribe to events and cleanup on unmount', () => {
      const callback = jest.fn();
      const mockService = {
        subscribe: jest.fn().mockReturnValue(() => {}),
        getStatus: jest.fn().mockReturnValue('connected')
      };

      // Mock the hook dependency
      jest.doMock('../../../src/frontend/services/RealtimeService', () => ({
        useRealtimeService: () => mockService
      }));

      const { unmount } = renderHook(() =>
        useRealtimeSubscription('test.event', callback)
      );

      expect(mockService.subscribe).toHaveBeenCalledWith('test.event', expect.any(Function));

      unmount();
      // Subscription should be cleaned up on unmount
    });

    it('should handle missing event name gracefully', () => {
      const { result } = renderHook(() =>
        useRealtimeSubscription(null, jest.fn())
      );

      expect(result.current.isSubscribed).toBe(false);
    });

    it('should update subscription when dependencies change', () => {
      const callback = jest.fn();
      const mockService = {
        subscribe: jest.fn().mockReturnValue(() => {}),
        getStatus: jest.fn().mockReturnValue('connected')
      };

      jest.doMock('../../../src/frontend/services/RealtimeService', () => ({
        useRealtimeService: () => mockService
      }));

      const { rerender } = renderHook(
        ({ eventName }) => useRealtimeSubscription(eventName, callback),
        { initialProps: { eventName: 'event1' } }
      );

      expect(mockService.subscribe).toHaveBeenCalledWith('event1', expect.any(Function));

      rerender({ eventName: 'event2' });

      expect(mockService.subscribe).toHaveBeenCalledWith('event2', expect.any(Function));
    });
  });
});
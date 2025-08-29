// Tests for global application state management
// Tests Zustand store functionality and state management

import { renderHook, act } from '@testing-library/react';
import { 
  useAppStore,
  useUIState,
  useNavigationState,
  useRealtimeState,
  usePreferences,
  showSuccessNotification,
  showErrorNotification
} from '../../../src/frontend/stores/useAppStore';

// Mock localStorage for persistence tests
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.reset();
    });
    
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('UI State Management', () => {
    it('should initialize with default UI state', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.ui.sidebarOpen).toBe(false);
      expect(result.current.ui.theme).toBe('light');
      expect(result.current.ui.activeModal).toBe(null);
      expect(result.current.ui.loadingStates).toEqual({});
      expect(result.current.ui.notifications).toEqual([]);
    });

    it('should update sidebar state', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.ui.setSidebarOpen(true);
      });
      
      expect(result.current.ui.sidebarOpen).toBe(true);
    });

    it('should update theme', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.ui.setTheme('dark');
      });
      
      expect(result.current.ui.theme).toBe('dark');
    });

    it('should manage loading states', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.ui.setLoadingState('inventory', true);
      });
      
      expect(result.current.ui.loadingStates.inventory).toBe(true);
      expect(result.current.getLoadingState('inventory')).toBe(true);
      expect(result.current.isAnyLoading()).toBe(true);
      
      act(() => {
        result.current.ui.setLoadingState('inventory', false);
      });
      
      expect(result.current.ui.loadingStates.inventory).toBe(false);
      expect(result.current.isAnyLoading()).toBe(false);
    });

    it('should manage notifications', () => {
      const { result } = renderHook(() => useAppStore());
      
      let notificationId;
      act(() => {
        notificationId = result.current.ui.addNotification({
          type: 'success',
          message: 'Test notification'
        });
      });
      
      expect(result.current.ui.notifications).toHaveLength(1);
      expect(result.current.ui.notifications[0]).toMatchObject({
        id: notificationId,
        type: 'success',
        message: 'Test notification'
      });
      
      act(() => {
        result.current.ui.removeNotification(notificationId);
      });
      
      expect(result.current.ui.notifications).toHaveLength(0);
    });

    it('should auto-remove non-persistent notifications', (done) => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.ui.addNotification({
          type: 'info',
          message: 'Auto-remove notification',
          duration: 100 // 100ms for test
        });
      });
      
      expect(result.current.ui.notifications).toHaveLength(1);
      
      setTimeout(() => {
        expect(result.current.ui.notifications).toHaveLength(0);
        done();
      }, 150);
    });
  });

  describe('Navigation State Management', () => {
    it('should initialize with default navigation state', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.navigation.currentRoute).toBe('/');
      expect(result.current.navigation.routeHistory).toEqual([]);
      expect(result.current.navigation.breadcrumbs).toEqual([]);
    });

    it('should update current route and history', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.navigation.setCurrentRoute('/dashboard');
      });
      
      expect(result.current.navigation.currentRoute).toBe('/dashboard');
      expect(result.current.navigation.routeHistory).toContain('/');
      
      act(() => {
        result.current.navigation.setCurrentRoute('/inventory');
      });
      
      expect(result.current.navigation.currentRoute).toBe('/inventory');
      expect(result.current.navigation.routeHistory).toContain('/dashboard');
    });

    it('should handle going back in history', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.navigation.setCurrentRoute('/dashboard');
        result.current.navigation.setCurrentRoute('/inventory');
      });
      
      let previousRoute;
      act(() => {
        previousRoute = result.current.navigation.goBack();
      });
      
      expect(previousRoute).toBe('/dashboard');
      expect(result.current.navigation.currentRoute).toBe('/dashboard');
    });

    it('should limit route history size', () => {
      const { result } = renderHook(() => useAppStore());
      
      // Add more than 10 routes
      act(() => {
        for (let i = 0; i < 12; i++) {
          result.current.navigation.setCurrentRoute(`/route-${i}`);
        }
      });
      
      expect(result.current.navigation.routeHistory.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Real-time State Management', () => {
    it('should initialize with default realtime state', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.realtime.connectionStatus).toBe('disconnected');
      expect(result.current.realtime.subscriptions).toEqual({});
      expect(result.current.realtime.pendingUpdates).toEqual([]);
    });

    it('should update connection status', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.realtime.setConnectionStatus('connected');
      });
      
      expect(result.current.realtime.connectionStatus).toBe('connected');
    });

    it('should manage subscriptions', () => {
      const { result } = renderHook(() => useAppStore());
      const mockCallback = jest.fn();
      
      act(() => {
        result.current.realtime.addSubscription('test.event', 'sub1', mockCallback);
      });
      
      expect(result.current.realtime.subscriptions['test.event']).toHaveProperty('sub1');
      
      act(() => {
        result.current.realtime.removeSubscription('test.event', 'sub1');
      });
      
      expect(result.current.realtime.subscriptions['test.event']).not.toHaveProperty('sub1');
    });

    it('should manage pending updates', () => {
      const { result } = renderHook(() => useAppStore());
      const update = { id: 1, type: 'test', data: {} };
      
      act(() => {
        result.current.realtime.addPendingUpdate(update);
      });
      
      expect(result.current.realtime.pendingUpdates).toContain(update);
      
      act(() => {
        result.current.realtime.clearPendingUpdates();
      });
      
      expect(result.current.realtime.pendingUpdates).toEqual([]);
    });
  });

  describe('Preferences Management', () => {
    it('should initialize with default preferences', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.preferences.itemsPerPage).toBe(25);
      expect(result.current.preferences.defaultView).toBe('grid');
      expect(result.current.preferences.autoSave).toBe(true);
    });

    it('should update individual preference', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.preferences.updatePreference('itemsPerPage', 50);
      });
      
      expect(result.current.preferences.itemsPerPage).toBe(50);
    });

    it('should update multiple preferences', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.preferences.updatePreferences({
          itemsPerPage: 100,
          defaultView: 'list',
          compactMode: true
        });
      });
      
      expect(result.current.preferences.itemsPerPage).toBe(100);
      expect(result.current.preferences.defaultView).toBe('list');
      expect(result.current.preferences.compactMode).toBe(true);
    });
  });

  describe('Cache Management', () => {
    it('should update cache with timestamp', () => {
      const { result } = renderHook(() => useAppStore());
      const testData = { items: ['test'] };
      
      act(() => {
        result.current.cache.updateCache('testData', testData);
      });
      
      expect(result.current.cache.testData).toEqual(testData);
      expect(result.current.cache.timestamp).toBeTruthy();
    });

    it('should return cached data when fresh', () => {
      const { result } = renderHook(() => useAppStore());
      const testData = { items: ['test'] };
      
      act(() => {
        result.current.cache.updateCache('testData', testData);
      });
      
      const cachedData = result.current.cache.getCachedData('testData', 60000); // 1 minute
      expect(cachedData).toEqual(testData);
    });

    it('should return null for stale cached data', () => {
      const { result } = renderHook(() => useAppStore());
      const testData = { items: ['test'] };
      
      act(() => {
        result.current.cache.updateCache('testData', testData);
      });
      
      // Mock old timestamp
      act(() => {
        result.current.cache.timestamp = Date.now() - 70000; // 70 seconds ago
      });
      
      const cachedData = result.current.cache.getCachedData('testData', 60000); // 1 minute max age
      expect(cachedData).toBeNull();
    });
  });

  describe('Batch Updates', () => {
    it('should perform batch updates', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.batchUpdate({
          ui: { theme: 'dark', sidebarOpen: true },
          preferences: { itemsPerPage: 50, compactMode: true }
        });
      });
      
      expect(result.current.ui.theme).toBe('dark');
      expect(result.current.ui.sidebarOpen).toBe(true);
      expect(result.current.preferences.itemsPerPage).toBe(50);
      expect(result.current.preferences.compactMode).toBe(true);
    });
  });

  describe('Selector Hooks', () => {
    it('should provide UI state selector', () => {
      const { result } = renderHook(() => useUIState());
      
      expect(result.current).toHaveProperty('sidebarOpen');
      expect(result.current).toHaveProperty('theme');
      expect(result.current).toHaveProperty('notifications');
    });

    it('should provide navigation state selector', () => {
      const { result } = renderHook(() => useNavigationState());
      
      expect(result.current).toHaveProperty('currentRoute');
      expect(result.current).toHaveProperty('routeHistory');
      expect(result.current).toHaveProperty('breadcrumbs');
    });

    it('should provide realtime state selector', () => {
      const { result } = renderHook(() => useRealtimeState());
      
      expect(result.current).toHaveProperty('connectionStatus');
      expect(result.current).toHaveProperty('subscriptions');
      expect(result.current).toHaveProperty('pendingUpdates');
    });
  });

  describe('Notification Helpers', () => {
    it('should show success notification', () => {
      const { result } = renderHook(() => useAppStore());
      
      const id = showSuccessNotification('Test success');
      
      expect(result.current.ui.notifications).toHaveLength(1);
      expect(result.current.ui.notifications[0]).toMatchObject({
        type: 'success',
        message: 'Test success'
      });
    });

    it('should show error notification', () => {
      const { result } = renderHook(() => useAppStore());
      
      const id = showErrorNotification('Test error');
      
      expect(result.current.ui.notifications).toHaveLength(1);
      expect(result.current.ui.notifications[0]).toMatchObject({
        type: 'error',
        message: 'Test error',
        persistent: true
      });
    });
  });

  describe('Persistence', () => {
    it('should persist selected state to localStorage', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.ui.setTheme('dark');
        result.current.preferences.updatePreference('itemsPerPage', 50);
      });
      
      // Check that localStorage.setItem was called
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });
});

describe('Derived State Selectors', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.reset();
    });
  });

  it('should detect loading state', () => {
    const { result: storeResult } = renderHook(() => useAppStore());
    const { result: loadingResult } = renderHook(() => useAppStore(state => state.ui.loadingStates.test || false));
    
    expect(loadingResult.current).toBe(false);
    
    act(() => {
      storeResult.current.ui.setLoadingState('test', true);
    });
    
    expect(loadingResult.current).toBe(true);
  });
});
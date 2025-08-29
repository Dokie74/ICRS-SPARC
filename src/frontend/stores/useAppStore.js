// Global application state management using Zustand
// Provides UI state, navigation, real-time connection status, and notification management

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist } from 'zustand/middleware';

// Initial state structure
const initialState = {
  // UI State
  ui: {
    sidebarOpen: false,
    theme: 'light',
    activeModal: null,
    loadingStates: {},
    notifications: [],
    isOffline: false,
    lastUserActivity: Date.now()
  },
  
  // Navigation state
  navigation: {
    currentRoute: '/',
    routeHistory: [],
    breadcrumbs: [],
    returnTo: null
  },
  
  // Real-time connection state
  realtime: {
    connectionStatus: 'disconnected', // 'connected' | 'disconnected' | 'reconnecting'
    subscriptions: {},
    pendingUpdates: [],
    lastHeartbeat: null,
    reconnectAttempts: 0
  },
  
  // Application preferences
  preferences: {
    itemsPerPage: 25,
    defaultView: 'grid',
    autoSave: true,
    soundEnabled: false,
    compactMode: false,
    showTooltips: true
  },
  
  // Cached data for offline support
  cache: {
    timestamp: null,
    inventory: null,
    customers: null,
    parts: null
  }
};

// Zustand store with middleware for persistence and subscriptions
export const useAppStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,
        
        // UI Actions
        ui: {
          ...initialState.ui,
          setSidebarOpen: (open) => 
            set(state => ({ 
              ui: { ...state.ui, sidebarOpen: open } 
            })),
          
          setTheme: (theme) => 
            set(state => ({ 
              ui: { ...state.ui, theme } 
            })),
          
          setActiveModal: (modalId) => 
            set(state => ({ 
              ui: { ...state.ui, activeModal: modalId } 
            })),
          
          setLoadingState: (key, loading) => 
            set(state => ({
              ui: {
                ...state.ui,
                loadingStates: { 
                  ...state.ui.loadingStates, 
                  [key]: loading 
                }
              }
            })),
          
          addNotification: (notification) => {
            const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newNotification = {
              id,
              timestamp: Date.now(),
              ...notification
            };
            
            set(state => ({
              ui: {
                ...state.ui,
                notifications: [...state.ui.notifications, newNotification]
              }
            }));
            
            // Auto-remove non-persistent notifications
            if (!notification.persistent) {
              setTimeout(() => {
                get().ui.removeNotification(id);
              }, notification.duration || 5000);
            }
            
            return id;
          },
          
          removeNotification: (id) => 
            set(state => ({
              ui: {
                ...state.ui,
                notifications: state.ui.notifications.filter(n => n.id !== id)
              }
            })),
          
          clearNotifications: () => 
            set(state => ({
              ui: { ...state.ui, notifications: [] }
            })),
          
          setOfflineStatus: (isOffline) => 
            set(state => ({
              ui: { ...state.ui, isOffline }
            })),
          
          updateUserActivity: () => 
            set(state => ({
              ui: { ...state.ui, lastUserActivity: Date.now() }
            }))
        },
        
        // Navigation Actions
        navigation: {
          ...initialState.navigation,
          setCurrentRoute: (route, addToHistory = true) => {
            set(state => {
              const newHistory = addToHistory && state.navigation.currentRoute !== route
                ? [...state.navigation.routeHistory, state.navigation.currentRoute].slice(-10)
                : state.navigation.routeHistory;
                
              return {
                navigation: {
                  ...state.navigation,
                  currentRoute: route,
                  routeHistory: newHistory
                }
              };
            });
          },
          
          setBreadcrumbs: (breadcrumbs) => 
            set(state => ({
              navigation: { ...state.navigation, breadcrumbs }
            })),
          
          setReturnTo: (returnTo) => 
            set(state => ({
              navigation: { ...state.navigation, returnTo }
            })),
          
          goBack: () => {
            const state = get();
            const history = state.navigation.routeHistory;
            if (history.length > 0) {
              const previousRoute = history[history.length - 1];
              const newHistory = history.slice(0, -1);
              
              set({
                navigation: {
                  ...state.navigation,
                  currentRoute: previousRoute,
                  routeHistory: newHistory
                }
              });
              
              return previousRoute;
            }
            return null;
          }
        },
        
        // Real-time Connection Actions
        realtime: {
          ...initialState.realtime,
          setConnectionStatus: (status) => 
            set(state => ({
              realtime: { ...state.realtime, connectionStatus: status }
            })),
          
          addSubscription: (eventName, subscriptionId, callback) => 
            set(state => ({
              realtime: {
                ...state.realtime,
                subscriptions: {
                  ...state.realtime.subscriptions,
                  [eventName]: {
                    ...state.realtime.subscriptions[eventName],
                    [subscriptionId]: callback
                  }
                }
              }
            })),
          
          removeSubscription: (eventName, subscriptionId) => 
            set(state => {
              const eventSubscriptions = { ...state.realtime.subscriptions[eventName] };
              delete eventSubscriptions[subscriptionId];
              
              return {
                realtime: {
                  ...state.realtime,
                  subscriptions: {
                    ...state.realtime.subscriptions,
                    [eventName]: eventSubscriptions
                  }
                }
              };
            }),
          
          addPendingUpdate: (update) => 
            set(state => ({
              realtime: {
                ...state.realtime,
                pendingUpdates: [...state.realtime.pendingUpdates, update]
              }
            })),
          
          clearPendingUpdates: () => 
            set(state => ({
              realtime: { ...state.realtime, pendingUpdates: [] }
            })),
          
          setLastHeartbeat: (timestamp) => 
            set(state => ({
              realtime: { ...state.realtime, lastHeartbeat: timestamp }
            })),
          
          incrementReconnectAttempts: () => 
            set(state => ({
              realtime: { 
                ...state.realtime, 
                reconnectAttempts: state.realtime.reconnectAttempts + 1 
              }
            })),
          
          resetReconnectAttempts: () => 
            set(state => ({
              realtime: { ...state.realtime, reconnectAttempts: 0 }
            }))
        },
        
        // Preferences Actions
        preferences: {
          ...initialState.preferences,
          updatePreference: (key, value) => 
            set(state => ({
              preferences: { ...state.preferences, [key]: value }
            })),
          
          updatePreferences: (updates) => 
            set(state => ({
              preferences: { ...state.preferences, ...updates }
            })),
          
          resetPreferences: () => 
            set(state => ({
              preferences: { ...initialState.preferences }
            }))
        },
        
        // Cache Actions
        cache: {
          ...initialState.cache,
          updateCache: (key, data) => 
            set(state => ({
              cache: {
                ...state.cache,
                [key]: data,
                timestamp: Date.now()
              }
            })),
          
          clearCache: () => 
            set(state => ({
              cache: { ...initialState.cache }
            })),
          
          getCachedData: (key, maxAge = 5 * 60 * 1000) => { // 5 minutes default
            const state = get();
            const cached = state.cache[key];
            const timestamp = state.cache.timestamp;
            
            if (cached && timestamp && (Date.now() - timestamp < maxAge)) {
              return cached;
            }
            return null;
          }
        },
        
        // Utility Actions
        reset: () => set(initialState),
        
        getLoadingState: (key) => {
          const state = get();
          return state.ui.loadingStates[key] || false;
        },
        
        isAnyLoading: () => {
          const state = get();
          return Object.values(state.ui.loadingStates).some(loading => loading);
        },
        
        // Batch update for performance
        batchUpdate: (updates) => {
          set(state => {
            let newState = { ...state };
            
            Object.entries(updates).forEach(([section, sectionUpdates]) => {
              if (newState[section] && typeof newState[section] === 'object') {
                newState[section] = { ...newState[section], ...sectionUpdates };
              }
            });
            
            return newState;
          });
        }
      }),
      {
        name: 'icrs-sparc-app-store',
        // Only persist certain parts of the state
        partialize: (state) => ({
          ui: {
            theme: state.ui.theme,
            sidebarOpen: state.ui.sidebarOpen
          },
          preferences: state.preferences,
          navigation: {
            returnTo: state.navigation.returnTo
          }
        })
      }
    )
  )
);

// Selectors for common state access patterns
export const useUIState = () => useAppStore(state => state.ui);
export const useNavigationState = () => useAppStore(state => state.navigation);
export const useRealtimeState = () => useAppStore(state => state.realtime);
export const usePreferences = () => useAppStore(state => state.preferences);
export const useCache = () => useAppStore(state => state.cache);

// Derived state selectors
export const useIsLoading = (key) => useAppStore(state => state.ui.loadingStates[key] || false);
export const useHasNotifications = () => useAppStore(state => state.ui.notifications.length > 0);
export const useIsConnected = () => useAppStore(state => state.realtime.connectionStatus === 'connected');
export const useIsOffline = () => useAppStore(state => state.ui.isOffline);

// Action creators for complex operations
export const showSuccessNotification = (message, options = {}) => {
  const addNotification = useAppStore.getState().ui.addNotification;
  return addNotification({
    type: 'success',
    message,
    duration: 3000,
    ...options
  });
};

export const showErrorNotification = (message, options = {}) => {
  const addNotification = useAppStore.getState().ui.addNotification;
  return addNotification({
    type: 'error',
    message,
    duration: 5000,
    persistent: true,
    ...options
  });
};

export const showLoadingNotification = (message, options = {}) => {
  const addNotification = useAppStore.getState().ui.addNotification;
  return addNotification({
    type: 'loading',
    message,
    persistent: true,
    ...options
  });
};

// Subscribe to store changes for side effects
if (typeof window !== 'undefined') {
  // Update user activity on any state change
  useAppStore.subscribe(
    () => useAppStore.getState().ui.updateUserActivity()
  );
  
  // Handle offline/online status
  window.addEventListener('online', () => {
    useAppStore.getState().ui.setOfflineStatus(false);
    showSuccessNotification('Connection restored');
  });
  
  window.addEventListener('offline', () => {
    useAppStore.getState().ui.setOfflineStatus(true);
    showErrorNotification('Connection lost - working offline');
  });
  
  // Handle visibility change for activity tracking
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      useAppStore.getState().ui.updateUserActivity();
    }
  });
}

export default useAppStore;
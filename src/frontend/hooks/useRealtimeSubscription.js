// Real-time subscription hooks for ICRS SPARC frontend
// Provides easy-to-use hooks for subscribing to WebSocket events with automatic cleanup

import { useEffect, useCallback, useRef, useState } from 'react';
import { useAppStore, showSuccessNotification, showErrorNotification } from '../stores/useAppStore';
import { useRealtimeService } from '../services/RealtimeService';
import { useQueryClient } from 'react-query';

// Base hook for real-time subscriptions with automatic cleanup
export const useRealtimeSubscription = (eventName, callback, dependencies = []) => {
  const realtimeService = useRealtimeService();
  const callbackRef = useRef(callback);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Subscription effect
  useEffect(() => {
    if (!eventName || !realtimeService) {
      setIsSubscribed(false);
      return;
    }

    // Create stable callback that uses the latest version
    const stableCallback = (...args) => {
      if (callbackRef.current) {
        callbackRef.current(...args);
      }
    };

    try {
      const unsubscribe = realtimeService.subscribe(eventName, stableCallback);
      setIsSubscribed(true);

      return () => {
        unsubscribe();
        setIsSubscribed(false);
      };
    } catch (error) {
      console.error(`Failed to subscribe to ${eventName}:`, error);
      setIsSubscribed(false);
    }
  }, [eventName, realtimeService, ...dependencies]);

  return {
    isSubscribed,
    connectionStatus: realtimeService?.getStatus() || 'disconnected'
  };
};

// Hook for inventory real-time updates with query cache integration
export const useInventoryRealtimeUpdates = (filters = {}) => {
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState(null);

  // Handle inventory lot updates
  const handleLotUpdate = useCallback((payload) => {
    const { lot_id, changes, user_id, timestamp } = payload;
    
    setLastUpdate({ type: 'update', lot_id, timestamp });

    // Update individual lot query if it's cached
    const lotQueryKey = ['inventory', 'lot', lot_id];
    const cachedLot = queryClient.getQueryData(lotQueryKey);
    if (cachedLot) {
      queryClient.setQueryData(lotQueryKey, {
        ...cachedLot,
        ...changes,
        updated_at: timestamp
      });
    }

    // Update lots list if it matches current filters
    const lotsQueryKey = ['inventory', 'lots', filters];
    queryClient.setQueryData(lotsQueryKey, (oldData) => {
      if (!oldData?.lots) return oldData;

      return {
        ...oldData,
        lots: oldData.lots.map(lot => 
          lot.id === lot_id 
            ? { ...lot, ...changes, updated_at: timestamp }
            : lot
        )
      };
    });

    // Show notification
    if (changes.status) {
      showSuccessNotification(
        `Lot ${lot_id} status changed to ${changes.status}`,
        { duration: 3000 }
      );
    } else if (changes.current_quantity !== undefined) {
      showSuccessNotification(
        `Lot ${lot_id} quantity updated to ${changes.current_quantity}`,
        { duration: 3000 }
      );
    }
  }, [queryClient, filters]);

  // Handle inventory lot creation
  const handleLotCreated = useCallback((payload) => {
    const { lot_data, user_id, timestamp } = payload;
    
    setLastUpdate({ type: 'created', lot_id: lot_data.id, timestamp });

    // Add to lots list if it matches filters
    const lotsQueryKey = ['inventory', 'lots', filters];
    queryClient.setQueryData(lotsQueryKey, (oldData) => {
      if (!oldData) return oldData;

      return {
        ...oldData,
        lots: [lot_data, ...oldData.lots],
        count: oldData.count + 1
      };
    });

    // Invalidate dashboard metrics
    queryClient.invalidateQueries(['dashboard', 'metrics']);

    showSuccessNotification(
      `New inventory lot ${lot_data.id} created`,
      { duration: 4000 }
    );
  }, [queryClient, filters]);

  // Handle inventory lot deletion/voiding
  const handleLotDeleted = useCallback((payload) => {
    const { lot_id, reason, user_id, timestamp } = payload;
    
    setLastUpdate({ type: 'deleted', lot_id, timestamp });

    // Remove from lots list
    const lotsQueryKey = ['inventory', 'lots', filters];
    queryClient.setQueryData(lotsQueryKey, (oldData) => {
      if (!oldData?.lots) return oldData;

      return {
        ...oldData,
        lots: oldData.lots.filter(lot => lot.id !== lot_id),
        count: Math.max(0, oldData.count - 1)
      };
    });

    // Remove individual lot query
    queryClient.removeQueries(['inventory', 'lot', lot_id]);

    // Invalidate dashboard metrics
    queryClient.invalidateQueries(['dashboard', 'metrics']);

    showSuccessNotification(
      `Inventory lot ${lot_id} removed: ${reason}`,
      { duration: 4000 }
    );
  }, [queryClient, filters]);

  // Handle transaction additions
  const handleTransactionAdded = useCallback((payload) => {
    const { transaction, lot_id, user_id, timestamp } = payload;
    
    setLastUpdate({ type: 'transaction', lot_id, timestamp });

    // Invalidate lot details to refresh transaction history
    queryClient.invalidateQueries(['inventory', 'lot', lot_id]);
    
    // Update lot quantity in lists if it's a quantity-affecting transaction
    if (transaction.type === 'Shipment' || transaction.type === 'Adjustment') {
      const lotsQueryKey = ['inventory', 'lots', filters];
      queryClient.setQueryData(lotsQueryKey, (oldData) => {
        if (!oldData?.lots) return oldData;

        return {
          ...oldData,
          lots: oldData.lots.map(lot => {
            if (lot.id === lot_id) {
              const newQuantity = lot.current_quantity + transaction.quantity;
              return { 
                ...lot, 
                current_quantity: Math.max(0, newQuantity),
                updated_at: timestamp
              };
            }
            return lot;
          })
        };
      });
    }

    if (transaction.type === 'Shipment') {
      showSuccessNotification(
        `${Math.abs(transaction.quantity)} units shipped from lot ${lot_id}`,
        { duration: 3000 }
      );
    }
  }, [queryClient, filters]);

  // Set up subscriptions
  useRealtimeSubscription('inventory.lot.updated', handleLotUpdate, [filters]);
  useRealtimeSubscription('inventory.lot.created', handleLotCreated, [filters]);
  useRealtimeSubscription('inventory.lot.deleted', handleLotDeleted, [filters]);
  useRealtimeSubscription('inventory.transaction.added', handleTransactionAdded, [filters]);

  return { lastUpdate };
};

// Hook for preadmission real-time updates
export const usePreadmissionRealtimeUpdates = (filters = {}) => {
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState(null);

  const handlePreadmissionUpdate = useCallback((payload) => {
    const { preadmission_id, changes, user_id, timestamp } = payload;
    
    setLastUpdate({ type: 'update', id: preadmission_id, timestamp });

    // Update preadmissions list
    const queryKey = ['preadmissions', filters];
    queryClient.setQueryData(queryKey, (oldData) => {
      if (!oldData?.preadmissions) return oldData;

      return {
        ...oldData,
        preadmissions: oldData.preadmissions.map(item => 
          item.id === preadmission_id 
            ? { ...item, ...changes, updated_at: timestamp }
            : item
        )
      };
    });

    // Show notification for status changes
    if (changes.status) {
      showSuccessNotification(
        `Preadmission ${preadmission_id} status changed to ${changes.status}`,
        { duration: 3000 }
      );
    }
  }, [queryClient, filters]);

  const handlePreadmissionProcessed = useCallback((payload) => {
    const { preadmission_id, lot_id, customer_id, part_id, quantity } = payload;
    
    setLastUpdate({ type: 'processed', id: preadmission_id, timestamp: Date.now() });

    // Update preadmission status
    queryClient.setQueryData(['preadmissions', filters], (oldData) => {
      if (!oldData?.preadmissions) return oldData;

      return {
        ...oldData,
        preadmissions: oldData.preadmissions.map(item => 
          item.id === preadmission_id 
            ? { ...item, status: 'Processed', processed_to_lot_id: lot_id }
            : item
        )
      };
    });

    // Invalidate inventory queries to show new lot
    queryClient.invalidateQueries(['inventory']);
    queryClient.invalidateQueries(['dashboard', 'metrics']);

    showSuccessNotification(
      `Preadmission processed successfully. New lot ${lot_id} created.`,
      { duration: 5000 }
    );
  }, [queryClient, filters]);

  useRealtimeSubscription('preadmission.updated', handlePreadmissionUpdate, [filters]);
  useRealtimeSubscription('preadmission.processed', handlePreadmissionProcessed, [filters]);

  return { lastUpdate };
};

// Hook for dashboard metrics real-time updates
export const useDashboardRealtimeUpdates = () => {
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState(null);

  const handleMetricsUpdate = useCallback((payload) => {
    const { trigger, timestamp } = payload;
    
    setLastUpdate({ type: 'metrics', trigger, timestamp });

    // Invalidate dashboard metrics to trigger refetch
    queryClient.invalidateQueries(['dashboard', 'metrics']);
    
    // Optionally update specific metrics without full refetch if data is provided
    if (payload.metrics) {
      queryClient.setQueryData(['dashboard', 'metrics'], payload.metrics);
    }
  }, [queryClient]);

  useRealtimeSubscription('dashboard.metrics.updated', handleMetricsUpdate);

  return { lastUpdate };
};

// Hook for user session events
export const useSessionRealtimeUpdates = () => {
  const { ui } = useAppStore();
  const [sessionEvents, setSessionEvents] = useState([]);

  const handleSessionExpired = useCallback((payload) => {
    const { user_id, timestamp } = payload;
    
    setSessionEvents(prev => [...prev, { type: 'expired', timestamp }]);
    
    showErrorNotification(
      'Your session has expired. Please log in again.',
      { persistent: true }
    );

    // Redirect to login after a delay
    setTimeout(() => {
      window.location.href = '/login';
    }, 2000);
  }, []);

  const handlePermissionChanged = useCallback((payload) => {
    const { user_id, new_permissions, timestamp } = payload;
    
    setSessionEvents(prev => [...prev, { type: 'permission_changed', timestamp }]);
    
    showSuccessNotification(
      'Your permissions have been updated. Please refresh to see changes.',
      { persistent: true }
    );
  }, []);

  useRealtimeSubscription('user.session.expired', handleSessionExpired);
  useRealtimeSubscription('user.permission.changed', handlePermissionChanged);

  return { sessionEvents };
};

// Hook for system notifications
export const useSystemRealtimeUpdates = () => {
  const [systemEvents, setSystemEvents] = useState([]);

  const handleMaintenanceScheduled = useCallback((payload) => {
    const { start_time, duration_minutes, message } = payload;
    
    setSystemEvents(prev => [...prev, { 
      type: 'maintenance', 
      start_time, 
      duration_minutes, 
      timestamp: Date.now() 
    }]);
    
    showSuccessNotification(
      `Scheduled maintenance: ${message}`,
      { persistent: true, duration: 10000 }
    );
  }, []);

  const handleSystemError = useCallback((payload) => {
    const { error_id, severity, message, timestamp } = payload;
    
    setSystemEvents(prev => [...prev, { 
      type: 'error', 
      error_id, 
      severity, 
      timestamp 
    }]);
    
    if (severity === 'high') {
      showErrorNotification(
        `System alert: ${message}`,
        { persistent: true }
      );
    }
  }, []);

  useRealtimeSubscription('system.maintenance.scheduled', handleMaintenanceScheduled);
  useRealtimeSubscription('system.error.occurred', handleSystemError);

  return { systemEvents };
};

// Composite hook that sets up all real-time subscriptions for a page
export const usePageRealtimeUpdates = (pageType, filters = {}) => {
  const inventory = pageType.includes('inventory') ? useInventoryRealtimeUpdates(filters) : null;
  const preadmissions = pageType.includes('preadmission') ? usePreadmissionRealtimeUpdates(filters) : null;
  const dashboard = pageType === 'dashboard' ? useDashboardRealtimeUpdates() : null;
  const session = useSessionRealtimeUpdates();
  const system = useSystemRealtimeUpdates();

  return {
    inventory,
    preadmissions,
    dashboard,
    session,
    system
  };
};

// Hook for connection status monitoring
export const useRealtimeConnectionStatus = () => {
  const realtimeService = useRealtimeService();
  const { realtime } = useAppStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    connectionStatus: realtime.connectionStatus,
    isOnline,
    reconnectAttempts: realtime.reconnectAttempts,
    lastHeartbeat: realtime.lastHeartbeat,
    stats: realtimeService?.getStats()
  };
};

export default {
  useRealtimeSubscription,
  useInventoryRealtimeUpdates,
  usePreadmissionRealtimeUpdates,
  useDashboardRealtimeUpdates,
  useSessionRealtimeUpdates,
  useSystemRealtimeUpdates,
  usePageRealtimeUpdates,
  useRealtimeConnectionStatus
};
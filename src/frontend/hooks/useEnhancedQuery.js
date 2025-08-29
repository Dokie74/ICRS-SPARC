// Enhanced React Query configuration with optimistic updates, error handling, and real-time integration
// Provides hooks for common data fetching patterns with built-in state management

import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useCallback, useEffect } from 'react';
import { useAppStore, showErrorNotification, showSuccessNotification } from '../stores/useAppStore';
import apiClient from '../services/api-client';

// Enhanced query configuration with error handling and caching
export const useEnhancedQuery = (key, queryFn, options = {}) => {
  const { ui } = useAppStore();
  const queryClient = useQueryClient();
  
  const enhancedOptions = {
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
    onError: (error) => {
      console.error(`Query ${key} failed:`, error);
      
      if (error?.response?.status === 401) {
        // Handle authentication error
        showErrorNotification('Session expired. Please log in again.');
      } else if (error?.response?.status === 403) {
        showErrorNotification('You don\'t have permission to access this data.');
      } else if (error?.response?.status >= 500) {
        showErrorNotification('Server error. Please try again later.');
      } else {
        showErrorNotification(error?.message || 'An error occurred while loading data.');
      }
    },
    ...options
  };
  
  const query = useQuery(key, queryFn, enhancedOptions);
  
  // Track loading state in global store
  useEffect(() => {
    const loadingKey = Array.isArray(key) ? key.join('.') : key;
    ui.setLoadingState(loadingKey, query.isLoading || query.isFetching);
    
    return () => {
      ui.setLoadingState(loadingKey, false);
    };
  }, [query.isLoading, query.isFetching, key, ui]);
  
  return query;
};

// Enhanced mutation with optimistic updates and error recovery
export const useEnhancedMutation = (mutationFn, options = {}) => {
  const { ui } = useAppStore();
  const queryClient = useQueryClient();
  
  const enhancedOptions = {
    onMutate: async (variables) => {
      // Show loading notification for long operations
      const loadingId = showSuccessNotification('Processing...', { 
        type: 'loading',
        duration: 10000 
      });
      
      // Call original onMutate if provided
      const context = await options.onMutate?.(variables);
      
      return { ...context, loadingId };
    },
    
    onSuccess: (data, variables, context) => {
      // Remove loading notification
      if (context?.loadingId) {
        ui.removeNotification(context.loadingId);
      }
      
      // Show success notification
      if (options.successMessage) {
        showSuccessNotification(
          typeof options.successMessage === 'function' 
            ? options.successMessage(data, variables)
            : options.successMessage
        );
      }
      
      // Invalidate related queries if specified
      if (options.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries(queryKey);
        });
      }
      
      // Call original onSuccess
      options.onSuccess?.(data, variables, context);
    },
    
    onError: (error, variables, context) => {
      // Remove loading notification
      if (context?.loadingId) {
        ui.removeNotification(context.loadingId);
      }
      
      // Revert optimistic updates if provided
      if (context?.rollback) {
        context.rollback();
      }
      
      // Show error notification
      const errorMessage = error?.response?.data?.error || error?.message || 'Operation failed';
      showErrorNotification(errorMessage);
      
      // Call original onError
      options.onError?.(error, variables, context);
    },
    
    ...options
  };
  
  return useMutation(mutationFn, enhancedOptions);
};

// Inventory-specific hooks with optimistic updates
export const useInventoryQuery = (filters = {}) => {
  return useEnhancedQuery(
    ['inventory', 'lots', filters],
    () => apiClient.inventory.getAllLots(filters),
    {
      staleTime: 30 * 1000, // 30 seconds for inventory data
      keepPreviousData: true,
      select: (data) => ({
        lots: data.data || [],
        count: data.count || 0,
        success: data.success
      })
    }
  );
};

export const useInventoryLotQuery = (lotId) => {
  return useEnhancedQuery(
    ['inventory', 'lot', lotId],
    () => apiClient.inventory.getLotById(lotId),
    {
      enabled: !!lotId,
      select: (data) => data.data
    }
  );
};

export const useCreateInventoryLotMutation = () => {
  const queryClient = useQueryClient();
  
  return useEnhancedMutation(
    (lotData) => apiClient.inventory.createLot(lotData),
    {
      successMessage: 'Inventory lot created successfully',
      invalidateQueries: [['inventory'], ['dashboard', 'metrics']],
      
      // Optimistic update
      onMutate: async (newLot) => {
        // Cancel outgoing queries
        await queryClient.cancelQueries(['inventory', 'lots']);
        
        // Get current data
        const previousLots = queryClient.getQueryData(['inventory', 'lots']);
        
        // Optimistically update
        if (previousLots) {
          queryClient.setQueryData(['inventory', 'lots'], (old) => ({
            ...old,
            lots: [{ ...newLot, id: `temp_${Date.now()}`, status: 'Creating...' }, ...old.lots],
            count: old.count + 1
          }));
        }
        
        return { 
          previousLots,
          rollback: () => queryClient.setQueryData(['inventory', 'lots'], previousLots)
        };
      }
    }
  );
};

export const useUpdateInventoryLotMutation = () => {
  const queryClient = useQueryClient();
  
  return useEnhancedMutation(
    ({ lotId, updates }) => apiClient.inventory.updateLot(lotId, updates),
    {
      successMessage: 'Inventory lot updated successfully',
      invalidateQueries: [['inventory']],
      
      // Optimistic update
      onMutate: async ({ lotId, updates }) => {
        await queryClient.cancelQueries(['inventory', 'lot', lotId]);
        await queryClient.cancelQueries(['inventory', 'lots']);
        
        const previousLot = queryClient.getQueryData(['inventory', 'lot', lotId]);
        const previousLots = queryClient.getQueryData(['inventory', 'lots']);
        
        // Update individual lot
        if (previousLot) {
          queryClient.setQueryData(['inventory', 'lot', lotId], {
            ...previousLot,
            ...updates,
            updated_at: new Date().toISOString()
          });
        }
        
        // Update lots list
        if (previousLots) {
          queryClient.setQueryData(['inventory', 'lots'], (old) => ({
            ...old,
            lots: old.lots.map(lot => 
              lot.id === lotId 
                ? { ...lot, ...updates, updated_at: new Date().toISOString() }
                : lot
            )
          }));
        }
        
        return {
          previousLot,
          previousLots,
          rollback: () => {
            queryClient.setQueryData(['inventory', 'lot', lotId], previousLot);
            queryClient.setQueryData(['inventory', 'lots'], previousLots);
          }
        };
      }
    }
  );
};

// Customer-specific hooks
export const useCustomersQuery = (filters = {}) => {
  return useEnhancedQuery(
    ['customers', filters],
    () => apiClient.customers.getAll(filters),
    {
      select: (data) => ({
        customers: data.data || [],
        count: data.count || 0
      })
    }
  );
};

export const useCustomerQuery = (customerId) => {
  return useEnhancedQuery(
    ['customer', customerId],
    () => apiClient.customers.getById(customerId),
    {
      enabled: !!customerId,
      select: (data) => data.data
    }
  );
};

// Parts-specific hooks
export const usePartsQuery = (filters = {}) => {
  return useEnhancedQuery(
    ['parts', filters],
    () => apiClient.parts.getAll(filters),
    {
      select: (data) => ({
        parts: data.data || [],
        count: data.count || 0
      })
    }
  );
};

// Dashboard-specific hooks
export const useDashboardMetricsQuery = () => {
  return useEnhancedQuery(
    ['dashboard', 'metrics'],
    () => apiClient.dashboard.getMetrics(),
    {
      staleTime: 60 * 1000, // 1 minute
      refetchInterval: 5 * 60 * 1000, // 5 minutes
      select: (data) => data.data
    }
  );
};

// Real-time query sync hook
export const useRealtimeQuerySync = (queryKeys = []) => {
  const queryClient = useQueryClient();
  const { realtime } = useAppStore();
  
  useEffect(() => {
    if (realtime.connectionStatus !== 'connected') return;
    
    // Subscribe to relevant real-time events
    const subscriptions = [];
    
    queryKeys.forEach(queryKey => {
      if (queryKey.includes('inventory')) {
        // Subscribe to inventory changes
        const unsubscribe = realtime.addSubscription(
          'inventory.updated',
          `query_sync_${queryKey.join('_')}`,
          (payload) => {
            // Invalidate and refetch affected queries
            queryClient.invalidateQueries(queryKey);
            
            // Show notification for real-time updates
            showSuccessNotification(`${payload.type || 'Data'} updated in real-time`);
          }
        );
        subscriptions.push(unsubscribe);
      }
    });
    
    return () => {
      subscriptions.forEach(unsub => unsub?.());
    };
  }, [queryClient, realtime.connectionStatus, queryKeys]);
};

// Batch operations hook
export const useBatchMutation = () => {
  const queryClient = useQueryClient();
  
  return useEnhancedMutation(
    async (operations) => {
      const results = [];
      for (const operation of operations) {
        try {
          const result = await operation.mutationFn(operation.variables);
          results.push({ success: true, result, operation });
        } catch (error) {
          results.push({ success: false, error, operation });
        }
      }
      return results;
    },
    {
      onSuccess: (results) => {
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        if (successful.length > 0) {
          showSuccessNotification(`${successful.length} operations completed successfully`);
        }
        
        if (failed.length > 0) {
          showErrorNotification(`${failed.length} operations failed`);
        }
        
        // Invalidate related queries
        const queryKeysToInvalidate = new Set();
        results.forEach(result => {
          if (result.operation.invalidateQueries) {
            result.operation.invalidateQueries.forEach(key => queryKeysToInvalidate.add(key));
          }
        });
        
        queryKeysToInvalidate.forEach(key => {
          queryClient.invalidateQueries(key);
        });
      }
    }
  );
};

// Cache management hook
export const useQueryCache = () => {
  const queryClient = useQueryClient();
  
  const clearCache = useCallback((pattern) => {
    if (pattern) {
      queryClient.invalidateQueries(pattern);
    } else {
      queryClient.clear();
    }
  }, [queryClient]);
  
  const prefetchQuery = useCallback((key, queryFn, options = {}) => {
    return queryClient.prefetchQuery(key, queryFn, {
      staleTime: 5 * 60 * 1000, // 5 minutes
      ...options
    });
  }, [queryClient]);
  
  const getQueryData = useCallback((key) => {
    return queryClient.getQueryData(key);
  }, [queryClient]);
  
  const setQueryData = useCallback((key, updater) => {
    return queryClient.setQueryData(key, updater);
  }, [queryClient]);
  
  return {
    clearCache,
    prefetchQuery,
    getQueryData,
    setQueryData
  };
};

export default {
  useEnhancedQuery,
  useEnhancedMutation,
  useInventoryQuery,
  useInventoryLotQuery,
  useCreateInventoryLotMutation,
  useUpdateInventoryLotMutation,
  useCustomersQuery,
  useCustomerQuery,
  usePartsQuery,
  useDashboardMetricsQuery,
  useRealtimeQuerySync,
  useBatchMutation,
  useQueryCache
};
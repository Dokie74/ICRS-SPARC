// tests/frontend/hooks/useInventoryQuery.test.js
// State management testing for React Query + Zustand integration

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { create } from 'zustand';

import { useInventoryQuery, useInventoryMutation } from '../../../src/frontend/hooks/useInventoryQuery';
import { useAppStore } from '../../../src/frontend/stores/useAppStore';

// Mock API client
const mockApiClient = {
  inventory: {
    getAllLots: jest.fn(),
    getLotById: jest.fn(),
    createLot: jest.fn(),
    adjustLotQuantity: jest.fn(),
    changeLotStatus: jest.fn(),
    searchLots: jest.fn(),
    getInventorySummary: jest.fn()
  }
};

jest.mock('../../../src/frontend/services/api-client', () => mockApiClient);

// Mock Zustand store
const mockUseAppStore = create((set, get) => ({
  ui: {
    notifications: [],
    loadingStates: {}
  },
  addNotification: (notification) =>
    set(state => ({ 
      ui: { 
        ...state.ui, 
        notifications: [...state.ui.notifications, notification] 
      } 
    })),
  setLoadingState: (key, loading) =>
    set(state => ({
      ui: {
        ...state.ui,
        loadingStates: { ...state.ui.loadingStates, [key]: loading }
      }
    })),
  clearNotifications: () =>
    set(state => ({ ui: { ...state.ui, notifications: [] } }))
}));

jest.mock('../../../src/frontend/stores/useAppStore', () => ({
  useAppStore: mockUseAppStore
}));

// Test wrapper for React Query
const createQueryWrapper = (initialData = null) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0
      },
      mutations: {
        retry: false
      }
    }
  });

  // Pre-populate cache if initial data provided
  if (initialData) {
    queryClient.setQueryData(['inventory', 'lots'], initialData);
  }

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Mock inventory data
const mockInventoryLots = [
  {
    id: 'LOT-001',
    part_id: 'part-1',
    customer_id: 'customer-1',
    status: 'In Stock',
    current_quantity: 100,
    original_quantity: 150,
    created_at: '2024-01-15T10:00:00.000Z'
  },
  {
    id: 'LOT-002',
    part_id: 'part-2',
    customer_id: 'customer-1',
    status: 'On Hold',
    current_quantity: 75,
    original_quantity: 75,
    created_at: '2024-01-20T14:30:00.000Z'
  }
];

describe('useInventoryQuery Hook', () => {
  let queryWrapper;

  beforeEach(() => {
    queryWrapper = createQueryWrapper();
    jest.clearAllMocks();
    
    // Reset Zustand store
    mockUseAppStore.setState({
      ui: { notifications: [], loadingStates: {} }
    });

    // Default successful response
    mockApiClient.inventory.getAllLots.mockResolvedValue({
      success: true,
      data: mockInventoryLots,
      count: mockInventoryLots.length
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Basic Query Functionality', () => {
    test('fetches inventory data successfully', async () => {
      const { result } = renderHook(() => useInventoryQuery(), {
        wrapper: queryWrapper
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockInventoryLots);
      expect(result.current.error).toBeNull();
      expect(mockApiClient.inventory.getAllLots).toHaveBeenCalledTimes(1);
    });

    test('handles query options correctly', async () => {
      const queryOptions = {
        filters: [{ column: 'status', value: 'In Stock' }],
        orderBy: { column: 'created_at', ascending: false },
        limit: 50,
        offset: 0
      };

      const { result } = renderHook(() => useInventoryQuery(queryOptions), {
        wrapper: queryWrapper
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApiClient.inventory.getAllLots).toHaveBeenCalledWith(queryOptions);
    });

    test('handles API error gracefully', async () => {
      const errorMessage = 'Failed to fetch inventory data';
      mockApiClient.inventory.getAllLots.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useInventoryQuery(), {
        wrapper: queryWrapper
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toBeUndefined();

      // Should add notification to store
      const notifications = mockUseAppStore.getState().ui.notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('error');
      expect(notifications[0].message).toContain('Failed to fetch inventory data');
    });

    test('implements proper caching behavior', async () => {
      // First render
      const { result: result1, unmount: unmount1 } = renderHook(
        () => useInventoryQuery(),
        { wrapper: queryWrapper }
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      unmount1();

      // Second render should use cached data
      const { result: result2 } = renderHook(
        () => useInventoryQuery(),
        { wrapper: queryWrapper }
      );

      expect(result2.current.data).toEqual(mockInventoryLots);
      expect(result2.current.isLoading).toBe(false);
      
      // API should only be called once (first render)
      expect(mockApiClient.inventory.getAllLots).toHaveBeenCalledTimes(1);
    });
  });

  describe('Query Invalidation and Refetching', () => {
    test('refetches data when query is invalidated', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } }
      });
      
      const TestWrapper = ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useInventoryQuery(), {
        wrapper: TestWrapper
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Clear mock call history
      mockApiClient.inventory.getAllLots.mockClear();

      // Invalidate query
      act(() => {
        queryClient.invalidateQueries(['inventory', 'lots']);
      });

      await waitFor(() => {
        expect(mockApiClient.inventory.getAllLots).toHaveBeenCalledTimes(1);
      });
    });

    test('handles background refetch on window focus', async () => {
      const { result } = renderHook(() => useInventoryQuery(), {
        wrapper: queryWrapper
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Clear initial fetch
      mockApiClient.inventory.getAllLots.mockClear();

      // Simulate window focus event
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });

      await waitFor(() => {
        expect(mockApiClient.inventory.getAllLots).toHaveBeenCalledTimes(1);
      });
    });

    test('implements automatic background refresh', async () => {
      const { result } = renderHook(() => useInventoryQuery({}, { 
        refetchInterval: 100 // 100ms for testing
      }), {
        wrapper: queryWrapper
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Initial fetch
      expect(mockApiClient.inventory.getAllLots).toHaveBeenCalledTimes(1);

      // Wait for background refresh
      await waitFor(() => {
        expect(mockApiClient.inventory.getAllLots).toHaveBeenCalledTimes(2);
      }, { timeout: 200 });
    });
  });

  describe('Search and Filtering', () => {
    test('handles search query correctly', async () => {
      const searchTerm = 'LOT-001';
      const searchResults = [mockInventoryLots[0]];

      mockApiClient.inventory.searchLots.mockResolvedValue({
        success: true,
        data: searchResults
      });

      const { result } = renderHook(() => useInventoryQuery({ 
        search: searchTerm 
      }), {
        wrapper: queryWrapper
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApiClient.inventory.getAllLots).toHaveBeenCalledWith({
        search: searchTerm
      });
    });

    test('debounces search input', async () => {
      let searchTerm = '';
      const { result, rerender } = renderHook(() => useInventoryQuery({ 
        search: searchTerm,
        debounceMs: 50
      }), {
        wrapper: queryWrapper
      });

      // Simulate rapid typing
      searchTerm = 'L';
      rerender();
      
      searchTerm = 'LO';
      rerender();
      
      searchTerm = 'LOT';
      rerender();
      
      // Should not trigger API calls during debounce period
      expect(mockApiClient.inventory.getAllLots).toHaveBeenCalledTimes(1);

      // Wait for debounce to complete
      await waitFor(() => {
        expect(mockApiClient.inventory.getAllLots).toHaveBeenCalledWith({
          search: 'LOT',
          debounceMs: 50
        });
      }, { timeout: 100 });
    });
  });

  describe('Loading States Integration', () => {
    test('updates global loading state during query', async () => {
      const { result } = renderHook(() => useInventoryQuery(), {
        wrapper: queryWrapper
      });

      // Should set loading state
      expect(result.current.isLoading).toBe(true);
      
      const loadingStates = mockUseAppStore.getState().ui.loadingStates;
      expect(loadingStates.inventory_query).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should clear loading state
      const finalLoadingStates = mockUseAppStore.getState().ui.loadingStates;
      expect(finalLoadingStates.inventory_query).toBe(false);
    });

    test('handles concurrent queries correctly', async () => {
      // Render two hooks simultaneously
      const { result: result1 } = renderHook(() => useInventoryQuery(), {
        wrapper: queryWrapper
      });

      const { result: result2 } = renderHook(() => useInventoryQuery(), {
        wrapper: queryWrapper
      });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
        expect(result2.current.isSuccess).toBe(true);
      });

      // Should share the same cached data
      expect(result1.current.data).toEqual(result2.current.data);
      
      // API should only be called once due to React Query deduplication
      expect(mockApiClient.inventory.getAllLots).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Recovery and Retry Logic', () => {
    test('implements exponential backoff retry', async () => {
      let callCount = 0;
      mockApiClient.inventory.getAllLots.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Temporary network error'));
        }
        return Promise.resolve({
          success: true,
          data: mockInventoryLots
        });
      });

      const { result } = renderHook(() => useInventoryQuery({}, {
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
      }), {
        wrapper: queryWrapper
      });

      // Should eventually succeed after retries
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      }, { timeout: 5000 });

      expect(callCount).toBe(3);
      expect(result.current.data).toEqual(mockInventoryLots);
    });

    test('handles network errors gracefully', async () => {
      mockApiClient.inventory.getAllLots.mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useInventoryQuery(), {
        wrapper: queryWrapper
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error.message).toBe('Network Error');
      
      // Should show user-friendly notification
      const notifications = mockUseAppStore.getState().ui.notifications;
      expect(notifications[0].message).toContain('connection problem');
    });
  });

  describe('Real-time Updates Integration', () => {
    test('updates query data on real-time events', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } }
      });
      
      const TestWrapper = ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useInventoryQuery(), {
        wrapper: TestWrapper
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Simulate real-time lot update
      const updatedLot = {
        ...mockInventoryLots[0],
        current_quantity: 90
      };

      act(() => {
        // Simulate WebSocket event handler
        queryClient.setQueryData(['inventory', 'lots'], (oldData) => {
          if (!oldData) return oldData;
          return oldData.map(lot => 
            lot.id === updatedLot.id ? updatedLot : lot
          );
        });
      });

      // Query data should be updated immediately
      const updatedData = result.current.data;
      const updatedItem = updatedData.find(lot => lot.id === 'LOT-001');
      expect(updatedItem.current_quantity).toBe(90);
    });

    test('handles real-time lot creation', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } }
      });
      
      const TestWrapper = ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useInventoryQuery(), {
        wrapper: TestWrapper
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const newLot = {
        id: 'LOT-003',
        part_id: 'part-3',
        customer_id: 'customer-2',
        status: 'In Stock',
        current_quantity: 200,
        original_quantity: 200,
        created_at: new Date().toISOString()
      };

      act(() => {
        // Simulate real-time lot creation event
        queryClient.setQueryData(['inventory', 'lots'], (oldData) => {
          return [newLot, ...(oldData || [])];
        });
      });

      // New lot should appear at the beginning of the list
      expect(result.current.data).toHaveLength(3);
      expect(result.current.data[0]).toEqual(newLot);
    });

    test('handles optimistic updates with rollback', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } }
      });
      
      const TestWrapper = ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useInventoryQuery(), {
        wrapper: TestWrapper
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const originalData = result.current.data;
      const optimisticUpdate = {
        ...mockInventoryLots[0],
        current_quantity: 50,
        id: 'temp_optimistic_id'
      };

      // Apply optimistic update
      act(() => {
        queryClient.setQueryData(['inventory', 'lots'], [optimisticUpdate, ...originalData]);
      });

      // Should show optimistic data
      expect(result.current.data[0]).toEqual(optimisticUpdate);

      // Simulate failed update - rollback to original data
      act(() => {
        queryClient.setQueryData(['inventory', 'lots'], originalData);
      });

      // Should revert to original data
      expect(result.current.data).toEqual(originalData);
    });
  });
});
// src/frontend/services/preshipmentService.js
// Service layer for preshipment API operations
// Handles all preshipment-related API calls with React Query integration

import apiClient from './api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// Query keys for React Query caching
export const PRESHIPMENT_QUERY_KEYS = {
  all: ['preshipments'],
  lists: () => [...PRESHIPMENT_QUERY_KEYS.all, 'list'],
  list: (filters) => [...PRESHIPMENT_QUERY_KEYS.lists(), filters],
  details: () => [...PRESHIPMENT_QUERY_KEYS.all, 'detail'],
  detail: (id) => [...PRESHIPMENT_QUERY_KEYS.details(), id],
  lineItems: (id) => [...PRESHIPMENT_QUERY_KEYS.all, 'lineItems', id],
  aceEntry: (id) => [...PRESHIPMENT_QUERY_KEYS.all, 'aceEntry', id],
};

// Preshipment API service class
class PreshipmentService {
  // Get all preshipments with optional filtering
  async getAll(params = {}) {
    try {
      const result = await apiClient.preshipments.getAll(params);
      return result;
    } catch (error) {
      console.error('Error fetching preshipments:', error);
      throw error;
    }
  }

  // Get preshipment by ID with full details
  async getById(id) {
    try {
      const result = await apiClient.preshipments.getById(id);
      return result;
    } catch (error) {
      console.error('Error fetching preshipment:', error);
      throw error;
    }
  }

  // Create new preshipment
  async create(preshipmentData) {
    try {
      const result = await apiClient.preshipments.create(preshipmentData);
      return result;
    } catch (error) {
      console.error('Error creating preshipment:', error);
      throw error;
    }
  }

  // Update existing preshipment
  async update(id, preshipmentData) {
    try {
      const result = await apiClient.preshipments.update(id, preshipmentData);
      return result;
    } catch (error) {
      console.error('Error updating preshipment:', error);
      throw error;
    }
  }

  // Delete preshipment
  async delete(id) {
    try {
      const result = await apiClient.preshipments.delete(id);
      return result;
    } catch (error) {
      console.error('Error deleting preshipment:', error);
      throw error;
    }
  }

  // Update preshipment status
  async updateStatus(id, status, notes = '') {
    try {
      const result = await apiClient.preshipments.updateStatus(id, status, notes);
      return result;
    } catch (error) {
      console.error('Error updating preshipment status:', error);
      throw error;
    }
  }

  // Generate ACE entry summary
  async generateEntryS(id) {
    try {
      const result = await apiClient.preshipments.generateEntryS(id);
      return result;
    } catch (error) {
      console.error('Error generating entry summary:', error);
      throw error;
    }
  }

  // File with CBP
  async fileWithCBP(id) {
    try {
      const result = await apiClient.preshipments.fileWithCBP(id);
      return result;
    } catch (error) {
      console.error('Error filing with CBP:', error);
      throw error;
    }
  }

  // Get available inventory lots for line item selection
  async getAvailableLots(params = {}) {
    try {
      const result = await apiClient.get('/inventory/lots/available', params);
      return result;
    } catch (error) {
      console.error('Error fetching available lots:', error);
      throw error;
    }
  }

  // Validate ACE entry data
  async validateACEEntry(entryData) {
    try {
      const result = await apiClient.preshipments.validateACEEntry(entryData);
      return result;
    } catch (error) {
      console.error('Error validating ACE entry:', error);
      throw error;
    }
  }

  // Get preshipment statistics
  async getStats() {
    try {
      const result = await apiClient.preshipments.getStats();
      return result;
    } catch (error) {
      console.error('Error fetching preshipment stats:', error);
      throw error;
    }
  }
}

// Create singleton instance
const preshipmentService = new PreshipmentService();

// React Query hooks for preshipment operations

// Hook to fetch all preshipments with filtering
export const usePreshipments = (filters = {}) => {
  return useQuery({
    queryKey: PRESHIPMENT_QUERY_KEYS.list(filters),
    queryFn: () => preshipmentService.getAll(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to fetch preshipment by ID
export const usePreshipment = (id) => {
  return useQuery({
    queryKey: PRESHIPMENT_QUERY_KEYS.detail(id),
    queryFn: () => preshipmentService.getById(id),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Hook to fetch preshipment statistics
export const usePreshipmentStats = () => {
  return useQuery({
    queryKey: [...PRESHIPMENT_QUERY_KEYS.all, 'stats'],
    queryFn: () => preshipmentService.getStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to fetch available inventory lots
export const useAvailableLots = (params = {}) => {
  return useQuery({
    queryKey: ['inventory', 'lots', 'available', params],
    queryFn: () => preshipmentService.getAvailableLots(params),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Hook to create preshipment
export const useCreatePreshipment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: preshipmentService.create,
    onSuccess: (data) => {
      // Invalidate and refetch preshipments list
      queryClient.invalidateQueries(PRESHIPMENT_QUERY_KEYS.lists());
      toast.success('Preshipment created successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Error creating preshipment');
    },
  });
};

// Hook to update preshipment
export const useUpdatePreshipment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => preshipmentService.update(id, data),
    onSuccess: (data, { id }) => {
      // Invalidate related queries
      queryClient.invalidateQueries(PRESHIPMENT_QUERY_KEYS.lists());
      queryClient.invalidateQueries(PRESHIPMENT_QUERY_KEYS.detail(id));
      toast.success('Preshipment updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Error updating preshipment');
    },
  });
};

// Hook to delete preshipment
export const useDeletePreshipment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: preshipmentService.delete,
    onSuccess: () => {
      // Invalidate preshipments list
      queryClient.invalidateQueries(PRESHIPMENT_QUERY_KEYS.lists());
      toast.success('Preshipment deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Error deleting preshipment');
    },
  });
};

// Hook to update preshipment status
export const useUpdatePreshipmentStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status, notes }) => preshipmentService.updateStatus(id, status, notes),
    onSuccess: (data, { id }) => {
      // Invalidate related queries
      queryClient.invalidateQueries(PRESHIPMENT_QUERY_KEYS.lists());
      queryClient.invalidateQueries(PRESHIPMENT_QUERY_KEYS.detail(id));
      toast.success('Preshipment status updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Error updating preshipment status');
    },
  });
};

// Hook to generate entry summary
export const useGenerateEntryS = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: preshipmentService.generateEntryS,
    onSuccess: (data, id) => {
      queryClient.invalidateQueries(PRESHIPMENT_QUERY_KEYS.detail(id));
      toast.success('Entry summary generated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Error generating entry summary');
    },
  });
};

// Hook to file with CBP
export const useFileWithCBP = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: preshipmentService.fileWithCBP,
    onSuccess: (data, id) => {
      queryClient.invalidateQueries(PRESHIPMENT_QUERY_KEYS.lists());
      queryClient.invalidateQueries(PRESHIPMENT_QUERY_KEYS.detail(id));
      toast.success('Successfully filed with CBP');
    },
    onError: (error) => {
      toast.error(error.message || 'Error filing with CBP');
    },
  });
};

// Hook to validate ACE entry
export const useValidateACEEntry = () => {
  return useMutation({
    mutationFn: preshipmentService.validateACEEntry,
    onError: (error) => {
      toast.error(error.message || 'Error validating ACE entry');
    },
  });
};

export default preshipmentService;

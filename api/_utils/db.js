// api/_utils/db.js - Database client utilities for Vercel functions
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with service role for admin operations
function createSupabaseClient(accessToken = null) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  // If access token is provided, set it for RLS
  if (accessToken) {
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: null
    });
  }

  return supabase;
}

// Wrapper for the original supabaseClient pattern
class SupabaseClient {
  constructor(accessToken) {
    this.client = createSupabaseClient(accessToken);
    this.accessToken = accessToken;
  }

  async getAll(table, options = {}, returnCount = false) {
    try {
      let query = this.client.from(table).select(options.select || '*', { count: 'exact' });

      // Handle search functionality
      if (options.searchTerm && options.searchColumns) {
        const searchTerm = options.searchTerm;
        const searchConditions = options.searchColumns.map(col => `${col}.ilike.%${searchTerm}%`).join(',');
        query = query.or(searchConditions);
      }

      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (typeof value === 'string' && value.includes(',') && key === 'or') {
            // Handle legacy 'or' filter format
            query = query.or(value);
          } else {
            query = query.eq(key, value);
          }
        });
      }

      if (options.orderBy) {
        const { column, ascending = true } = options.orderBy;
        query = query.order(column, { ascending });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        count: count || 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: [],
        count: 0
      };
    }
  }

  async getById(table, id, options = {}) {
    try {
      const { data, error } = await this.client
        .from(table)
        .select(options.select || '*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async create(table, payload, options = {}) {
    try {
      const { data, error } = await this.client
        .from(table)
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async update(table, id, payload, options = {}) {
    try {
      const { data, error } = await this.client
        .from(table)
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async delete(table, id, options = {}) {
    try {
      const { error } = await this.client
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = { createSupabaseClient, SupabaseClient };
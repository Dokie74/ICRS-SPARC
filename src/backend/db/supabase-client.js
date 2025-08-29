// src/backend/db/supabase-client.js
// Supabase client abstraction for ICRS SPARC backend
// Preserves RLS integration and standardized patterns from original ICRS

const { createClient } = require('@supabase/supabase-js');

class SupabaseClient {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) {
      throw new Error('Missing required Supabase environment variables');
    }

    // Service role client for admin operations (bypasses RLS)
    if (supabaseServiceKey) {
      this.adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    }

    // Anonymous client for user operations (respects RLS)
    this.anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    });

    this.defaultClient = this.anonClient;
  }

  // Get client with user context for RLS
  getClientForUser(accessToken = null) {
    if (accessToken) {
      const clientWithAuth = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          },
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        }
      );
      return clientWithAuth;
    }
    return this.anonClient;
  }

  // Get admin client (bypasses RLS)
  getAdminClient() {
    if (!this.adminClient) {
      throw new Error('Admin client not available - missing SUPABASE_SERVICE_KEY');
    }
    return this.adminClient;
  }

  // Generic CRUD operations with standardized response pattern
  async getAll(table, options = {}, useAdminClient = false) {
    try {
      const client = useAdminClient ? this.getAdminClient() : 
        this.getClientForUser(options.accessToken);
      
      let query = client.from(table).select(options.select || '*');
      
      // Apply filters
      if (options.filters) {
        options.filters.forEach(filter => {
          switch (filter.operator || 'eq') {
            case 'eq':
              query = query.eq(filter.column, filter.value);
              break;
            case 'neq':
              query = query.neq(filter.column, filter.value);
              break;
            case 'gt':
              query = query.gt(filter.column, filter.value);
              break;
            case 'gte':
              query = query.gte(filter.column, filter.value);
              break;
            case 'lt':
              query = query.lt(filter.column, filter.value);
              break;
            case 'lte':
              query = query.lte(filter.column, filter.value);
              break;
            case 'like':
              query = query.like(filter.column, filter.value);
              break;
            case 'ilike':
              query = query.ilike(filter.column, filter.value);
              break;
            case 'in':
              query = query.in(filter.column, filter.value);
              break;
            default:
              query = query.eq(filter.column, filter.value);
          }
        });
      }
      
      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { 
          ascending: options.orderBy.ascending ?? true 
        });
      }
      
      // Apply limit and pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 999) - 1);
      }
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      return { 
        success: true, 
        data: data || [], 
        count: count || data?.length || 0 
      };
    } catch (error) {
      console.error(`Error fetching ${table}:`, error);
      return { success: false, error: error.message };
    }
  }

  async getById(table, id, options = {}, useAdminClient = false) {
    try {
      const client = useAdminClient ? this.getAdminClient() : 
        this.getClientForUser(options.accessToken);
      
      const { data, error } = await client
        .from(table)
        .select(options.select || '*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error(`Error fetching ${table} by ID:`, error);
      return { success: false, error: error.message };
    }
  }

  async create(table, data, options = {}, useAdminClient = false) {
    try {
      const client = useAdminClient ? this.getAdminClient() : 
        this.getClientForUser(options.accessToken);
      
      const { data: result, error } = await client
        .from(table)
        .insert([data])
        .select()
        .single();
      
      if (error) throw error;
      
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error creating ${table}:`, error);
      return { success: false, error: error.message };
    }
  }

  async update(table, id, data, options = {}, useAdminClient = false) {
    try {
      const client = useAdminClient ? this.getAdminClient() : 
        this.getClientForUser(options.accessToken);
      
      const { data: result, error } = await client
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error updating ${table}:`, error);
      return { success: false, error: error.message };
    }
  }

  async delete(table, id, options = {}, useAdminClient = false) {
    try {
      const client = useAdminClient ? this.getAdminClient() : 
        this.getClientForUser(options.accessToken);
      
      const { error } = await client
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error(`Error deleting ${table}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Batch operations
  async createBatch(table, dataArray, options = {}, useAdminClient = false) {
    try {
      const client = useAdminClient ? this.getAdminClient() : 
        this.getClientForUser(options.accessToken);
      
      const { data: result, error } = await client
        .from(table)
        .insert(dataArray)
        .select();
      
      if (error) throw error;
      
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error batch creating ${table}:`, error);
      return { success: false, error: error.message };
    }
  }

  async upsertBatch(table, dataArray, options = {}, useAdminClient = false) {
    try {
      const client = useAdminClient ? this.getAdminClient() : 
        this.getClientForUser(options.accessToken);
      
      const { data: result, error } = await client
        .from(table)
        .upsert(dataArray, { onConflict: options.onConflict || 'id' })
        .select();
      
      if (error) throw error;
      
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error batch upserting ${table}:`, error);
      return { success: false, error: error.message };
    }
  }

  // RPC (Remote Procedure Call) operations
  async callFunction(functionName, params = {}, options = {}, useAdminClient = false) {
    try {
      const client = useAdminClient ? this.getAdminClient() : 
        this.getClientForUser(options.accessToken);
      
      const { data, error } = await client.rpc(functionName, params);
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error(`Error calling function ${functionName}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Real-time subscriptions (server-side channels)
  createSubscription(table, callback, filters = {}) {
    const client = this.anonClient; // Use anon client for subscriptions
    
    let subscription = client
      .channel(`${table}_changes`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: table,
          ...filters 
        }, 
        callback
      )
      .subscribe();

    return subscription;
  }

  // Authentication helpers
  async getCurrentUser(accessToken) {
    try {
      const client = this.getClientForUser(accessToken);
      const { data: { user }, error } = await client.auth.getUser();
      
      if (error) throw error;
      
      return { success: true, data: user };
    } catch (error) {
      console.error('Error getting current user:', error);
      return { success: false, error: error.message };
    }
  }

  async verifyAccessToken(accessToken) {
    try {
      const client = this.getClientForUser(accessToken);
      const { data, error } = await client.auth.getUser();
      
      if (error) throw error;
      
      return { success: true, data: data.user };
    } catch (error) {
      console.error('Error verifying access token:', error);
      return { success: false, error: error.message };
    }
  }

  // File storage operations
  async uploadFile(bucket, path, file, options = {}) {
    try {
      const client = this.getClientForUser(options.accessToken);
      
      const { data, error } = await client.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: options.upsert || false
        });
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error uploading file:', error);
      return { success: false, error: error.message };
    }
  }

  async getFileUrl(bucket, path) {
    try {
      const { data } = this.anonClient.storage
        .from(bucket)
        .getPublicUrl(path);
      
      return { success: true, data: data.publicUrl };
    } catch (error) {
      console.error('Error getting file URL:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SupabaseClient();
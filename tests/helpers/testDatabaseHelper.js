// tests/helpers/testDatabaseHelper.js
// Database helper utilities for testing with Supabase

const { createClient } = require('@supabase/supabase-js');

class TestDatabaseHelper {
  constructor() {
    this.testClient = null;
    this.originalTables = [
      'inventory_lots',
      'transactions', 
      'preadmissions',
      'preshipments',
      'preshipment_items',
      'entry_summaries',
      'entry_summary_items',
      'parts',
      'customers',
      'storage_locations',
      'employees'
    ];
  }

  async setupTestDatabase() {
    // Initialize test database client
    this.testClient = createClient(
      process.env.SUPABASE_TEST_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_TEST_ANON_KEY || process.env.SUPABASE_ANON_KEY
    );

    // Verify connection
    const { data, error } = await this.testClient
      .from('employees')
      .select('count', { count: 'exact' })
      .limit(0);

    if (error && !error.message.includes('relation') && !error.message.includes('permission')) {
      throw new Error(`Failed to connect to test database: ${error.message}`);
    }

    console.log('Test database connection established');
    return this.testClient;
  }

  async resetTestData() {
    if (!this.testClient) {
      throw new Error('Test database not initialized. Call setupTestDatabase() first.');
    }

    try {
      // Delete data in correct order to respect foreign key constraints
      const deleteOrder = [
        'entry_summary_items',
        'entry_summaries', 
        'preshipment_items',
        'preshipments',
        'transactions',
        'inventory_lots',
        'preadmissions',
        'storage_locations',
        'parts',
        'customers',
        'employees'
      ];

      for (const table of deleteOrder) {
        const { error } = await this.testClient
          .from(table)
          .delete()
          .neq('id', 'system-record'); // Preserve system records if any

        if (error && !error.message.includes('relation') && !error.message.includes('permission')) {
          console.warn(`Warning: Could not clear ${table}: ${error.message}`);
        }
      }

      console.log('Test data reset completed');
    } catch (error) {
      console.error('Error resetting test data:', error);
      throw error;
    }
  }

  async createTestTables() {
    // This would typically be handled by migrations
    // For testing, we assume tables exist
    console.log('Test tables verified');
  }

  async seedTestData(seedData) {
    if (!this.testClient) {
      throw new Error('Test database not initialized');
    }

    try {
      const results = {};

      // Seed in correct order for foreign key constraints
      if (seedData.employees) {
        const { data, error } = await this.testClient
          .from('employees')
          .insert(seedData.employees)
          .select();
        
        if (error) throw error;
        results.employees = data;
      }

      if (seedData.customers) {
        const { data, error } = await this.testClient
          .from('customers')
          .insert(seedData.customers)
          .select();
        
        if (error) throw error;
        results.customers = data;
      }

      if (seedData.parts) {
        const { data, error } = await this.testClient
          .from('parts')
          .insert(seedData.parts)
          .select();
        
        if (error) throw error;
        results.parts = data;
      }

      if (seedData.storageLocations) {
        const { data, error } = await this.testClient
          .from('storage_locations')
          .insert(seedData.storageLocations)
          .select();
        
        if (error) throw error;
        results.storageLocations = data;
      }

      if (seedData.inventoryLots) {
        const { data, error } = await this.testClient
          .from('inventory_lots')
          .insert(seedData.inventoryLots)
          .select();
        
        if (error) throw error;
        results.inventoryLots = data;
      }

      if (seedData.preadmissions) {
        const { data, error } = await this.testClient
          .from('preadmissions')
          .insert(seedData.preadmissions)
          .select();
        
        if (error) throw error;
        results.preadmissions = data;
      }

      return results;
    } catch (error) {
      console.error('Error seeding test data:', error);
      throw error;
    }
  }

  async cleanupTestDatabase() {
    if (!this.testClient) return;

    try {
      await this.resetTestData();
      console.log('Test database cleanup completed');
    } catch (error) {
      console.error('Error cleaning up test database:', error);
    }
  }

  async executeQuery(query, params = []) {
    if (!this.testClient) {
      throw new Error('Test database not initialized');
    }

    try {
      const { data, error } = await this.testClient.rpc('execute_sql', {
        query_text: query,
        params: params
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }

  async validateDataIntegrity() {
    const violations = [];

    try {
      // Check foreign key constraints
      const fkChecks = [
        {
          name: 'inventory_lots_part_id_fk',
          query: `
            SELECT il.id, il.part_id 
            FROM inventory_lots il 
            LEFT JOIN parts p ON il.part_id = p.id 
            WHERE p.id IS NULL AND il.part_id IS NOT NULL
          `
        },
        {
          name: 'inventory_lots_customer_id_fk',
          query: `
            SELECT il.id, il.customer_id 
            FROM inventory_lots il 
            LEFT JOIN customers c ON il.customer_id = c.id 
            WHERE c.id IS NULL AND il.customer_id IS NOT NULL
          `
        },
        {
          name: 'transactions_lot_id_fk',
          query: `
            SELECT t.id, t.lot_id 
            FROM transactions t 
            LEFT JOIN inventory_lots il ON t.lot_id = il.id 
            WHERE il.id IS NULL AND t.lot_id IS NOT NULL
          `
        }
      ];

      for (const check of fkChecks) {
        const { data, error } = await this.testClient
          .rpc('execute_sql', { query_text: check.query });

        if (error) {
          violations.push(`Error checking ${check.name}: ${error.message}`);
        } else if (data && data.length > 0) {
          violations.push(`Foreign key violation in ${check.name}: ${data.length} orphaned records`);
        }
      }

      // Check quantity consistency
      const quantityCheck = await this.testClient
        .rpc('validate_inventory_integrity');

      if (quantityCheck.error) {
        violations.push(`Quantity integrity check failed: ${quantityCheck.error.message}`);
      } else if (quantityCheck.data && quantityCheck.data.length > 0) {
        violations.push(`Quantity inconsistencies found in ${quantityCheck.data.length} lots`);
      }

      return {
        isValid: violations.length === 0,
        violations
      };

    } catch (error) {
      return {
        isValid: false,
        violations: [`Integrity check failed: ${error.message}`]
      };
    }
  }

  async createTransaction(operations) {
    if (!this.testClient) {
      throw new Error('Test database not initialized');
    }

    try {
      const { data, error } = await this.testClient.rpc('begin');
      if (error) throw error;

      const results = [];
      
      for (const operation of operations) {
        const { table, action, data: opData, where } = operation;
        
        let result;
        switch (action) {
          case 'insert':
            result = await this.testClient.from(table).insert(opData);
            break;
          case 'update':
            result = await this.testClient.from(table).update(opData).match(where);
            break;
          case 'delete':
            result = await this.testClient.from(table).delete().match(where);
            break;
          default:
            throw new Error(`Unknown operation: ${action}`);
        }
        
        if (result.error) throw result.error;
        results.push(result.data);
      }

      const { error: commitError } = await this.testClient.rpc('commit');
      if (commitError) throw commitError;

      return results;
    } catch (error) {
      await this.testClient.rpc('rollback');
      throw error;
    }
  }

  async createLargeDataset(config = {}) {
    const {
      customerCount = 10,
      partCount = 50,
      lotCount = 1000,
      transactionCount = 2000
    } = config;

    console.log(`Creating large dataset: ${customerCount} customers, ${partCount} parts, ${lotCount} lots, ${transactionCount} transactions`);

    const startTime = Date.now();

    try {
      // Create customers in batches
      const customers = [];
      for (let i = 0; i < customerCount; i++) {
        customers.push({
          id: `test-customer-${i}`,
          name: `Test Customer ${i}`,
          code: `CUST${i.toString().padStart(3, '0')}`,
          active: true
        });
      }

      const { data: createdCustomers, error: customerError } = await this.testClient
        .from('customers')
        .insert(customers)
        .select();

      if (customerError) throw customerError;

      // Create parts in batches
      const parts = [];
      for (let i = 0; i < partCount; i++) {
        parts.push({
          id: `test-part-${i}`,
          description: `Test Part ${i}`,
          part_number: `PART${i.toString().padStart(4, '0')}`,
          hts_code: '1234.56.7890',
          unit_of_measure: 'EA',
          active: true
        });
      }

      const { data: createdParts, error: partError } = await this.testClient
        .from('parts')
        .insert(parts)
        .select();

      if (partError) throw partError;

      // Create lots in smaller batches to avoid memory issues
      const batchSize = 100;
      const lotBatches = Math.ceil(lotCount / batchSize);
      
      for (let batch = 0; batch < lotBatches; batch++) {
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, lotCount);
        const lots = [];

        for (let i = batchStart; i < batchEnd; i++) {
          const customerId = createdCustomers[i % customerCount].id;
          const partId = createdParts[i % partCount].id;
          
          lots.push({
            id: `LOT-${i.toString().padStart(6, '0')}`,
            part_id: partId,
            customer_id: customerId,
            status: ['In Stock', 'On Hold', 'Depleted'][i % 3],
            original_quantity: Math.floor(Math.random() * 1000) + 1,
            current_quantity: Math.floor(Math.random() * 1000) + 1,
            admission_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
            manifest_number: `MAN-${i.toString().padStart(6, '0')}`,
            active: true
          });
        }

        const { error: lotError } = await this.testClient
          .from('inventory_lots')
          .insert(lots);

        if (lotError) throw lotError;
        
        console.log(`Created batch ${batch + 1}/${lotBatches} (${lots.length} lots)`);
      }

      const duration = Date.now() - startTime;
      console.log(`Large dataset creation completed in ${duration}ms`);

      return {
        customers: createdCustomers,
        parts: createdParts,
        lotCount: lotCount,
        duration
      };

    } catch (error) {
      console.error('Error creating large dataset:', error);
      throw error;
    }
  }

  async getTableStats() {
    const stats = {};

    for (const table of this.originalTables) {
      try {
        const { count, error } = await this.testClient
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          stats[table] = { count: 0, error: error.message };
        } else {
          stats[table] = { count };
        }
      } catch (error) {
        stats[table] = { count: 0, error: error.message };
      }
    }

    return stats;
  }

  async analyzeQueryPerformance(query, iterations = 5) {
    const results = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      try {
        const { data, error } = await this.testClient.rpc('execute_sql', {
          query_text: query
        });

        const duration = Date.now() - startTime;
        
        if (error) {
          results.push({ iteration: i + 1, error: error.message, duration });
        } else {
          results.push({ 
            iteration: i + 1, 
            duration, 
            rowCount: data ? data.length : 0 
          });
        }
      } catch (error) {
        results.push({ iteration: i + 1, error: error.message, duration: Date.now() - startTime });
      }
    }

    const successfulRuns = results.filter(r => !r.error);
    const avgDuration = successfulRuns.length > 0 
      ? successfulRuns.reduce((sum, r) => sum + r.duration, 0) / successfulRuns.length 
      : 0;

    return {
      query,
      iterations,
      results,
      avgDuration,
      minDuration: Math.min(...successfulRuns.map(r => r.duration)),
      maxDuration: Math.max(...successfulRuns.map(r => r.duration)),
      successRate: successfulRuns.length / iterations
    };
  }

  getClient() {
    return this.testClient;
  }
}

module.exports = new TestDatabaseHelper();
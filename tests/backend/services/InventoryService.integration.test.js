// tests/backend/services/InventoryService.integration.test.js
// Integration tests for InventoryService with cross-service communication

const InventoryService = require('../../../src/backend/services/inventory/InventoryService');
const CustomerService = require('../../../src/backend/services/core/CustomerService');
const PartService = require('../../../src/backend/services/inventory/PartService');
const DashboardService = require('../../../src/backend/services/analytics/DashboardService');

// Test database helper
const testDbHelper = require('../../helpers/testDatabaseHelper');
const testDataFactory = require('../../helpers/testDataFactory');

describe('InventoryService Integration Tests', () => {
  let inventoryService;
  let customerService;
  let partService;
  let dashboardService;
  let testData;

  beforeAll(async () => {
    // Initialize services
    inventoryService = new InventoryService();
    customerService = new CustomerService();
    partService = new PartService();
    dashboardService = new DashboardService();

    // Setup test database
    await testDbHelper.setupTestDatabase();
  });

  beforeEach(async () => {
    // Reset database to clean state
    await testDbHelper.resetTestData();
    
    // Create base test data
    testData = await testDataFactory.createBaseTestData();
  });

  afterAll(async () => {
    await testDbHelper.cleanupTestDatabase();
  });

  describe('Lot Creation with Cross-Service Validation', () => {
    test('creates lot with valid customer and part references', async () => {
      const lotData = {
        part_id: testData.testPart.id,
        customer_id: testData.testCustomer.id,
        original_quantity: 100,
        admission_date: new Date().toISOString(),
        manifest_number: 'MAN-001',
        conveyance_name: 'Test Vessel',
        port_of_unlading: 'LAX'
      };

      const result = await inventoryService.createLot(lotData, { userId: testData.testUser.id });

      expect(result.success).toBe(true);
      expect(result.data.id).toBeDefined();
      expect(result.data.current_quantity).toBe(100);
      expect(result.data.status).toBe('In Stock');

      // Verify audit trail
      expect(result.data.created_by).toBe(testData.testUser.id);
      expect(result.data.created_at).toBeDefined();
    });

    test('validates customer exists before creating lot', async () => {
      const lotData = {
        part_id: testData.testPart.id,
        customer_id: 'non-existent-customer',
        original_quantity: 100
      };

      const result = await inventoryService.createLot(lotData, { userId: testData.testUser.id });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Customer not found');
    });

    test('validates part exists before creating lot', async () => {
      const lotData = {
        part_id: 'non-existent-part',
        customer_id: testData.testCustomer.id,
        original_quantity: 100
      };

      const result = await inventoryService.createLot(lotData, { userId: testData.testUser.id });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Part not found');
    });

    test('enforces business rules for lot creation', async () => {
      const invalidLotData = {
        part_id: testData.testPart.id,
        customer_id: testData.testCustomer.id,
        original_quantity: -50 // Negative quantity should be rejected
      };

      const result = await inventoryService.createLot(invalidLotData, { userId: testData.testUser.id });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Quantity must be greater than zero');
    });
  });

  describe('Quantity Adjustment with Transaction History', () => {
    let testLot;

    beforeEach(async () => {
      // Create a test lot for quantity adjustments
      const lotResult = await inventoryService.createLot({
        part_id: testData.testPart.id,
        customer_id: testData.testCustomer.id,
        original_quantity: 100
      }, { userId: testData.testUser.id });

      testLot = lotResult.data;
    });

    test('adjusts lot quantity with proper transaction recording', async () => {
      const adjustmentResult = await inventoryService.adjustLotQuantity(
        testLot.id,
        75,
        'Partial shipment adjustment',
        100,
        { userId: testData.testUser.id }
      );

      expect(adjustmentResult.success).toBe(true);
      expect(adjustmentResult.data.current_quantity).toBe(75);

      // Verify transaction history
      const historyResult = await inventoryService.getLotTransactionHistory(testLot.id);
      expect(historyResult.success).toBe(true);
      expect(historyResult.data).toHaveLength(2); // Original admission + adjustment

      const adjustmentTransaction = historyResult.data.find(t => t.type === 'Adjustment');
      expect(adjustmentTransaction).toBeDefined();
      expect(adjustmentTransaction.quantity).toBe(-25); // Reduction of 25
      expect(adjustmentTransaction.source_document_number).toBe('Partial shipment adjustment');
    });

    test('prevents quantity adjustment below zero', async () => {
      const result = await inventoryService.adjustLotQuantity(
        testLot.id,
        -10,
        'Invalid negative adjustment',
        100,
        { userId: testData.testUser.id }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Quantity cannot be negative');

      // Verify lot quantity unchanged
      const lotResult = await inventoryService.getLotById(testLot.id);
      expect(lotResult.data.current_quantity).toBe(100);
    });

    test('handles concurrent quantity adjustments safely', async () => {
      // Simulate two users adjusting the same lot simultaneously
      const adjustment1Promise = inventoryService.adjustLotQuantity(
        testLot.id,
        90,
        'Concurrent adjustment 1',
        100,
        { userId: testData.testUser.id }
      );

      const adjustment2Promise = inventoryService.adjustLotQuantity(
        testLot.id,
        80,
        'Concurrent adjustment 2',
        100,
        { userId: testData.testUser.id }
      );

      const [result1, result2] = await Promise.allSettled([adjustment1Promise, adjustment2Promise]);

      // Only one adjustment should succeed due to optimistic locking
      const successCount = [result1, result2].filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;

      expect(successCount).toBe(1);

      // Verify final quantity is one of the two target values
      const finalLotResult = await inventoryService.getLotById(testLot.id);
      expect([80, 90]).toContain(finalLotResult.data.current_quantity);
    });
  });

  describe('Status Changes with Business Logic', () => {
    let testLot;

    beforeEach(async () => {
      const lotResult = await inventoryService.createLot({
        part_id: testData.testPart.id,
        customer_id: testData.testCustomer.id,
        original_quantity: 100
      }, { userId: testData.testUser.id });

      testLot = lotResult.data;
    });

    test('changes lot status with validation', async () => {
      const statusResult = await inventoryService.changeLotStatus(
        testLot.id,
        'On Hold',
        'Quality inspection required',
        'In Stock',
        { userId: testData.testUser.id }
      );

      expect(statusResult.success).toBe(true);
      expect(statusResult.data.status).toBe('On Hold');

      // Verify transaction history includes status change
      const historyResult = await inventoryService.getLotTransactionHistory(testLot.id);
      const statusTransaction = historyResult.data.find(t => t.type === 'Status Change');
      expect(statusTransaction).toBeDefined();
      expect(statusTransaction.reference_data.old_status).toBe('In Stock');
      expect(statusTransaction.reference_data.new_status).toBe('On Hold');
    });

    test('validates status transition rules', async () => {
      // First set lot to Depleted
      await inventoryService.changeLotStatus(
        testLot.id,
        'Depleted',
        'All quantity shipped',
        'In Stock',
        { userId: testData.testUser.id }
      );

      // Try to change from Depleted back to In Stock (should be restricted)
      const result = await inventoryService.changeLotStatus(
        testLot.id,
        'In Stock',
        'Attempt invalid transition',
        'Depleted',
        { userId: testData.testUser.id }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid status transition');
    });
  });

  describe('Lot Voiding and Soft Delete', () => {
    let testLot;

    beforeEach(async () => {
      const lotResult = await inventoryService.createLot({
        part_id: testData.testPart.id,
        customer_id: testData.testCustomer.id,
        original_quantity: 100
      }, { userId: testData.testUser.id });

      testLot = lotResult.data;
    });

    test('voids lot with reason and quantity tracking', async () => {
      const voidResult = await inventoryService.voidLot(
        testLot.id,
        'Damaged goods - water damage',
        75,
        { userId: testData.testUser.id }
      );

      expect(voidResult.success).toBe(true);
      expect(voidResult.data.voided).toBe(true);
      expect(voidResult.data.current_quantity).toBe(25); // 100 - 75

      // Verify void transaction recorded
      const historyResult = await inventoryService.getLotTransactionHistory(testLot.id);
      const voidTransaction = historyResult.data.find(t => t.type === 'Void');
      expect(voidTransaction).toBeDefined();
      expect(voidTransaction.quantity).toBe(-75);
      expect(voidTransaction.source_document_number).toBe('Damaged goods - water damage');
    });

    test('prevents operations on voided lots', async () => {
      // First void the lot
      await inventoryService.voidLot(
        testLot.id,
        'Void for testing',
        100,
        { userId: testData.testUser.id }
      );

      // Try to adjust quantity on voided lot
      const adjustResult = await inventoryService.adjustLotQuantity(
        testLot.id,
        50,
        'Attempt adjustment on voided lot',
        0,
        { userId: testData.testUser.id }
      );

      expect(adjustResult.success).toBe(false);
      expect(adjustResult.error).toContain('Cannot modify voided lot');
    });
  });

  describe('Search and Filtering Integration', () => {
    beforeEach(async () => {
      // Create multiple test lots with different characteristics
      const lots = [
        {
          part_id: testData.testPart.id,
          customer_id: testData.testCustomer.id,
          original_quantity: 100,
          status: 'In Stock',
          manifest_number: 'MAN-001'
        },
        {
          part_id: testData.testPart.id,
          customer_id: testData.testCustomer.id,
          original_quantity: 200,
          status: 'On Hold',
          manifest_number: 'MAN-002'
        },
        {
          part_id: testData.testPart.id,
          customer_id: testData.testCustomer.id,
          original_quantity: 50,
          status: 'Depleted',
          manifest_number: 'MAN-003'
        }
      ];

      for (const lotData of lots) {
        await inventoryService.createLot(lotData, { userId: testData.testUser.id });
      }
    });

    test('searches lots by manifest number', async () => {
      const searchResult = await inventoryService.searchLots('MAN-001', {}, { userId: testData.testUser.id });

      expect(searchResult.success).toBe(true);
      expect(searchResult.data).toHaveLength(1);
      expect(searchResult.data[0].manifest_number).toBe('MAN-001');
    });

    test('filters lots by status', async () => {
      const filterResult = await inventoryService.getAllLots({
        filters: [{ column: 'status', value: 'In Stock' }]
      }, { userId: testData.testUser.id });

      expect(filterResult.success).toBe(true);
      expect(filterResult.data.length).toBeGreaterThan(0);
      filterResult.data.forEach(lot => {
        expect(lot.status).toBe('In Stock');
      });
    });

    test('filters lots by customer with proper isolation', async () => {
      // Create another customer and lot
      const anotherCustomer = await testDataFactory.createTestCustomer({ name: 'Another Customer' });
      await inventoryService.createLot({
        part_id: testData.testPart.id,
        customer_id: anotherCustomer.id,
        original_quantity: 150
      }, { userId: testData.testUser.id });

      // Search for original customer's lots
      const customerLotsResult = await inventoryService.getAllLots({
        filters: [{ column: 'customer_id', value: testData.testCustomer.id }]
      }, { userId: testData.testUser.id });

      expect(customerLotsResult.success).toBe(true);
      customerLotsResult.data.forEach(lot => {
        expect(lot.customer_id).toBe(testData.testCustomer.id);
      });
    });
  });

  describe('Dashboard Metrics Integration', () => {
    beforeEach(async () => {
      // Create various lots to test metrics calculation
      const lotConfigs = [
        { quantity: 100, status: 'In Stock' },
        { quantity: 200, status: 'In Stock' },
        { quantity: 50, status: 'On Hold' },
        { quantity: 0, status: 'Depleted' }
      ];

      for (const config of lotConfigs) {
        await inventoryService.createLot({
          part_id: testData.testPart.id,
          customer_id: testData.testCustomer.id,
          original_quantity: config.quantity,
          status: config.status
        }, { userId: testData.testUser.id });
      }
    });

    test('calculates inventory summary correctly', async () => {
      const summaryResult = await inventoryService.getInventorySummary({ userId: testData.testUser.id });

      expect(summaryResult.success).toBe(true);
      expect(summaryResult.data.total_lots).toBe(4);
      expect(summaryResult.data.active_lots).toBe(3); // Excluding Depleted
      expect(summaryResult.data.total_quantity).toBe(350); // 100 + 200 + 50 + 0
      expect(summaryResult.data.by_status['In Stock']).toBe(2);
      expect(summaryResult.data.by_status['On Hold']).toBe(1);
      expect(summaryResult.data.by_status['Depleted']).toBe(1);
    });

    test('integrates with dashboard service for metrics', async () => {
      const dashboardResult = await dashboardService.getInventoryMetrics({ userId: testData.testUser.id });

      expect(dashboardResult.success).toBe(true);
      expect(dashboardResult.data.total_inventory_lots).toBeGreaterThan(0);
      expect(dashboardResult.data.total_inventory_value).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Testing', () => {
    test('handles large lot creation efficiently', async () => {
      const startTime = Date.now();
      const batchSize = 100;
      
      const lots = Array(batchSize).fill().map((_, i) => ({
        part_id: testData.testPart.id,
        customer_id: testData.testCustomer.id,
        original_quantity: Math.floor(Math.random() * 500) + 1
      }));

      // Create lots in batches of 10 to avoid overwhelming the database
      const batchPromises = [];
      for (let i = 0; i < lots.length; i += 10) {
        const batch = lots.slice(i, i + 10);
        batchPromises.push(
          Promise.all(batch.map(lot => 
            inventoryService.createLot(lot, { userId: testData.testUser.id })
          ))
        );
      }

      const results = await Promise.all(batchPromises);
      const duration = Date.now() - startTime;

      // Verify all lots were created successfully
      const successfulLots = results.flat().filter(r => r.success).length;
      expect(successfulLots).toBe(batchSize);

      // Performance assertion - should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds for 100 lots

      console.log(`Created ${batchSize} lots in ${duration}ms (${(duration / batchSize).toFixed(2)}ms per lot)`);
    });

    test('searches large inventory dataset efficiently', async () => {
      // Create diverse dataset for search testing
      const searchTerms = ['ELECTRONICS', 'AUTOMOTIVE', 'TEXTILES', 'MACHINERY'];
      
      for (let i = 0; i < 200; i++) {
        const randomTerm = searchTerms[i % searchTerms.length];
        const part = await testDataFactory.createTestPart({ 
          description: `${randomTerm} Component ${i}`,
          part_number: `PART-${randomTerm}-${i}`
        });

        await inventoryService.createLot({
          part_id: part.id,
          customer_id: testData.testCustomer.id,
          original_quantity: Math.floor(Math.random() * 1000) + 1
        }, { userId: testData.testUser.id });
      }

      // Perform search with timing
      const startTime = Date.now();
      const searchResult = await inventoryService.searchLots('ELECTRONICS', {}, { userId: testData.testUser.id });
      const searchDuration = Date.now() - startTime;

      expect(searchResult.success).toBe(true);
      expect(searchResult.data.length).toBeGreaterThan(0);
      expect(searchDuration).toBeLessThan(500); // <500ms search target

      console.log(`Searched ${searchResult.data.length} lots from dataset in ${searchDuration}ms`);
    });
  });

  describe('Data Consistency and Integrity', () => {
    test('maintains referential integrity across services', async () => {
      // Create lot with valid references
      const lotResult = await inventoryService.createLot({
        part_id: testData.testPart.id,
        customer_id: testData.testCustomer.id,
        original_quantity: 100
      }, { userId: testData.testUser.id });

      expect(lotResult.success).toBe(true);

      // Try to delete referenced part (should fail due to foreign key)
      const partDeleteResult = await partService.delete(testData.testPart.id);
      expect(partDeleteResult.success).toBe(false);
      expect(partDeleteResult.error).toContain('referenced by');

      // Try to delete referenced customer (should fail due to foreign key)
      const customerDeleteResult = await customerService.delete(testData.testCustomer.id);
      expect(customerDeleteResult.success).toBe(false);
      expect(customerDeleteResult.error).toContain('referenced by');
    });

    test('handles database transaction rollback on failure', async () => {
      // Mock a database error during lot creation
      const originalCreate = inventoryService.client.create;
      inventoryService.client.create = jest.fn().mockRejectedValue(new Error('Database constraint violation'));

      const result = await inventoryService.createLot({
        part_id: testData.testPart.id,
        customer_id: testData.testCustomer.id,
        original_quantity: 100
      }, { userId: testData.testUser.id });

      expect(result.success).toBe(false);

      // Restore original method
      inventoryService.client.create = originalCreate;

      // Verify no partial data was created
      const allLotsResult = await inventoryService.getAllLots({ userId: testData.testUser.id });
      const newLots = allLotsResult.data.filter(lot => lot.part_id === testData.testPart.id);
      expect(newLots).toHaveLength(0);
    });
  });
});
/**
 * Database Seeding Script for SPARC Development Environment
 * This script populates the database with sample data for development and testing
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Sample data
const sampleData = {
    // Sample customers
    customers: [
        {
            name: 'Global Tech Solutions',
            code: 'GTS001',
            contact_email: 'info@globaltech.com',
            contact_phone: '+1-555-0101',
            address: '123 Tech Street, Silicon Valley, CA 94105',
            status: 'active',
            created_at: new Date().toISOString()
        },
        {
            name: 'International Manufacturing Corp',
            code: 'IMC002',
            contact_email: 'contact@intlmfg.com',
            contact_phone: '+1-555-0102',
            address: '456 Industrial Blvd, Detroit, MI 48201',
            status: 'active',
            created_at: new Date().toISOString()
        },
        {
            name: 'Pacific Imports LLC',
            code: 'PIL003',
            contact_email: 'orders@pacificimports.com',
            contact_phone: '+1-555-0103',
            address: '789 Harbor View, Long Beach, CA 90802',
            status: 'active',
            created_at: new Date().toISOString()
        }
    ],

    // Sample locations
    locations: [
        {
            name: 'Main Warehouse',
            code: 'WH001',
            address: '100 Distribution Center Dr, Commerce, CA 90040',
            zone_type: 'general_purpose',
            capacity: 50000,
            status: 'active',
            created_at: new Date().toISOString()
        },
        {
            name: 'Cold Storage Facility',
            code: 'CS002',
            address: '200 Refrigeration Way, Vernon, CA 90058',
            zone_type: 'subzone',
            capacity: 25000,
            status: 'active',
            created_at: new Date().toISOString()
        }
    ],

    // Sample parts/materials
    parts: [
        {
            part_number: 'CPU-I7-12700K',
            description: 'Intel Core i7-12700K Processor',
            category: 'Electronics',
            unit_of_measure: 'EA',
            unit_cost: 399.99,
            country_of_origin: 'MY',
            hts_code: '8542.31.00',
            status: 'active',
            created_at: new Date().toISOString()
        },
        {
            part_number: 'MEM-DDR4-32GB',
            description: '32GB DDR4-3200 Memory Module',
            category: 'Electronics',
            unit_of_measure: 'EA',
            unit_cost: 149.99,
            country_of_origin: 'KR',
            hts_code: '8542.32.00',
            status: 'active',
            created_at: new Date().toISOString()
        },
        {
            part_number: 'SSD-1TB-NVME',
            description: '1TB NVMe SSD Storage Drive',
            category: 'Electronics',
            unit_of_measure: 'EA',
            unit_cost: 89.99,
            country_of_origin: 'CN',
            hts_code: '8542.33.00',
            status: 'active',
            created_at: new Date().toISOString()
        }
    ],

    // Sample inventory entries
    inventory: [
        {
            part_number: 'CPU-I7-12700K',
            location_code: 'WH001',
            quantity_on_hand: 150,
            quantity_allocated: 25,
            quantity_available: 125,
            unit_cost: 399.99,
            total_value: 59998.50,
            last_movement_date: new Date().toISOString(),
            created_at: new Date().toISOString()
        },
        {
            part_number: 'MEM-DDR4-32GB',
            location_code: 'WH001',
            quantity_on_hand: 300,
            quantity_allocated: 50,
            quantity_available: 250,
            unit_cost: 149.99,
            total_value: 44997.00,
            last_movement_date: new Date().toISOString(),
            created_at: new Date().toISOString()
        },
        {
            part_number: 'SSD-1TB-NVME',
            location_code: 'WH001',
            quantity_on_hand: 500,
            quantity_allocated: 75,
            quantity_available: 425,
            unit_cost: 89.99,
            total_value: 44995.00,
            last_movement_date: new Date().toISOString(),
            created_at: new Date().toISOString()
        }
    ]
};

// Seeding functions
async function seedTable(tableName, data) {
    console.log(`Seeding ${tableName}...`);
    
    try {
        const { data: result, error } = await supabase
            .from(tableName)
            .insert(data)
            .select();

        if (error) {
            console.error(`Error seeding ${tableName}:`, error);
            throw error;
        }

        console.log(`✅ Successfully seeded ${result.length} records in ${tableName}`);
        return result;
    } catch (error) {
        console.error(`❌ Failed to seed ${tableName}:`, error.message);
        throw error;
    }
}

async function clearTable(tableName) {
    console.log(`Clearing ${tableName}...`);
    
    try {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .neq('id', 0); // Delete all records

        if (error) {
            console.error(`Error clearing ${tableName}:`, error);
            throw error;
        }

        console.log(`✅ Successfully cleared ${tableName}`);
    } catch (error) {
        console.error(`❌ Failed to clear ${tableName}:`, error.message);
        throw error;
    }
}

async function checkConnection() {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('count(*)', { count: 'exact', head: true });

        if (error) {
            console.error('Database connection error:', error);
            return false;
        }

        console.log('✅ Database connection successful');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// Main seeding function
async function seedDatabase(clearFirst = false) {
    console.log('🌱 Starting database seeding...');
    console.log('================================');

    try {
        // Check database connection
        const connected = await checkConnection();
        if (!connected) {
            throw new Error('Could not connect to database');
        }

        // Clear tables if requested
        if (clearFirst) {
            console.log('\n🧹 Clearing existing data...');
            await clearTable('inventory');
            await clearTable('parts');
            await clearTable('locations');
            await clearTable('customers');
        }

        // Seed tables in dependency order
        console.log('\n🌱 Seeding tables...');
        await seedTable('customers', sampleData.customers);
        await seedTable('locations', sampleData.locations);
        await seedTable('parts', sampleData.parts);
        await seedTable('inventory', sampleData.inventory);

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('================================');
        
    } catch (error) {
        console.error('\n❌ Database seeding failed:');
        console.error(error.message);
        process.exit(1);
    }
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const clearFirst = args.includes('--clear') || args.includes('-c');
    const helpRequested = args.includes('--help') || args.includes('-h');

    if (helpRequested) {
        console.log(`
SPARC Database Seeding Tool
`);
        console.log('Usage: node scripts/db/seed-db.js [options]\n');
        console.log('Options:');
        console.log('  -c, --clear    Clear existing data before seeding');
        console.log('  -h, --help     Show this help message\n');
        console.log('Examples:');
        console.log('  node scripts/db/seed-db.js          # Seed without clearing');
        console.log('  node scripts/db/seed-db.js --clear  # Clear and seed\n');
        process.exit(0);
    }

    seedDatabase(clearFirst);
}

module.exports = {
    seedDatabase,
    seedTable,
    clearTable,
    sampleData
};
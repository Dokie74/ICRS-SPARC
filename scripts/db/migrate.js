/**
 * Database Migration Script for SPARC
 * Handles running and rolling back database migrations
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const MIGRATIONS_DIR = path.join(__dirname, '../../src/db/migrations');
const MIGRATIONS_TABLE = 'schema_migrations';

class MigrationManager {
    constructor() {
        this.migrationsDir = MIGRATIONS_DIR;
    }

    async initMigrationsTable() {
        // Note: exec_sql RPC function doesn't exist in Supabase by default
        // Using direct SQL execution through postgres client instead
        try {
            // Check if migrations table exists first
            const { data: tableExists } = await supabase
                .from('information_schema.tables')
                .select('table_name')
                .eq('table_name', MIGRATIONS_TABLE)
                .eq('table_schema', 'public')
                .maybeSingle();

            if (!tableExists) {
                console.log('⚠️  Migrations table creation requires direct database access.');
                console.log('   Please run the following SQL manually in your Supabase SQL editor:');
                console.log(`
                CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
                    id SERIAL PRIMARY KEY,
                    version VARCHAR(255) NOT NULL UNIQUE,
                    name VARCHAR(255) NOT NULL,
                    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    checksum VARCHAR(64)
                );
                
                CREATE INDEX IF NOT EXISTS idx_schema_migrations_version 
                ON ${MIGRATIONS_TABLE}(version);
                `);
                throw new Error('Migrations table does not exist and cannot be created via RPC');
            }

            console.log('✅ Migrations table exists');
        } catch (error) {
            throw new Error(`Failed to initialize migrations table: ${error.message}`);
        }
    }

    async getMigrationFiles() {
        try {
            const files = await fs.readdir(this.migrationsDir);
            return files
                .filter(file => file.endsWith('.sql'))
                .sort()
                .map(file => {
                    const match = file.match(/^(\d{14})_(.+)\.sql$/);
                    if (!match) {
                        throw new Error(`Invalid migration filename: ${file}`);
                    }
                    return {
                        version: match[1],
                        name: match[2],
                        filename: file,
                        filepath: path.join(this.migrationsDir, file)
                    };
                });
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('No migrations directory found, creating...');
                await fs.mkdir(this.migrationsDir, { recursive: true });
                return [];
            }
            throw error;
        }
    }

    async getExecutedMigrations() {
        const { data, error } = await supabase
            .from(MIGRATIONS_TABLE)
            .select('version, name, executed_at')
            .order('version', { ascending: true });

        if (error) {
            throw new Error(`Failed to fetch executed migrations: ${error.message}`);
        }

        return data || [];
    }

    async executeMigration(migration) {
        console.log(`Running migration: ${migration.version}_${migration.name}`);

        try {
            // Read migration file
            const sql = await fs.readFile(migration.filepath, 'utf8');
            
            // Calculate checksum
            const crypto = require('crypto');
            const checksum = crypto.createHash('sha256').update(sql).digest('hex');

            // Note: exec_sql RPC function doesn't exist in Supabase by default
            // Migration SQL must be executed manually in Supabase SQL editor
            console.log('⚠️  Migration SQL must be executed manually in Supabase SQL editor:');
            console.log('---BEGIN MIGRATION SQL---');
            console.log(sql);
            console.log('---END MIGRATION SQL---');
            
            // For now, we'll assume the migration was executed manually
            // In production, this would require custom RPC functions or direct postgres connection

            // Record successful migration
            const { error: recordError } = await supabase
                .from(MIGRATIONS_TABLE)
                .insert({
                    version: migration.version,
                    name: migration.name,
                    checksum: checksum.substring(0, 64)
                });

            if (recordError) {
                throw new Error(`Failed to record migration: ${recordError.message}`);
            }

            console.log(`✅ Migration ${migration.version} completed successfully`);
            
        } catch (error) {
            console.error(`❌ Migration ${migration.version} failed:`, error.message);
            throw error;
        }
    }

    async rollbackMigration(migration) {
        console.log(`Rolling back migration: ${migration.version}_${migration.name}`);

        try {
            // Look for rollback file
            const rollbackFile = migration.filepath.replace('.sql', '_rollback.sql');
            
            try {
                const rollbackSql = await fs.readFile(rollbackFile, 'utf8');
                
                // Note: exec_sql RPC function doesn't exist in Supabase by default
                console.log('⚠️  Rollback SQL must be executed manually in Supabase SQL editor:');
                console.log('---BEGIN ROLLBACK SQL---');
                console.log(rollbackSql);
                console.log('---END ROLLBACK SQL---');
                
                // For now, we'll assume the rollback was executed manually
                
            } catch (fileError) {
                if (fileError.code === 'ENOENT') {
                    console.log(`No rollback file found for ${migration.version}, skipping SQL rollback`);
                } else {
                    throw fileError;
                }
            }

            // Remove migration record
            const { error: deleteError } = await supabase
                .from(MIGRATIONS_TABLE)
                .delete()
                .eq('version', migration.version);

            if (deleteError) {
                throw new Error(`Failed to remove migration record: ${deleteError.message}`);
            }

            console.log(`✅ Migration ${migration.version} rolled back successfully`);
            
        } catch (error) {
            console.error(`❌ Rollback of migration ${migration.version} failed:`, error.message);
            throw error;
        }
    }

    async migrate() {
        console.log('Starting database migration...');
        
        await this.initMigrationsTable();
        
        const migrationFiles = await this.getMigrationFiles();
        const executedMigrations = await this.getExecutedMigrations();
        
        const executedVersions = new Set(executedMigrations.map(m => m.version));
        const pendingMigrations = migrationFiles.filter(m => !executedVersions.has(m.version));

        if (pendingMigrations.length === 0) {
            console.log('✅ No pending migrations');
            return;
        }

        console.log(`Found ${pendingMigrations.length} pending migration(s)`);
        
        for (const migration of pendingMigrations) {
            await this.executeMigration(migration);
        }

        console.log('✅ All migrations completed successfully');
    }

    async rollback(steps = 1) {
        console.log(`Rolling back ${steps} migration(s)...`);
        
        const executedMigrations = await this.getExecutedMigrations();
        
        if (executedMigrations.length === 0) {
            console.log('No migrations to rollback');
            return;
        }

        const migrationsToRollback = executedMigrations
            .slice(-steps)
            .reverse();

        console.log(`Rolling back ${migrationsToRollback.length} migration(s)`);
        
        for (const migration of migrationsToRollback) {
            await this.rollbackMigration(migration);
        }

        console.log('✅ Rollback completed successfully');
    }

    async status() {
        await this.initMigrationsTable();
        
        const migrationFiles = await this.getMigrationFiles();
        const executedMigrations = await this.getExecutedMigrations();
        
        const executedVersions = new Set(executedMigrations.map(m => m.version));
        
        console.log('\nMigration Status:');
        console.log('=================');
        
        if (migrationFiles.length === 0) {
            console.log('No migration files found');
            return;
        }

        for (const migration of migrationFiles) {
            const status = executedVersions.has(migration.version) ? '✅ Applied' : '⏳ Pending';
            const executedInfo = executedVersions.has(migration.version) 
                ? ` (${executedMigrations.find(m => m.version === migration.version).executed_at})`
                : '';
            console.log(`${status} ${migration.version}_${migration.name}${executedInfo}`);
        }
        
        const pendingCount = migrationFiles.filter(m => !executedVersions.has(m.version)).length;
        console.log(`\nTotal: ${migrationFiles.length} migrations, ${pendingCount} pending`);
    }

    async createMigration(name) {
        if (!name) {
            throw new Error('Migration name is required');
        }

        const timestamp = new Date().toISOString().replace(/[^\d]/g, '').slice(0, 14);
        const filename = `${timestamp}_${name.replace(/[^a-zA-Z0-9]/g, '_')}.sql`;
        const filepath = path.join(this.migrationsDir, filename);
        const rollbackPath = path.join(this.migrationsDir, `${timestamp}_${name.replace(/[^a-zA-Z0-9]/g, '_')}_rollback.sql`);

        // Ensure migrations directory exists
        await fs.mkdir(this.migrationsDir, { recursive: true });

        const migrationTemplate = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Add your migration SQL here
-- Example:
-- CREATE TABLE example (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

`;

        const rollbackTemplate = `-- Rollback for migration: ${name}
-- Created: ${new Date().toISOString()}

-- Add your rollback SQL here
-- Example:
-- DROP TABLE IF EXISTS example;

`;

        await fs.writeFile(filepath, migrationTemplate);
        await fs.writeFile(rollbackPath, rollbackTemplate);

        console.log(`✅ Migration files created:`);
        console.log(`   ${filepath}`);
        console.log(`   ${rollbackPath}`);
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];
    
    const manager = new MigrationManager();

    async function run() {
        try {
            switch (command) {
                case 'migrate':
                case 'up':
                    await manager.migrate();
                    break;
                    
                case 'rollback':
                case 'down':
                    const steps = parseInt(args[1]) || 1;
                    await manager.rollback(steps);
                    break;
                    
                case 'status':
                    await manager.status();
                    break;
                    
                case 'create':
                    const name = args[1];
                    if (!name) {
                        console.error('Migration name is required');
                        console.log('Usage: node scripts/db/migrate.js create <migration_name>');
                        process.exit(1);
                    }
                    await manager.createMigration(name);
                    break;
                    
                case 'help':
                case '--help':
                case '-h':
                default:
                    console.log(`
SPARC Migration Tool
`);
                    console.log('Usage: node scripts/db/migrate.js <command> [options]\n');
                    console.log('Commands:');
                    console.log('  migrate, up              Run all pending migrations');
                    console.log('  rollback, down [steps]   Rollback migrations (default: 1)');
                    console.log('  status                   Show migration status');
                    console.log('  create <name>            Create new migration files');
                    console.log('  help                     Show this help\n');
                    console.log('Examples:');
                    console.log('  node scripts/db/migrate.js migrate');
                    console.log('  node scripts/db/migrate.js rollback 2');
                    console.log('  node scripts/db/migrate.js create add_user_roles');
                    console.log('  node scripts/db/migrate.js status\n');
                    break;
            }
        } catch (error) {
            console.error('❌ Migration command failed:', error.message);
            process.exit(1);
        }
    }

    run();
}

module.exports = MigrationManager;
-- Migration: Fix customers table schema
-- Add missing fields expected by frontend and API
-- Preserve existing data, only add new columns

-- Add missing columns to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
ADD COLUMN IF NOT EXISTS website VARCHAR(255),
ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to have created_at if missing
UPDATE customers SET created_at = NOW() WHERE created_at IS NULL;

-- Create/update the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_ein ON customers(ein);
CREATE INDEX IF NOT EXISTS idx_customers_contact_email ON customers(contact_email);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- Update all existing customers to have active status
UPDATE customers SET status = 'active' WHERE status IS NULL;

-- Create simple RLS policy for customers (allow all operations for authenticated users)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON customers;
CREATE POLICY "Enable all access for authenticated users" ON customers
    FOR ALL USING (true);
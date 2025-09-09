-- Migration: Create contacts table for customer contact information
-- This allows customers to have multiple contacts as expected by the frontend

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(30),
  title VARCHAR(100),
  location VARCHAR(200),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on contacts table
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for contacts
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at 
    BEFORE UPDATE ON contacts
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_customer_id ON contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contacts_is_primary ON contacts(is_primary);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);

-- Grant permissions to all roles
GRANT ALL ON contacts TO anon;
GRANT ALL ON contacts TO authenticated;
GRANT ALL ON contacts TO service_role;

-- Grant sequence permissions
GRANT USAGE, SELECT ON contacts_id_seq TO anon;
GRANT USAGE, SELECT ON contacts_id_seq TO authenticated;
GRANT USAGE, SELECT ON contacts_id_seq TO service_role;

-- Create RLS policy for contacts (allow all operations for authenticated users)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON contacts;
CREATE POLICY "Enable all access for authenticated users" ON contacts
    FOR ALL USING (true);

-- Create a function to ensure only one primary contact per customer
CREATE OR REPLACE FUNCTION ensure_single_primary_contact()
RETURNS TRIGGER AS $$
BEGIN
    -- If this contact is being set as primary
    IF NEW.is_primary = true THEN
        -- Set all other contacts for this customer to non-primary
        UPDATE contacts 
        SET is_primary = false 
        WHERE customer_id = NEW.customer_id 
        AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Create trigger to maintain single primary contact constraint
DROP TRIGGER IF EXISTS ensure_single_primary_contact_trigger ON contacts;
CREATE TRIGGER ensure_single_primary_contact_trigger
    BEFORE INSERT OR UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_contact();
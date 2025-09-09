-- Migration: Create employees table for user management
-- This allows the admin interface to manage system users

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'employee',
  department VARCHAR(100),
  phone VARCHAR(30),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER,
  updated_by INTEGER
);

-- Enable RLS on employees table
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for employees
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at 
    BEFORE UPDATE ON employees
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);

-- Grant permissions to all roles
GRANT ALL ON employees TO anon;
GRANT ALL ON employees TO authenticated;
GRANT ALL ON employees TO service_role;

-- Grant sequence permissions
GRANT USAGE, SELECT ON employees_id_seq TO anon;
GRANT USAGE, SELECT ON employees_id_seq TO authenticated;
GRANT USAGE, SELECT ON employees_id_seq TO service_role;

-- Create RLS policy for employees (allow all operations for authenticated users)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON employees;
CREATE POLICY "Enable all access for authenticated users" ON employees
    FOR ALL USING (true);

-- Insert some sample employees for testing
INSERT INTO employees (name, email, role, department, status) VALUES
('System Admin', 'admin@icrs-sparc.local', 'admin', 'administration', 'active'),
('Warehouse Manager', 'warehouse@icrs-sparc.local', 'manager', 'warehouse', 'active'),
('Customs Specialist', 'customs@icrs-sparc.local', 'staff', 'customs', 'active')
ON CONFLICT (email) DO NOTHING;
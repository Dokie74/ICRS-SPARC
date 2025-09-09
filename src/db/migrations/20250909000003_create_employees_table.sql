-- Migration: Add missing columns to existing employees table
-- The employees table already exists with data - we only need to add missing columns

-- Add missing phone column
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS phone VARCHAR(30);

-- Add missing status column (for compatibility with admin interface)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Update existing records to set status based on is_active
UPDATE employees 
SET status = CASE 
    WHEN is_active = true THEN 'active'
    WHEN is_active = false THEN 'inactive'
    ELSE 'active'
END
WHERE status IS NULL;

-- Create index on new status column
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

-- Create index on phone column
CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone);

-- Create a trigger to keep is_active and status in sync
CREATE OR REPLACE FUNCTION sync_employee_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When status changes, update is_active
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        NEW.is_active = CASE 
            WHEN NEW.status = 'active' THEN true
            ELSE false
        END;
    END IF;
    
    -- When is_active changes, update status
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        NEW.status = CASE 
            WHEN NEW.is_active = true THEN 'active'
            ELSE 'inactive'
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync status and is_active
DROP TRIGGER IF EXISTS sync_employee_status_trigger ON employees;
CREATE TRIGGER sync_employee_status_trigger
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION sync_employee_status();
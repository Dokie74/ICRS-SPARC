-- Quick schema for audit testing

-- Customers table (Fix Plan expects NO 'active' or 'status' columns)
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  customer_code VARCHAR(20) UNIQUE,
  name VARCHAR(200),
  email VARCHAR(100),
  country VARCHAR(3) DEFAULT 'US',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parts table (Fix Plan expects NO 'active' column)
CREATE TABLE IF NOT EXISTS parts (
  id SERIAL PRIMARY KEY,
  part_number VARCHAR(50) UNIQUE,
  description TEXT,
  material VARCHAR(100),
  unit_of_measure VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table (renamed from inventory_transactions)
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  lot_id INTEGER,
  quantity INTEGER,
  transaction_type VARCHAR(20),
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reference_number VARCHAR(50),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Storage locations table (renamed from locations)
CREATE TABLE IF NOT EXISTS storage_locations (
  id SERIAL PRIMARY KEY,
  location_code VARCHAR(20) UNIQUE,
  description TEXT,
  zone VARCHAR(10),
  aisle VARCHAR(10),
  level VARCHAR(10),
  position VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Material indices table (renamed from materials)
CREATE TABLE IF NOT EXISTS material_indices (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200),
  code VARCHAR(50),
  category VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory lots table
CREATE TABLE IF NOT EXISTS inventory_lots (
  id SERIAL PRIMARY KEY,
  part_id INTEGER REFERENCES parts(id),
  customer_id INTEGER REFERENCES customers(id),
  storage_location_id INTEGER REFERENCES storage_locations(id),
  quantity INTEGER DEFAULT 0,
  unit_value DECIMAL(10,2),
  total_value DECIMAL(12,2),
  unit_of_measure VARCHAR(20),
  customs_value DECIMAL(12,2),
  expiration_date DATE,
  notes TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suppliers table (Fix Plan expects 'name' instead of 'company_name')
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  supplier_code VARCHAR(20) UNIQUE,
  name VARCHAR(200),
  contact_person VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  country VARCHAR(3),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Preadmissions table (Fix Plan expects NO 'entry_date' column)
CREATE TABLE IF NOT EXISTS preadmissions (
  id SERIAL PRIMARY KEY,
  preadmission_number VARCHAR(50) UNIQUE,
  customer_id INTEGER REFERENCES customers(id),
  arrival_date DATE,
  container_number VARCHAR(20),
  bill_of_lading VARCHAR(50),
  customs_value DECIMAL(12,2),
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_indices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE preadmissions ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
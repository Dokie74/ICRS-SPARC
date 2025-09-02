// tests/setup/global-setup.js
// Global setup for Playwright tests - ICRS SPARC

async function globalSetup(config) {
  console.log('🚀 Starting ICRS SPARC test environment setup...');
  
  const baseURL = config.use?.baseURL || 'http://localhost:3000';
  const apiURL = 'http://localhost:5000';
  
  try {
    // Wait for frontend to be available
    console.log('📱 Waiting for frontend server...');
    await waitForServer(baseURL, 30000);
    console.log('✅ Frontend server is ready');
    
    // Wait for backend API to be available
    console.log('🔧 Waiting for backend API...');
    await waitForServer(apiURL, 30000);
    console.log('✅ Backend API is ready');
    
    // Initialize test data if needed
    console.log('📊 Setting up test data...');
    await setupTestData(apiURL);
    console.log('✅ Test data initialized');
    
    console.log('🎉 Test environment setup complete');
    
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  }
}

async function waitForServer(url, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        timeout: 5000 
      });
      
      if (response.ok || response.status === 404) {
        // Server is responding
        return true;
      }
    } catch (error) {
      // Server not ready yet, continue waiting
    }
    
    // Wait 1 second before retrying
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Server at ${url} did not become available within ${timeout}ms`);
}

async function setupTestData(apiURL) {
  try {
    // Check if we can reach the API
    const healthCheck = await fetch(`${apiURL}/health`).catch(() => null);
    
    if (!healthCheck?.ok) {
      console.warn('⚠️  Backend API health check failed, proceeding without test data setup');
      return;
    }
    
    // Setup test employees
    await setupTestEmployees(apiURL);
    
    // Setup test parts
    await setupTestParts(apiURL);
    
    // Setup test customers
    await setupTestCustomers(apiURL);
    
    // Setup test suppliers
    await setupTestSuppliers(apiURL);
    
  } catch (error) {
    console.warn('⚠️  Test data setup failed (tests will continue):', error.message);
  }
}

async function setupTestEmployees(apiURL) {
  const testEmployees = [
    {
      name: 'Test Admin User',
      email: 'admin@test.com',
      role: 'admin',
      department: 'administration',
      status: 'active'
    },
    {
      name: 'Test Manager User',
      email: 'manager@test.com',
      role: 'manager',
      department: 'warehouse',
      status: 'active'
    }
  ];
  
  for (const employee of testEmployees) {
    try {
      await fetch(`${apiURL}/api/admin/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employee)
      });
    } catch (error) {
      // Ignore individual failures
    }
  }
}

async function setupTestParts(apiURL) {
  const testParts = [
    {
      id: 'E2E-TEST-001',
      description: 'Test Electronic Component for E2E Testing',
      hts_code: '8541.10.0060',
      country_of_origin: 'USA',
      material: 'electronic',
      standard_value: 25.00,
      material_price: 15.00,
      labor_price: 10.00,
      unit_of_measure: 'EA',
      status: 'active'
    },
    {
      id: 'E2E-TEST-002',
      description: 'Test Mechanical Part for E2E Testing',
      hts_code: '8708.99.8180',
      country_of_origin: 'CHN',
      material: 'steel',
      standard_value: 45.50,
      material_price: 30.00,
      labor_price: 15.50,
      unit_of_measure: 'EA',
      status: 'active'
    }
  ];
  
  for (const part of testParts) {
    try {
      await fetch(`${apiURL}/api/admin/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(part)
      });
    } catch (error) {
      // Ignore individual failures
    }
  }
}

async function setupTestCustomers(apiURL) {
  const testCustomers = [
    {
      name: 'E2E Test Customer Corp',
      ein: '12-3456789',
      address: '123 Test Street, Test City, TS 12345',
      contact_email: 'contact@e2etest.com',
      industry: 'manufacturing',
      status: 'active',
      contacts: [{
        name: 'John Test',
        email: 'john@e2etest.com',
        phone: '(555) 123-4567',
        is_primary: true
      }]
    }
  ];
  
  for (const customer of testCustomers) {
    try {
      await fetch(`${apiURL}/api/admin/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer)
      });
    } catch (error) {
      // Ignore individual failures
    }
  }
}

async function setupTestSuppliers(apiURL) {
  const testSuppliers = [
    {
      name: 'E2E Test Supplier Ltd',
      country: 'CHN',
      contact_person: 'Li Wei',
      contact_email: 'li@e2etest-supplier.com',
      payment_terms: 'net-30',
      currency: 'USD',
      status: 'active',
      contacts: [{
        name: 'Li Wei',
        email: 'li@e2etest-supplier.com',
        is_primary: true
      }]
    }
  ];
  
  for (const supplier of testSuppliers) {
    try {
      await fetch(`${apiURL}/api/admin/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplier)
      });
    } catch (error) {
      // Ignore individual failures
    }
  }
}

export default globalSetup;
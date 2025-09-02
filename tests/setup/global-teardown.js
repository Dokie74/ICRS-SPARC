// tests/setup/global-teardown.js
// Global teardown for Playwright tests - ICRS SPARC

async function globalTeardown(config) {
  console.log('🧹 Starting ICRS SPARC test environment cleanup...');
  
  const apiURL = 'http://localhost:5000';
  
  try {
    // Clean up test data
    console.log('📊 Cleaning up test data...');
    await cleanupTestData(apiURL);
    console.log('✅ Test data cleaned');
    
    // Generate test summary
    console.log('📋 Generating test summary...');
    await generateTestSummary();
    console.log('✅ Test summary generated');
    
    console.log('🎉 Test environment cleanup complete');
    
  } catch (error) {
    console.warn('⚠️  Test cleanup encountered issues (this is usually not critical):', error.message);
  }
}

async function cleanupTestData(apiURL) {
  try {
    // Check if API is still available
    const healthCheck = await fetch(`${apiURL}/health`, { timeout: 5000 }).catch(() => null);
    
    if (!healthCheck?.ok) {
      console.log('ℹ️  Backend API not available for cleanup');
      return;
    }
    
    // Clean up test employees
    await cleanupTestEmployees(apiURL);
    
    // Clean up test parts
    await cleanupTestParts(apiURL);
    
    // Clean up test customers
    await cleanupTestCustomers(apiURL);
    
    // Clean up test suppliers
    await cleanupTestSuppliers(apiURL);
    
  } catch (error) {
    console.warn('⚠️  Test data cleanup failed:', error.message);
  }
}

async function cleanupTestEmployees(apiURL) {
  try {
    // Get all employees
    const response = await fetch(`${apiURL}/api/admin/employees`);
    if (!response.ok) return;
    
    const data = await response.json();
    const employees = data.success ? data.data : [];
    
    // Delete test employees
    for (const employee of employees) {
      if (employee.email?.includes('test.com') || employee.name?.includes('Test')) {
        try {
          await fetch(`${apiURL}/api/admin/employees/${employee.id}`, {
            method: 'DELETE'
          });
        } catch (error) {
          // Ignore individual failures
        }
      }
    }
  } catch (error) {
    // Ignore cleanup failures
  }
}

async function cleanupTestParts(apiURL) {
  try {
    // Get all parts
    const response = await fetch(`${apiURL}/api/admin/parts`);
    if (!response.ok) return;
    
    const data = await response.json();
    const parts = data.success ? data.data : [];
    
    // Delete test parts
    for (const part of parts) {
      if (part.id?.includes('E2E-TEST') || part.description?.includes('E2E Testing')) {
        try {
          await fetch(`${apiURL}/api/admin/parts/${part.id}`, {
            method: 'DELETE'
          });
        } catch (error) {
          // Ignore individual failures
        }
      }
    }
  } catch (error) {
    // Ignore cleanup failures
  }
}

async function cleanupTestCustomers(apiURL) {
  try {
    // Get all customers
    const response = await fetch(`${apiURL}/api/admin/customers`);
    if (!response.ok) return;
    
    const data = await response.json();
    const customers = data.success ? data.data : [];
    
    // Delete test customers
    for (const customer of customers) {
      if (customer.name?.includes('E2E Test') || customer.contact_email?.includes('e2etest.com')) {
        try {
          await fetch(`${apiURL}/api/admin/customers/${customer.id}`, {
            method: 'DELETE'
          });
        } catch (error) {
          // Ignore individual failures
        }
      }
    }
  } catch (error) {
    // Ignore cleanup failures
  }
}

async function cleanupTestSuppliers(apiURL) {
  try {
    // Get all suppliers
    const response = await fetch(`${apiURL}/api/admin/suppliers`);
    if (!response.ok) return;
    
    const data = await response.json();
    const suppliers = data.success ? data.data : [];
    
    // Delete test suppliers
    for (const supplier of suppliers) {
      if (supplier.name?.includes('E2E Test') || supplier.contact_email?.includes('e2etest')) {
        try {
          await fetch(`${apiURL}/api/admin/suppliers/${supplier.id}`, {
            method: 'DELETE'
          });
        } catch (error) {
          // Ignore individual failures
        }
      }
    }
  } catch (error) {
    // Ignore cleanup failures
  }
}

async function generateTestSummary() {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const testResultsDir = 'test-results';
    const summaryFile = path.join(testResultsDir, 'test-summary.json');
    
    // Create basic test summary
    const summary = {
      timestamp: new Date().toISOString(),
      environment: {
        frontend: 'http://localhost:3000',
        backend: 'http://localhost:5000',
        nodeEnv: process.env.NODE_ENV || 'test'
      },
      testSuite: 'ICRS SPARC Admin Modals',
      cleanup: {
        completed: true,
        timestamp: new Date().toISOString()
      }
    };
    
    // Ensure test results directory exists
    try {
      await fs.mkdir(testResultsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    // Write summary file
    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
    
  } catch (error) {
    // Summary generation is not critical
    console.warn('Could not generate test summary:', error.message);
  }
}

export default globalTeardown;
// src/backend/api/routes/admin.js
// Admin management API routes for ICRS SPARC
// Handles employee management, parts master, customers, suppliers, and batch operations

const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { asyncHandler } = require('../middleware/async');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Middleware - all admin routes require authentication and admin role
// Note: authMiddleware is applied at the app level for /api/admin routes
router.use(requireRole(['admin']));

// Helper function to check demo mode
const isDemoToken = (token) => {
  return token && token.startsWith('demo-token-for-testing-only-');
};

// GET /api/admin/stats - Get admin statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (isDemoToken(accessToken)) {
    const mockStats = {
      totalEmployees: 42,
      totalParts: 15847,
      activeCustomers: 238,
      totalSuppliers: 67,
      totalLocations: 89,
      pendingApprovals: 12,
      systemHealth: 'good'
    };
    
    return res.json({
      success: true,
      data: mockStats
    });
  }
  
  // Production database queries would go here
  res.status(501).json({
    success: false,
    error: 'Admin stats not implemented for production database'
  });
}));

// GET /api/admin/employees - Get employees list
router.get('/employees', asyncHandler(async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  const { department, role, status, search, page = 1, limit = 50 } = req.query;
  
  if (isDemoToken(accessToken)) {
    const mockEmployees = [
      {
        id: 1,
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@company.com',
        role: 'admin',
        department: 'admin',
        status: 'active',
        hire_date: '2022-01-15',
        phone: '555-0101'
      },
      {
        id: 2,
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah.johnson@company.com',
        role: 'manager',
        department: 'warehouse',
        status: 'active',
        hire_date: '2021-08-20',
        phone: '555-0102'
      },
      {
        id: 3,
        first_name: 'Mike',
        last_name: 'Wilson',
        email: 'mike.wilson@company.com',
        role: 'warehouse_staff',
        department: 'warehouse',
        status: 'active',
        hire_date: '2023-03-10',
        phone: '555-0103'
      },
      {
        id: 4,
        first_name: 'Emily',
        last_name: 'Davis',
        email: 'emily.davis@company.com',
        role: 'warehouse_staff',
        department: 'customs',
        status: 'inactive',
        hire_date: '2020-11-05',
        phone: '555-0104'
      }
    ];

    // Apply filters
    let filteredEmployees = mockEmployees;
    
    if (department) {
      filteredEmployees = filteredEmployees.filter(emp => emp.department === department);
    }
    
    if (role) {
      filteredEmployees = filteredEmployees.filter(emp => emp.role === role);
    }
    
    if (status) {
      filteredEmployees = filteredEmployees.filter(emp => emp.status === status);
    }
    
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredEmployees = filteredEmployees.filter(emp => 
        emp.first_name.toLowerCase().includes(searchTerm) ||
        emp.last_name.toLowerCase().includes(searchTerm) ||
        emp.email.toLowerCase().includes(searchTerm)
      );
    }
    
    return res.json({
      success: true,
      data: filteredEmployees,
      pagination: {
        total: filteredEmployees.length,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  }
  
  res.status(501).json({
    success: false,
    error: 'Employee management not implemented for production database'
  });
}));

// POST /api/admin/employees - Create new employee
router.post('/employees', asyncHandler(async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  const { first_name, last_name, email, role, department, phone } = req.body;
  
  if (isDemoToken(accessToken)) {
    // In demo mode, just return success with mock data
    const newEmployee = {
      id: Math.floor(Math.random() * 10000),
      first_name,
      last_name,
      email,
      role,
      department,
      phone,
      status: 'active',
      hire_date: new Date().toISOString().split('T')[0]
    };
    
    return res.status(201).json({
      success: true,
      data: newEmployee
    });
  }
  
  res.status(501).json({
    success: false,
    error: 'Employee creation not implemented for production database'
  });
}));

// PUT /api/admin/employees/:id - Update employee
router.put('/employees/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (isDemoToken(accessToken)) {
    return res.json({
      success: true,
      data: { id: parseInt(id), ...req.body }
    });
  }
  
  res.status(501).json({
    success: false,
    error: 'Employee update not implemented for production database'
  });
}));

// DELETE /api/admin/employees/:id - Delete employee
router.delete('/employees/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (isDemoToken(accessToken)) {
    return res.json({
      success: true,
      message: `Employee ${id} deleted successfully`
    });
  }
  
  res.status(501).json({
    success: false,
    error: 'Employee deletion not implemented for production database'
  });
}));

// GET /api/admin/parts-master - Get parts master data
router.get('/parts-master', asyncHandler(async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  const { category, status, supplier, search, page = 1, limit = 100 } = req.query;
  
  if (isDemoToken(accessToken)) {
    const mockParts = [
      {
        id: 1,
        part_number: 'ENG-001-A',
        description: 'Engine Block Assembly',
        category: 'engine',
        unit_price: 2500.00,
        status: 'active',
        supplier: 'Acme Motors',
        created_at: '2023-01-15'
      },
      {
        id: 2,
        part_number: 'TRN-045-B',
        description: 'Transmission Gear Set',
        category: 'transmission',
        unit_price: 850.00,
        status: 'active',
        supplier: 'PowerTrain Inc',
        created_at: '2023-02-20'
      },
      {
        id: 3,
        part_number: 'BRK-012-C',
        description: 'Brake Pad Assembly',
        category: 'brakes',
        unit_price: 125.00,
        status: 'discontinued',
        supplier: 'Safety First',
        created_at: '2022-11-10'
      }
    ];

    // Apply filters similar to employees
    let filteredParts = mockParts;
    
    if (category) {
      filteredParts = filteredParts.filter(part => part.category === category);
    }
    
    if (status) {
      filteredParts = filteredParts.filter(part => part.status === status);
    }
    
    if (supplier) {
      filteredParts = filteredParts.filter(part => part.supplier.toLowerCase().includes(supplier.toLowerCase()));
    }
    
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredParts = filteredParts.filter(part => 
        part.part_number.toLowerCase().includes(searchTerm) ||
        part.description.toLowerCase().includes(searchTerm)
      );
    }
    
    return res.json({
      success: true,
      data: filteredParts,
      pagination: {
        total: filteredParts.length,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  }
  
  res.status(501).json({
    success: false,
    error: 'Parts master not implemented for production database'
  });
}));

// GET /api/admin/customers-master - Get customers master data
router.get('/customers-master', asyncHandler(async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (isDemoToken(accessToken)) {
    const mockCustomers = [
      {
        id: 1,
        company_name: 'Global Manufacturing Corp',
        contact_person: 'James Rodriguez',
        email: 'james@globalmanuf.com',
        phone: '555-1001',
        type: 'manufacturer',
        status: 'active',
        region: 'north_america'
      },
      {
        id: 2,
        company_name: 'European Auto Parts Ltd',
        contact_person: 'Maria Schmidt',
        email: 'maria@euroauto.com',
        phone: '555-1002',
        type: 'distributor',
        status: 'active',
        region: 'europe'
      }
    ];
    
    return res.json({
      success: true,
      data: mockCustomers
    });
  }
  
  res.status(501).json({
    success: false,
    error: 'Customers master not implemented for production database'
  });
}));

// GET /api/admin/suppliers-master - Get suppliers master data
router.get('/suppliers-master', asyncHandler(async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (isDemoToken(accessToken)) {
    const mockSuppliers = [
      {
        id: 1,
        company_name: 'Acme Motors',
        contact_person: 'Robert Chen',
        email: 'robert@acmemotors.com',
        phone: '555-2001',
        type: 'manufacturer',
        status: 'active',
        country: 'USA'
      },
      {
        id: 2,
        company_name: 'PowerTrain Inc',
        contact_person: 'Lisa Thompson',
        email: 'lisa@powertrain.com',
        phone: '555-2002',
        type: 'specialist',
        status: 'active',
        country: 'Canada'
      }
    ];
    
    return res.json({
      success: true,
      data: mockSuppliers
    });
  }
  
  res.status(501).json({
    success: false,
    error: 'Suppliers master not implemented for production database'
  });
}));

// GET /api/admin/storage-locations - Get storage locations data
router.get('/storage-locations', asyncHandler(async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (isDemoToken(accessToken)) {
    const mockLocations = [
      {
        id: 1,
        location_code: 'A-01-001',
        description: 'Main Warehouse - Section A',
        zone: 'A',
        type: 'standard',
        status: 'active',
        capacity: 1000,
        current_usage: 750
      },
      {
        id: 2,
        location_code: 'B-02-015',
        description: 'Cold Storage - Section B',
        zone: 'B',
        type: 'temperature_controlled',
        status: 'active',
        capacity: 500,
        current_usage: 320
      }
    ];
    
    return res.json({
      success: true,
      data: mockLocations
    });
  }
  
  res.status(501).json({
    success: false,
    error: 'Storage locations not implemented for production database'
  });
}));

// POST /api/admin/batch-upload/:type - Handle batch CSV uploads
router.post('/batch-upload/:type', upload.single('file'), asyncHandler(async (req, res) => {
  const { type } = req.params;
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded'
    });
  }

  const allowedTypes = ['employees', 'parts', 'customers', 'suppliers', 'locations'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: `Invalid upload type: ${type}`
    });
  }

  if (isDemoToken(accessToken)) {
    // In demo mode, simulate processing the CSV
    const results = [];
    let processedCount = 0;
    let errorCount = 0;

    return new Promise((resolve) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
          processedCount++;
          results.push(data);
        })
        .on('end', () => {
          // Clean up uploaded file
          fs.unlinkSync(req.file.path);
          
          // Simulate some processing time
          setTimeout(() => {
            res.json({
              success: true,
              data: {
                type,
                processed: processedCount,
                errors: errorCount,
                message: `Successfully processed ${processedCount} ${type} records`
              }
            });
          }, 1000);
        })
        .on('error', (error) => {
          // Clean up uploaded file
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          
          res.status(400).json({
            success: false,
            error: `Error processing CSV: ${error.message}`
          });
        });
    });
  }
  
  // Clean up file and return not implemented for production
  fs.unlinkSync(req.file.path);
  res.status(501).json({
    success: false,
    error: 'Batch upload not implemented for production database'
  });
}));

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 5MB.'
      });
    }
  } else if (error.message === 'Only CSV files are allowed') {
    return res.status(400).json({
      success: false,
      error: 'Only CSV files are allowed'
    });
  }
  
  next(error);
});

module.exports = router;
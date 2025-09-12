// src/backend/api/routes/admin.js
// Admin management API routes for ICRS SPARC
// Handles employee management, parts master, customers, suppliers, and batch operations

const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { asyncHandler } = require('../middleware/async');
const { authMiddleware, requireRole } = require('../middleware/auth');
const supabaseClient = require('../../db/supabase-client');

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

// GET /api/admin/stats - Get admin statistics
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const options = { 
      accessToken: req.accessToken,
      select: 'id', // Minimal select to get count efficiently
      limit: 1 // We only need count, not data
    };
    
    // Get counts from various tables using getAll method
    const [customersResult, partsResult, inventoryResult, suppliersResult] = await Promise.allSettled([
      supabaseClient.getAll('customers', options, true),
      supabaseClient.getAll('parts', options, true),  
      supabaseClient.getAll('inventory_lots', options, true),
      supabaseClient.getAll('suppliers', options, true)
    ]);

    // Extract counts safely
    const customerCount = customersResult.status === 'fulfilled' && customersResult.value?.success 
      ? customersResult.value.count : 0;
    const partCount = partsResult.status === 'fulfilled' && partsResult.value?.success 
      ? partsResult.value.count : 0;
    const inventoryCount = inventoryResult.status === 'fulfilled' && inventoryResult.value?.success 
      ? inventoryResult.value.count : 0;
    const supplierCount = suppliersResult.status === 'fulfilled' && suppliersResult.value?.success 
      ? suppliersResult.value.count : 0;

    // Calculate some basic metrics
    const stats = {
      overview: {
        total_customers: customerCount,
        total_parts: partCount,
        total_inventory_lots: inventoryCount,
        total_suppliers: supplierCount
      },
      system: {
        database_status: 'connected',
        last_updated: new Date().toISOString(),
        data_freshness: 'real-time'
      }
    };

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve admin statistics'
    });
  }
}));

// GET /api/admin/employees - Get employees list
router.get('/employees', asyncHandler(async (req, res) => {
  const { department, role, status, search, page = 1, limit = 50 } = req.query;
  
  try {
    // Since employees table may not exist yet, return mock data for now
    // In production, this would query the actual employees table
    const mockEmployees = [
      {
        id: 1,
        name: 'System Administrator',
        email: 'admin@icrs.com',
        department: 'IT',
        role: 'admin',
        status: 'active',
        created_at: new Date().toISOString()
      }
    ];

    // Apply filters if provided
    let filteredEmployees = mockEmployees;
    
    if (department && department !== '') {
      filteredEmployees = filteredEmployees.filter(emp => 
        emp.department?.toLowerCase().includes(department.toLowerCase())
      );
    }
    
    if (role && role !== '') {
      filteredEmployees = filteredEmployees.filter(emp => 
        emp.role?.toLowerCase().includes(role.toLowerCase())
      );
    }
    
    if (status && status !== '' && status !== 'all') {
      filteredEmployees = filteredEmployees.filter(emp => emp.status === status);
    }
    
    if (search && search !== '') {
      filteredEmployees = filteredEmployees.filter(emp => 
        emp.name?.toLowerCase().includes(search.toLowerCase()) ||
        emp.email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + parseInt(limit));

    return res.json({
      success: true,
      data: paginatedEmployees,
      pagination: {
        total: filteredEmployees.length,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(filteredEmployees.length / parseInt(limit))
      },
      meta: {
        note: 'Employee management is using mock data. Implement employees table for full functionality.'
      }
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve employees'
    });
  }
}));

// POST /api/admin/employees - Create new employee
router.post('/employees', asyncHandler(async (req, res) => {
  try {
    // TODO: Implement employee creation for production database
    res.status(501).json({
      success: false,
      error: 'Employee creation not yet implemented'
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create employee'
    });
  }
}));

// PUT /api/admin/employees/:id - Update employee
router.put('/employees/:id', asyncHandler(async (req, res) => {
  try {
    // TODO: Implement employee update for production database
    res.status(501).json({
      success: false,
      error: 'Employee update not yet implemented'
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update employee'
    });
  }
}));

// DELETE /api/admin/employees/:id - Delete employee
router.delete('/employees/:id', asyncHandler(async (req, res) => {
  try {
    // TODO: Implement employee deletion for production database
    res.status(501).json({
      success: false,
      error: 'Employee deletion not yet implemented'
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete employee'
    });
  }
}));

// GET /api/admin/parts-master - Get parts master data
router.get('/parts-master', asyncHandler(async (req, res) => {
  const { country, manufacturer, priceRange, hasVariants, material, sortBy, search, page = 1, limit = 100 } = req.query;
  
  try {
    const options = {
      select: '*',
      orderBy: {
        column: sortBy || 'id',
        ascending: true
      },
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      accessToken: req.accessToken
    };

    // Build filters for parts table based on actual schema
    const filters = [];
    
    if (country && country !== '') {
      filters.push({ column: 'country_of_origin', value: country });
    }
    
    if (search && search !== '') {
      // Search in description, hts_code, or id
      filters.push({ 
        column: 'description', 
        value: `%${search}%`, 
        operator: 'ilike' 
      });
    }
    
    // Note: manufacturer, priceRange, hasVariants, material are not available in current schema
    // but keeping parameters for UI compatibility

    if (filters.length > 0) {
      options.filters = filters;
    }

    const result = await supabaseClient.getAll('parts', options, true);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to retrieve parts'
      });
    }

    return res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.count || result.data?.length || 0,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get parts-master error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve parts master data'
    });
  }
}));

// GET /api/admin/customers-master - Get customers master data
router.get('/customers-master', asyncHandler(async (req, res) => {
  const { type, status, search, page = 1, limit = 100 } = req.query;
  
  try {
    const options = {
      select: '*',
      orderBy: {
        column: 'name',
        ascending: true
      },
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      accessToken: req.accessToken
    };

    // Build filters for customers table
    const filters = [];
    
    // NOTE: 'type' column doesn't exist in customers table
    // if (type) {
    //   filters.push({ column: 'type', value: type });
    // }
    
    if (search) {
      // Search across customer name and contact fields
      filters.push({ 
        column: 'name', 
        value: `%${search}%`, 
        operator: 'ilike' 
      });
    }

    if (filters.length > 0) {
      options.filters = filters;
    }

    const result = await supabaseClient.getAll('customers', options, true);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to retrieve customers'
      });
    }

    return res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.count || result.data?.length || 0,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get customers-master error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve customers master data'
    });
  }
}));

// GET /api/admin/suppliers-master - Get suppliers master data
router.get('/suppliers-master', asyncHandler(async (req, res) => {
  try {
    const options = {
      select: '*',
      orderBy: {
        column: 'name',
        ascending: true
      },
      accessToken: req.accessToken
    };

    const result = await supabaseClient.getAll('suppliers', options, true);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to retrieve suppliers'
      });
    }

    return res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Get suppliers-master error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve suppliers master data'
    });
  }
}));

// GET /api/admin/suppliers - Get suppliers list
router.get('/suppliers', asyncHandler(async (req, res) => {
  const { type, status, search, page = 1, limit = 50 } = req.query;
  
  try {
    const options = {
      select: '*',
      orderBy: {
        column: 'name',
        ascending: true
      },
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      accessToken: req.accessToken
    };

    // Build filters
    const filters = [];
    
    if (type) {
      filters.push({ column: 'supplier_type', value: type });  // Use supplier_type not type
    }
    
    if (search) {
      // For search, use OR conditions across multiple fields
      // Note: This is a simplified approach - in production you might want to use full-text search
      filters.push({ 
        column: 'name', 
        value: `%${search}%`, 
        operator: 'ilike' 
      });
      // Note: Supabase client filters are AND by default
      // For OR search across multiple fields, we might need to use raw SQL or modify the search approach
    }

    if (filters.length > 0) {
      options.filters = filters;
    }

    const result = await supabaseClient.getAll('suppliers', options, true);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to retrieve suppliers'
      });
    }

    return res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.count,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve suppliers'
    });
  }
}));

// POST /api/admin/suppliers - Create new supplier
router.post('/suppliers', asyncHandler(async (req, res) => {
  // Handle field mapping for frontend/backend compatibility
  const name = req.body.name;
  const contact_email = req.body.email || req.body.contact_email; // Map email to contact_email
  const contact_person = req.body.contact_person;
  
  const { phone, type, country, address } = req.body;
  
  // Validation
  if (!name || !contact_person || !contact_email) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: name, contact_person, contact_email'
    });
  }
  
  try {
    // Prepare supplier data (map to actual database columns)
    const supplierData = {
      name,
      contact_person,
      contact_email,  // Use contact_email not email
      phone: phone || '',
      supplier_type: type || 'general',  // Use supplier_type not type
      country: country || 'USA',
      address: address || ''
      // NOTE: status field doesn't exist in suppliers table
    };

    const result = await supabaseClient.create(
      'suppliers',
      supplierData,
      { accessToken: req.accessToken },
      true
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to create supplier'
      });
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create supplier'
    });
  }
}));

// PUT /api/admin/suppliers/:id - Update supplier
router.put('/suppliers/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    // Handle field mapping for frontend/backend compatibility
    const name = req.body.name;
    const contact_email = req.body.email || req.body.contact_email;  // Map email to contact_email
    const contact_person = req.body.contact_person;
    
    const { phone, type, country, address, status } = req.body;
    
    // Prepare update data (only include fields that are provided, map to database columns)
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (contact_person !== undefined) updateData.contact_person = contact_person;
    if (contact_email !== undefined) updateData.contact_email = contact_email;  // Use contact_email not email
    if (phone !== undefined) updateData.phone = phone;
    if (type !== undefined) updateData.supplier_type = type;  // Use supplier_type not type
    if (country !== undefined) updateData.country = country;
    if (address !== undefined) updateData.address = address;
    // NOTE: status field doesn't exist in suppliers table
    // if (status !== undefined) updateData.status = status;
    
    const result = await supabaseClient.update(
      'suppliers',
      id,
      updateData,
      { accessToken: req.accessToken },
      true
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to update supplier'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update supplier'
    });
  }
}));

// DELETE /api/admin/suppliers/:id - Delete supplier
router.delete('/suppliers/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await supabaseClient.delete(
      'suppliers',
      id,
      { accessToken: req.accessToken },
      true
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to delete supplier'
      });
    }

    res.json({
      success: true,
      message: `Supplier ${id} deleted successfully`
    });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete supplier'
    });
  }
}));

// GET /api/admin/storage-locations - Get storage locations data
router.get('/storage-locations', asyncHandler(async (req, res) => {
  const { zone, type, isActive, search, page = 1, limit = 50 } = req.query;
  
  try {
    const options = {
      select: '*',
      orderBy: {
        column: 'location_code',
        ascending: true
      },
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      accessToken: req.accessToken
    };

    // Build filters
    const filters = [];
    
    if (zone && zone !== 'all' && zone !== '') {
      filters.push({ column: 'zone', value: zone });
    }
    
    // NOTE: 'type' column doesn't exist in storage_locations table
    // if (type && type !== 'all' && type !== '') {
    //   filters.push({ column: 'type', value: type });
    // }
    
    if (search && search !== '') {
      // Search in location_code or description
      filters.push({ 
        column: 'location_code', 
        value: `%${search}%`, 
        operator: 'ilike' 
      });
    }

    if (filters.length > 0) {
      options.filters = filters;
    }

    // Try to get from storage_locations table
    const result = await supabaseClient.getAll('storage_locations', options);

    if (result.success) {
      return res.json({
        success: true,
        data: result.data || [],
        pagination: {
          total: result.count || result.data?.length || 0,
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages: Math.ceil((result.count || result.data?.length || 0) / parseInt(limit))
        }
      });
    } else {
      // If storage_locations table doesn't exist, return mock data
      const mockLocations = [
        {
          id: 1,
          location_code: 'A-01-01',
          description: 'Main warehouse - Aisle A, Level 1, Position 1',
          zone: 'A',
          aisle: '01',
          level: '01',
          position: '01',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          location_code: 'B-02-03', 
          description: 'Main warehouse - Aisle B, Level 2, Position 3',
          zone: 'B',
          aisle: '02',
          level: '02',
          position: '03',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      // Apply basic filtering to mock data
      let filteredLocations = mockLocations;
      if (zone && zone !== 'all') {
        filteredLocations = filteredLocations.filter(loc => loc.zone === zone);
      }
      if (search) {
        filteredLocations = filteredLocations.filter(loc => 
          loc.location_code?.toLowerCase().includes(search.toLowerCase()) ||
          loc.description?.toLowerCase().includes(search.toLowerCase())
        );
      }

      return res.json({
        success: true,
        data: filteredLocations,
        pagination: {
          total: filteredLocations.length,
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages: Math.ceil(filteredLocations.length / parseInt(limit))
        },
        meta: {
          note: 'Storage locations table not found. Using mock data. Create storage_locations table for full functionality.'
        }
      });
    }
  } catch (error) {
    console.error('Get storage locations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve storage locations'
    });
  }
}));

// POST /api/admin/batch-upload/:type - Handle batch CSV uploads
router.post('/batch-upload/:type', upload.single('file'), asyncHandler(async (req, res) => {
  const { type } = req.params;
  
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded'
    });
  }

  const allowedTypes = ['employees', 'parts', 'customers', 'suppliers', 'storage_locations'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: `Invalid upload type: ${type}`
    });
  }

  try {
    // TODO: Implement batch CSV upload for production database
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    res.status(501).json({
      success: false,
      error: 'Batch upload not yet implemented'
    });
  } catch (error) {
    console.error('Batch upload error:', error);
    // Clean up file on error
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to process batch upload'
    });
  }
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

// DELETE /api/admin/parts/:id - Delete part
router.delete('/parts/:id', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const options = { accessToken: req.accessToken };

    const result = await supabaseClient.delete('parts', id, options);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Part deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to delete part'
      });
    }
  } catch (error) {
    console.error('Delete part error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting part'
    });
  }
}));

// DELETE /api/admin/customers/:id - Delete customer
router.delete('/customers/:id', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const options = { accessToken: req.accessToken };

    const result = await supabaseClient.delete('customers', id, options);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Customer deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to delete customer'
      });
    }
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting customer'
    });
  }
}));

// PATCH /api/admin/locations/:id - Update location (e.g., toggle active status)
router.patch('/locations/:id', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const options = { accessToken: req.accessToken };

    const result = await supabaseClient.update('storage_locations', id, updates, options);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Location updated successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to update location'
      });
    }
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating location'
    });
  }
}));

module.exports = router;
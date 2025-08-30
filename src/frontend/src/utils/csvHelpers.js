// src/frontend/utils/csvHelpers.js
// CSV processing utilities for batch uploads and data management
// SPARC-compliant helper functions for admin data operations

/**
 * Parse CSV text into array of objects
 * Handles quoted fields and filters out instruction/comment lines
 * @param {string} csvText - Raw CSV content
 * @returns {array} Array of parsed row objects
 */
export const parseCSV = (csvText) => {
  // Filter out comment lines, instruction lines, and empty lines
  const lines = csvText.split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return trimmed !== '' && 
             !trimmed.startsWith('#') && 
             !trimmed.includes('INSTRUCTIONS:') &&
             !trimmed.includes('REQUIRED:') &&
             !trimmed.includes('OPTIONAL:');
    });
  
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    // Simple CSV parsing - handles basic quoted fields
    const line = lines[i];
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"' && (j === 0 || line[j-1] === ',')) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && (j === line.length - 1 || line[j+1] === ',')) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Add the last value
    
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  
  return rows;
};

/**
 * Generate CSV template content for different data types
 * @param {string} templateType - Type of template (parts, customers, suppliers, etc.)
 * @returns {string} CSV template content
 */
export const generateCSVTemplate = (templateType) => {
  const templates = {
    parts: {
      headers: ['id', 'description', 'hts_code', 'country_of_origin', 'standard_value', 'material_price', 'labor_price', 'unit_of_measure', 'manufacturer_id', 'gross_weight', 'material'],
      instructions: [
        'INSTRUCTIONS: Delete this row and the format rows below, then add your data',
        'REQUIRED: 1-50 chars,REQUIRED: 5-500 chars,OPTIONAL: XXXX.XX.XXXX or XXXX.XX.XX,OPTIONAL: 2-letter code,OPTIONAL: total price,OPTIONAL: material cost,OPTIONAL: labor cost,OPTIONAL: text,OPTIONAL: text,OPTIONAL: decimal KG,OPTIONAL: material type'
      ],
      examples: [
        'PART001,Steel Widget Assembly,8421.39.8080,US,125.50,75.00,50.50,EA,ACME Corp,2.5,steel',
        'PART002,Aluminum Bracket,7326.90.8550,CN,45.25,30.00,15.25,EA,Global Mfg,0.8,aluminum',
        'PART003,Plastic Component,,US,15.75,8.50,7.25,EA,Local Supplier,0.2,plastic'
      ]
    },
    customers: {
      headers: ['name', 'ein', 'address', 'broker_name', 'contact_email'],
      instructions: [
        'INSTRUCTIONS: Delete this row and the format row below, then add your data',
        'REQUIRED: 2-200 chars,OPTIONAL: XX-XXXXXXX,OPTIONAL: full address,OPTIONAL: broker name,OPTIONAL: valid email'
      ],
      examples: [
        'ABC Manufacturing Inc,12-3456789,123 Main St\\, Anytown\\, ST 12345,Smith Customs LLC,contact@abcmfg.com',
        'XYZ Trading Company,98-7654321,456 Commerce Blvd\\, Business City\\, CA 90210,Global Broker Inc,orders@xyztrading.com',
        'Simple Customer,,,,'
      ]
    },
    suppliers: {
      headers: ['name', 'ein', 'address', 'broker_name', 'contact_email', 'phone', 'contact_person', 'supplier_type', 'country'],
      instructions: [
        'INSTRUCTIONS: Delete this row and the format rows below, then add your data',
        'REQUIRED: 2-200 chars,OPTIONAL: XX-XXXXXXX,OPTIONAL: full address,OPTIONAL: broker name,OPTIONAL: valid email,OPTIONAL: phone number,OPTIONAL: contact name,OPTIONAL: Manufacturer/Distributor,OPTIONAL: country code'
      ],
      examples: [
        'ACME Manufacturing,12-3456789,789 Industrial Blvd\\, Factory City\\, TX 75001,Import Solutions LLC,purchasing@acme.com,+1-555-0123,John Smith,Manufacturer,US',
        'Global Parts Ltd,98-7654321,456 Export Ave\\, Trade City\\, CA 90210,World Customs Inc,sales@globalparts.com,+1-555-0456,Jane Doe,Distributor,US',
        'Simple Supplier,,,,,,,Manufacturer,CN'
      ]
    },
    users: {
      headers: ['email', 'role'],
      instructions: [
        'INSTRUCTIONS: Delete this row and the format row below, then add your data',
        'REQUIRED: valid email,REQUIRED: warehouse_staff, manager, or admin'
      ],
      examples: [
        'john.doe@company.com,warehouse_staff',
        'jane.smith@company.com,manager',
        'admin.user@company.com,admin'
      ]
    },
    storageLocations: {
      headers: ['location_code', 'location_type', 'description', 'zone', 'aisle', 'level', 'position', 'capacity_weight_kg', 'capacity_volume_m3', 'notes'],
      instructions: [
        'INSTRUCTIONS: Delete this row and the format row below, then add your data',
        'REQUIRED: unique code,REQUIRED: type,OPTIONAL: description,OPTIONAL: zone,OPTIONAL: aisle,OPTIONAL: level,OPTIONAL: position,OPTIONAL: weight limit,OPTIONAL: volume limit,OPTIONAL: notes'
      ],
      examples: [
        'A1-1-001,rack,Rack A1 Aisle 1 Position 1,A,1,1,001,1000.0,10.0,Main warehouse rack',
        'B2-SHELF-01,shelf,Shelf B2 Position 1,B,2,1,01,500.0,5.0,Small parts shelf',
        'DOCK-A,dock,Receiving Dock A,RECEIVING,,,A,10000.0,100.0,Primary receiving dock'
      ]
    }
  };

  const template = templates[templateType];
  if (!template) return '';

  const lines = [
    template.headers.join(','),
    ...template.instructions,
    ...template.examples
  ];

  return lines.join('\n');
};

/**
 * Download CSV template as file
 * @param {string} templateType - Type of template
 * @param {string} fileName - Name for downloaded file
 */
export const downloadTemplate = (templateType, fileName) => {
  const csvContent = generateCSVTemplate(templateType);
  const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${csvContent}`);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Validate CSV data against expected schema
 * @param {array} data - Parsed CSV data
 * @param {string} dataType - Type of data being validated
 * @returns {object} Validation result with errors if any
 */
export const validateCSVData = (data, dataType) => {
  const validationRules = {
    parts: {
      required: ['id', 'description'],
      optional: ['hts_code', 'country_of_origin', 'standard_value', 'material_price', 'labor_price', 'unit_of_measure', 'manufacturer_id', 'gross_weight', 'material'],
      validators: {
        id: (value) => value && value.length >= 1 && value.length <= 50 ? null : 'Part ID must be 1-50 characters',
        description: (value) => value && value.length >= 5 && value.length <= 500 ? null : 'Description must be 5-500 characters',
        standard_value: (value) => !value || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0) ? null : 'Standard value must be a positive number',
        gross_weight: (value) => !value || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0) ? null : 'Gross weight must be a positive number'
      }
    },
    customers: {
      required: ['name'],
      optional: ['ein', 'address', 'broker_name', 'contact_email'],
      validators: {
        name: (value) => value && value.length >= 2 && value.length <= 200 ? null : 'Customer name must be 2-200 characters',
        ein: (value) => !value || /^\d{2}-\d{7}$/.test(value) ? null : 'EIN must be in format XX-XXXXXXX',
        contact_email: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Invalid email format'
      }
    },
    suppliers: {
      required: ['name'],
      optional: ['ein', 'address', 'broker_name', 'contact_email', 'phone', 'contact_person', 'supplier_type', 'country'],
      validators: {
        name: (value) => value && value.length >= 2 && value.length <= 200 ? null : 'Supplier name must be 2-200 characters',
        ein: (value) => !value || /^\d{2}-\d{7}$/.test(value) ? null : 'EIN must be in format XX-XXXXXXX',
        contact_email: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Invalid email format',
        supplier_type: (value) => !value || ['Manufacturer', 'Distributor'].includes(value) ? null : 'Supplier type must be Manufacturer or Distributor'
      }
    }
  };

  const rules = validationRules[dataType];
  if (!rules) return { isValid: true, errors: [] };

  const errors = [];

  data.forEach((row, index) => {
    const rowErrors = {};

    // Check required fields
    rules.required.forEach(field => {
      if (!row[field] || row[field].trim() === '') {
        rowErrors[field] = `${field} is required`;
      }
    });

    // Run field validators
    Object.entries(rules.validators || {}).forEach(([field, validator]) => {
      const error = validator(row[field]);
      if (error) {
        rowErrors[field] = error;
      }
    });

    if (Object.keys(rowErrors).length > 0) {
      errors.push({
        row: index + 1,
        errors: rowErrors
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default {
  parseCSV,
  generateCSVTemplate,
  downloadTemplate,
  validateCSVData,
  formatFileSize
};
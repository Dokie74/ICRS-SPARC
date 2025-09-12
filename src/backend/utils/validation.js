// src/backend/utils/validation.js
// Input validation utilities for ICRS SPARC - transferred from original ICRS
// Maintains all FTZ validation requirements and business rules

class ValidationUtils {
  // Email validation
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Required field validation
  isRequired(value) {
    return value !== null && value !== undefined && value.toString().trim() !== '';
  }

  // String length validation
  isValidLength(value, minLength = 0, maxLength = Infinity) {
    if (!value) return minLength === 0;
    const length = value.toString().length;
    return length >= minLength && length <= maxLength;
  }

  // Number validation
  isValidNumber(value, min = -Infinity, max = Infinity) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
  }

  // Integer validation
  isValidInteger(value, min = -Infinity, max = Infinity) {
    const num = parseInt(value);
    return Number.isInteger(num) && num >= min && num <= max;
  }

  // Phone number validation (US format)
  isValidPhoneNumber(phone) {
    const phoneRegex = /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
    return phoneRegex.test(phone);
  }

  // EIN (Employer Identification Number) validation - critical for FTZ compliance
  isValidEIN(ein) {
    const einRegex = /^\d{2}-\d{7}$/;
    return einRegex.test(ein);
  }

  // HTS Code validation (supports both 6-digit HS and 10-digit HTS formats)
  isValidHTSCode(htsCode) {
    // 6-digit HS format: XXXX.XX.XX (international)
    const hsRegex = /^\d{4}\.\d{2}\.\d{2}$/;
    // 10-digit HTS format: XXXX.XX.XXXX (U.S. full format)
    const htsRegex = /^\d{4}\.\d{2}\.\d{4}$/;
    return hsRegex.test(htsCode) || htsRegex.test(htsCode);
  }

  // Container number validation - FTZ container tracking
  isValidContainerNumber(containerNumber) {
    const containerRegex = /^[A-Z]{4}\d{7}$/;
    return containerRegex.test(containerNumber);
  }

  // Bill of Lading validation - FTZ shipping documentation
  isValidBOLNumber(bolNumber) {
    return this.isRequired(bolNumber) && this.isValidLength(bolNumber, 3, 20);
  }

  // Part number validation - FTZ part master data
  isValidPartNumber(partNumber) {
    return this.isRequired(partNumber) && this.isValidLength(partNumber, 1, 50);
  }

  // Lot number validation - FTZ inventory lot tracking
  isValidLotNumber(lotNumber) {
    const lotRegex = /^L-\d+$/;
    return lotRegex.test(lotNumber);
  }

  // Date validation
  isValidDate(dateString) {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  // Future date validation
  isValidFutureDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.isValidDate(dateString) && date >= today;
  }

  // Past date validation
  isValidPastDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    return this.isValidDate(dateString) && date <= today;
  }

  // Password strength validation - FTZ security requirements
  isValidPassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  // File type validation
  isValidFileType(file, allowedTypes = []) {
    if (!file || !file.type) return false;
    return allowedTypes.length === 0 || allowedTypes.includes(file.type);
  }

  // File size validation (in bytes)
  isValidFileSize(file, maxSize = 5 * 1024 * 1024) { // Default 5MB
    if (!file || !file.size) return false;
    return file.size <= maxSize;
  }

  // Sanitize input to prevent XSS - critical for FTZ security
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Validate employee data - FTZ employee management
  validateEmployee(employeeData) {
    const errors = {};

    // Name validation
    if (!this.isRequired(employeeData.name)) {
      errors.name = 'Name is required';
    } else if (!this.isValidLength(employeeData.name, 2, 100)) {
      errors.name = 'Name must be between 2 and 100 characters';
    } else if (!/^[a-zA-Z\s\-'\.]+$/.test(employeeData.name.trim())) {
      errors.name = 'Name can only contain letters, spaces, hyphens, apostrophes, and periods';
    }

    // Email validation
    if (!this.isRequired(employeeData.email)) {
      errors.email = 'Email is required';
    } else if (!this.isValidEmail(employeeData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Role validation - FTZ role hierarchy
    if (!this.isRequired(employeeData.role)) {
      errors.role = 'Role is required';
    } else if (!['employee', 'manager', 'admin'].includes(employeeData.role)) {
      errors.role = 'Please select a valid role';
    }

    // Department validation
    if (!this.isRequired(employeeData.department)) {
      errors.department = 'Department is required';
    }

    // Job title validation (optional but if provided, should be valid)
    if (employeeData.job_title && !this.isValidLength(employeeData.job_title, 2, 100)) {
      errors.job_title = 'Job title must be between 2 and 100 characters';
    }

    // Admin privileges validation
    if (employeeData.is_admin && employeeData.role !== 'admin') {
      errors.is_admin = 'Admin privileges can only be granted to users with admin role';
    }

    // Temporary password validation
    if (employeeData.use_temp_password && !this.isRequired(employeeData.temp_password)) {
      errors.temp_password = 'Temporary password is required when option is selected';
    }

    if (employeeData.temp_password && !this.isValidPassword(employeeData.temp_password)) {
      errors.temp_password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
    }

    // Manager validation (optional)
    if (employeeData.manager_id && employeeData.manager_id === employeeData.id) {
      errors.manager_id = 'Employee cannot be their own manager';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Validate customer data - FTZ customer compliance
  validateCustomer(customerData) {
    const errors = {};

    if (!this.isRequired(customerData.name)) {
      errors.name = 'Customer name is required';
    } else if (!this.isValidLength(customerData.name, 2, 200)) {
      errors.name = 'Customer name must be between 2 and 200 characters';
    }

    // EIN validation - critical for FTZ customs compliance
    if (customerData.ein && !this.isValidEIN(customerData.ein)) {
      errors.ein = 'EIN must be in format XX-XXXXXXX';
    }

    if (customerData.contact_email && !this.isValidEmail(customerData.contact_email)) {
      errors.contact_email = 'Please enter a valid email address';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Validate supplier data - FTZ supplier management
  validateSupplier(supplierData) {
    const errors = {};

    if (!this.isRequired(supplierData.name)) {
      errors.name = 'Supplier name is required';
    } else if (!this.isValidLength(supplierData.name, 2, 200)) {
      errors.name = 'Supplier name must be between 2 and 200 characters';
    }

    if (supplierData.ein && !this.isValidEIN(supplierData.ein)) {
      errors.ein = 'EIN must be in format XX-XXXXXXX';
    }

    if (supplierData.contact_email && !this.isValidEmail(supplierData.contact_email)) {
      errors.contact_email = 'Please enter a valid email address';
    }

    if (supplierData.phone && !this.isValidPhoneNumber(supplierData.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Validate part data - FTZ part master data compliance
  validatePart(partData) {
    const errors = {};

    if (!this.isRequired(partData.id)) {
      errors.id = 'Part number is required';
    } else if (!this.isValidPartNumber(partData.id)) {
      errors.id = 'Invalid part number format';
    }

    if (!this.isRequired(partData.description)) {
      errors.description = 'Description is required';
    } else if (!this.isValidLength(partData.description, 5, 500)) {
      errors.description = 'Description must be between 5 and 500 characters';
    }

    // HTS Code validation - critical for FTZ tariff classification
    if (partData.hts_code && !this.isValidHTSCode(partData.hts_code)) {
      errors.hts_code = 'HTS Code must be in format XXXX.XX.XX (6-digit HS) or XXXX.XX.XXXX (10-digit HTS)';
    }

    if (partData.standard_value && !this.isValidNumber(partData.standard_value, 0)) {
      errors.standard_value = 'Standard value must be a positive number';
    }

    if (partData.gross_weight && !this.isValidNumber(partData.gross_weight, 0)) {
      errors.gross_weight = 'Gross weight must be a positive number';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Validate preadmission data - FTZ customs workflow validation
  validatePreadmission(preadmissionData) {
    const errors = {};

    if (!this.isRequired(preadmissionData.admission_id)) {
      errors.admission_id = 'Admission ID is required';
    }

    if (!this.isRequired(preadmissionData.customer_id)) {
      errors.customer_id = 'Customer is required';
    }

    if (!this.isRequired(preadmissionData.items) || !Array.isArray(preadmissionData.items) || preadmissionData.items.length === 0) {
      errors.items = 'At least one item is required';
    }

    // Container validation - FTZ container tracking
    if (preadmissionData.container_number && !this.isValidContainerNumber(preadmissionData.container_number)) {
      errors.container_number = 'Invalid container number format';
    }

    if (preadmissionData.bol && !this.isValidBOLNumber(preadmissionData.bol)) {
      errors.bol = 'Invalid Bill of Lading number';
    }

    if (preadmissionData.arrival_date && !this.isValidDate(preadmissionData.arrival_date)) {
      errors.arrival_date = 'Invalid arrival date';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Generic form validation
  validateForm(data, rules) {
    const errors = {};

    Object.keys(rules).forEach(field => {
      const rule = rules[field];
      const value = data[field];

      if (rule.required && !this.isRequired(value)) {
        errors[field] = rule.requiredMessage || `${field} is required`;
        return;
      }

      if (value && rule.minLength && !this.isValidLength(value, rule.minLength)) {
        errors[field] = rule.lengthMessage || `${field} must be at least ${rule.minLength} characters`;
        return;
      }

      if (value && rule.maxLength && !this.isValidLength(value, 0, rule.maxLength)) {
        errors[field] = rule.lengthMessage || `${field} must be no more than ${rule.maxLength} characters`;
        return;
      }

      if (value && rule.email && !this.isValidEmail(value)) {
        errors[field] = rule.emailMessage || 'Please enter a valid email address';
        return;
      }

      if (value && rule.number && !this.isValidNumber(value, rule.min, rule.max)) {
        errors[field] = rule.numberMessage || 'Please enter a valid number';
        return;
      }

      if (rule.custom && !rule.custom(value)) {
        errors[field] = rule.customMessage || `${field} is invalid`;
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

// Export as CommonJS module for Node.js backend
module.exports = new ValidationUtils();
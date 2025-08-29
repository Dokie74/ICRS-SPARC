// TypeScript-style interfaces and types for ICRS SPARC frontend
// Provides type definitions for all major entities and API responses

/**
 * @typedef {Object} BaseEntity
 * @property {string} id - Unique identifier
 * @property {string} created_at - ISO timestamp when created
 * @property {string} updated_at - ISO timestamp when last updated
 * @property {string} created_by - User ID who created the record
 * @property {string} updated_by - User ID who last updated the record
 * @property {boolean} active - Whether the record is active
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Whether the operation was successful
 * @property {any} [data] - Response data (present on success)
 * @property {string} [error] - Error message (present on failure)
 * @property {number} [count] - Total count for paginated responses
 * @property {string} [timestamp] - Response timestamp
 * @property {string} [traceId] - Request tracing ID
 */

/**
 * @typedef {Object} PaginatedResponse
 * @property {boolean} success
 * @property {Array} data - Array of items
 * @property {number} count - Total number of items
 * @property {number} [limit] - Items per page
 * @property {number} [offset] - Items skipped
 * @property {boolean} [hasMore] - Whether there are more items
 */

/**
 * @typedef {Object} ValidationError
 * @property {string} field - Field name that failed validation
 * @property {string} message - Validation error message
 */

/**
 * @typedef {Object} ServiceOptions
 * @property {string} [userId] - Current user ID
 * @property {Array} [filters] - Array of filter objects
 * @property {Object} [orderBy] - Sorting configuration
 * @property {number} [limit] - Maximum number of results
 * @property {number} [offset] - Number of results to skip
 * @property {string} [select] - Fields to select
 * @property {boolean} [single] - Return single result
 */

// Authentication Types
/**
 * @typedef {Object} User
 * @property {string} id - User UUID
 * @property {string} email - User email address
 * @property {string} [phone] - Phone number
 * @property {string} created_at - Account creation timestamp
 * @property {string} updated_at - Last update timestamp
 * @property {Object} [user_metadata] - Additional user data
 * @property {Object} [app_metadata] - App-specific metadata
 */

/**
 * @typedef {Object} Session
 * @property {string} access_token - JWT access token
 * @property {string} refresh_token - JWT refresh token
 * @property {number} expires_in - Token expiration time in seconds
 * @property {string} token_type - Token type (usually 'bearer')
 * @property {User} user - User information
 */

/**
 * @typedef {Object} EmployeeProfile
 * @property {string} id - Employee UUID
 * @property {string} user_id - Associated user ID
 * @property {string} employee_number - Unique employee number
 * @property {string} first_name - First name
 * @property {string} last_name - Last name
 * @property {string} email - Email address
 * @property {('admin'|'manager'|'warehouse_staff'|'viewer')} role - Employee role
 * @property {boolean} active - Whether employee is active
 * @property {string} created_at - Profile creation timestamp
 * @property {string} updated_at - Last update timestamp
 */

/**
 * @typedef {Object} Permission
 * @property {string} id - Permission UUID
 * @property {string} user_id - User ID
 * @property {string} page_name - Page or resource name
 * @property {('read'|'write'|'admin')} permission_level - Permission level
 * @property {boolean} is_active - Whether permission is active
 */

// Core Business Types
/**
 * @typedef {Object} Customer
 * @property {string} id - Customer UUID
 * @property {string} name - Customer company name
 * @property {string} code - Unique customer code
 * @property {Object} address - Address information
 * @property {string} address.street - Street address
 * @property {string} address.city - City
 * @property {string} address.state - State/province
 * @property {string} address.zip - Postal code
 * @property {string} address.country - Country code
 * @property {Object} contact_info - Contact information
 * @property {string} contact_info.primary_contact - Primary contact name
 * @property {string} contact_info.phone - Phone number
 * @property {string} contact_info.email - Contact email
 * @property {string} [bond_number] - Customs bond number
 * @property {string} [ftz_operator_id] - FTZ operator identification
 * @property {boolean} active - Whether customer is active
 */

/**
 * @typedef {Object} Part
 * @property {string} id - Part UUID
 * @property {string} description - Part description
 * @property {string} [part_number] - Manufacturer part number
 * @property {string} [material] - Material composition
 * @property {string} [hts_code] - Harmonized Tariff Schedule code
 * @property {string} [unit_of_measure] - Unit of measurement
 * @property {string} [country_of_origin] - Country of origin code
 * @property {number} [standard_value] - Standard declared value
 * @property {boolean} active - Whether part is active
 */

/**
 * @typedef {Object} StorageLocation
 * @property {string} id - Location UUID
 * @property {string} location_code - Unique location code
 * @property {string} [description] - Location description
 * @property {string} [zone] - Storage zone
 * @property {string} [aisle] - Aisle identifier
 * @property {string} [rack] - Rack identifier
 * @property {string} [shelf] - Shelf identifier
 * @property {boolean} active - Whether location is active
 */

/**
 * @typedef {Object} InventoryLot
 * @property {string} id - Lot ID (custom format, not UUID)
 * @property {string} part_id - Part UUID reference
 * @property {string} customer_id - Customer UUID reference
 * @property {string} [storage_location_id] - Storage location UUID reference
 * @property {('In Stock'|'Depleted'|'On Hold'|'Reserved'|'Voided')} status - Lot status
 * @property {number} original_quantity - Original quantity received
 * @property {number} current_quantity - Current available quantity
 * @property {string} [admission_date] - Date admitted to FTZ
 * @property {string} [manifest_number] - Import manifest number
 * @property {string} [e214_admission_number] - CBP Form 214 admission number
 * @property {string} [conveyance_name] - Name of importing conveyance
 * @property {string} [import_date] - Date of import
 * @property {string} [port_of_unlading] - Port where goods were unladed
 * @property {string} [bill_of_lading] - Bill of lading number
 * @property {number} [total_value] - Total declared value
 * @property {number} [total_charges] - Total charges and fees
 * @property {boolean} voided - Whether lot has been voided
 * @property {boolean} active - Whether lot is active
 */

/**
 * @typedef {Object} EnhancedInventoryLot
 * @property {InventoryLot} lot - Base lot information
 * @property {Part} part - Associated part details
 * @property {Customer} customer - Associated customer details
 * @property {StorageLocation} [location] - Storage location details
 * @property {Array<Transaction>} [transactions] - Transaction history
 * @property {number} [days_in_ftz] - Number of days in FTZ
 * @property {Object} [metrics] - Calculated metrics
 */

/**
 * @typedef {Object} Transaction
 * @property {string} id - Transaction UUID
 * @property {string} lot_id - Associated lot ID
 * @property {('Admission'|'Shipment'|'Adjustment'|'Removal'|'Transfer')} type - Transaction type
 * @property {number} quantity - Quantity changed (positive for receipts, negative for shipments)
 * @property {string} [source_document_number] - Source document reference
 * @property {Object} [reference_data] - Additional transaction data
 * @property {string} created_at - Transaction timestamp
 * @property {string} created_by - User who created transaction
 */

/**
 * @typedef {Object} Preadmission
 * @property {string} id - Preadmission UUID
 * @property {string} customer_id - Customer UUID reference
 * @property {string} part_id - Part UUID reference
 * @property {('Pending'|'Approved'|'Processing'|'Processed'|'Cancelled')} status - Status
 * @property {number} quantity - Quantity to admit
 * @property {string} [estimated_admission_date] - Expected admission date
 * @property {string} [manifest_number] - Import manifest number
 * @property {string} [conveyance_name] - Conveyance name
 * @property {string} [import_date] - Import date
 * @property {string} [port_of_unlading] - Port of unlading
 * @property {string} [bill_of_lading] - Bill of lading
 * @property {number} [total_value] - Total value
 * @property {string} [notes] - Additional notes
 * @property {string} [processed_to_lot_id] - Resulting lot ID after processing
 */

/**
 * @typedef {Object} EnhancedPreadmission
 * @property {Preadmission} preadmission - Base preadmission data
 * @property {Part} part - Associated part details
 * @property {Customer} customer - Associated customer details
 * @property {InventoryLot} [resulting_lot] - Created lot if processed
 */

/**
 * @typedef {Object} Preshipment
 * @property {string} id - Preshipment UUID
 * @property {string} customer_id - Customer UUID reference
 * @property {('Pending'|'Approved'|'Processing'|'Processed'|'Shipped'|'Cancelled')} status - Status
 * @property {string} [shipment_date] - Planned shipment date
 * @property {Object} [destination] - Shipping destination
 * @property {number} [total_value] - Total shipment value
 * @property {string} [notes] - Additional notes
 */

/**
 * @typedef {Object} PreshipmentItem
 * @property {string} id - Item UUID
 * @property {string} preshipment_id - Parent preshipment UUID
 * @property {string} lot_id - Lot ID being shipped
 * @property {number} quantity - Quantity to ship
 * @property {number} [unit_value] - Value per unit
 */

/**
 * @typedef {Object} EnhancedPreshipment
 * @property {Preshipment} preshipment - Base preshipment data
 * @property {Customer} customer - Customer details
 * @property {Array<PreshipmentItem>} items - Line items
 * @property {Array<InventoryLot>} lots - Associated lots
 */

/**
 * @typedef {Object} EntrySummary
 * @property {string} id - Entry summary UUID
 * @property {string} customer_id - Customer UUID reference
 * @property {string} [entry_number] - CBP entry number
 * @property {string} [entry_date] - Entry date
 * @property {('Draft'|'Submitted'|'Accepted'|'Liquidated'|'Cancelled')} status - Status
 * @property {number} [total_value] - Total entry value
 * @property {number} [total_duty] - Total duty owed
 * @property {number} [total_taxes] - Total taxes owed
 * @property {Object} [cbp_form_data] - CBP form data
 * @property {Object} [ace_submission_data] - ACE submission data
 */

/**
 * @typedef {Object} EntrySummaryItem
 * @property {string} id - Item UUID
 * @property {string} entry_summary_id - Parent entry summary UUID
 * @property {string} lot_id - Associated lot ID
 * @property {string} hts_code - HTS classification
 * @property {number} quantity - Quantity entered
 * @property {string} [unit_of_measure] - Unit of measure
 * @property {number} [unit_value] - Value per unit
 * @property {number} [total_value] - Total line value
 * @property {number} [duty_rate] - Applicable duty rate
 * @property {number} [duty_amount] - Calculated duty amount
 */

/**
 * @typedef {Object} EnhancedEntrySummary
 * @property {EntrySummary} entry_summary - Base entry summary data
 * @property {Customer} customer - Customer details
 * @property {Array<EntrySummaryItem>} items - Line items
 * @property {Array<InventoryLot>} lots - Associated lots
 */

// Dashboard and Analytics Types
/**
 * @typedef {Object} DashboardMetrics
 * @property {Object} inventory - Inventory metrics
 * @property {number} inventory.total_lots - Total number of lots
 * @property {number} inventory.active_lots - Active lots
 * @property {number} inventory.total_quantity - Total quantity in FTZ
 * @property {number} inventory.total_value - Total value in FTZ
 * @property {number} inventory.customers_with_inventory - Customers with active inventory
 * @property {Object} operational - Operational metrics
 * @property {number} operational.pending_preadmissions - Pending preadmissions
 * @property {number} operational.pending_preshipments - Pending preshipments
 * @property {number} operational.this_month_admissions - Admissions this month
 * @property {number} operational.this_month_shipments - Shipments this month
 * @property {Object} compliance - Compliance metrics
 * @property {number} compliance.overdue_entries - Overdue entry summaries
 * @property {number} compliance.aging_inventory - Lots over 5 years old
 * @property {string} timestamp - Metrics timestamp
 */

/**
 * @typedef {Object} InventoryMetrics
 * @property {Object} by_status - Counts by status
 * @property {Object} by_customer - Top customers by quantity
 * @property {Object} by_part - Top parts by quantity
 * @property {Object} aging - Inventory aging analysis
 * @property {Object} value_distribution - Value analysis
 */

/**
 * @typedef {Object} ReportFilters
 * @property {string} [start_date] - Filter start date
 * @property {string} [end_date] - Filter end date
 * @property {Array<string>} [customers] - Customer IDs to include
 * @property {Array<string>} [parts] - Part IDs to include
 * @property {Array<string>} [statuses] - Statuses to include
 * @property {string} [format] - Output format ('pdf', 'excel', 'csv')
 */

// UI State Types
/**
 * @typedef {Object} Notification
 * @property {string} id - Notification ID
 * @property {('success'|'error'|'warning'|'info'|'loading')} type - Type
 * @property {string} message - Notification message
 * @property {string} [title] - Optional title
 * @property {number} [duration] - Auto-dismiss duration (ms)
 * @property {boolean} [persistent] - Whether notification persists
 * @property {Object} [action] - Optional action button
 * @property {number} timestamp - Creation timestamp
 */

/**
 * @typedef {Object} Breadcrumb
 * @property {string} label - Display label
 * @property {string} [href] - Link URL
 * @property {boolean} [current] - Whether this is the current page
 */

/**
 * @typedef {Object} FilterState
 * @property {string} [search] - Search term
 * @property {Array<string>} [customers] - Selected customer IDs
 * @property {Array<string>} [parts] - Selected part IDs
 * @property {Array<string>} [statuses] - Selected statuses
 * @property {string} [date_from] - Date range start
 * @property {string} [date_to] - Date range end
 * @property {string} [sort_field] - Sort field
 * @property {('asc'|'desc')} [sort_direction] - Sort direction
 */

// Form Types
/**
 * @typedef {Object} CreateLotRequest
 * @property {string} part_id - Part UUID
 * @property {string} customer_id - Customer UUID
 * @property {string} [storage_location_id] - Storage location UUID
 * @property {string} [status] - Initial status
 * @property {number} original_quantity - Quantity received
 * @property {string} [admission_date] - Admission date
 * @property {string} [manifest_number] - Manifest number
 * @property {string} [conveyance_name] - Conveyance name
 * @property {string} [import_date] - Import date
 * @property {string} [port_of_unlading] - Port of unlading
 * @property {string} [bill_of_lading] - Bill of lading
 * @property {number} [total_value] - Total value
 * @property {number} [total_charges] - Total charges
 */

/**
 * @typedef {Object} UpdateLotRequest
 * @property {string} [status] - New status
 * @property {string} [storage_location_id] - New location
 * @property {number} [total_value] - Updated value
 * @property {number} [total_charges] - Updated charges
 */

/**
 * @typedef {Object} CreatePreadmissionRequest
 * @property {string} customer_id - Customer UUID
 * @property {string} part_id - Part UUID
 * @property {number} quantity - Quantity to admit
 * @property {string} [estimated_admission_date] - Expected date
 * @property {string} [manifest_number] - Manifest number
 * @property {string} [conveyance_name] - Conveyance name
 * @property {string} [import_date] - Import date
 * @property {string} [port_of_unlading] - Port of unlading
 * @property {string} [bill_of_lading] - Bill of lading
 * @property {number} [total_value] - Total value
 * @property {string} [notes] - Additional notes
 */

/**
 * @typedef {Object} CreateCustomerRequest
 * @property {string} name - Company name
 * @property {string} code - Customer code
 * @property {Object} address - Address information
 * @property {Object} contact_info - Contact information
 * @property {string} [bond_number] - Bond number
 * @property {string} [ftz_operator_id] - FTZ operator ID
 */

/**
 * @typedef {Object} CreatePartRequest
 * @property {string} description - Part description
 * @property {string} [part_number] - Part number
 * @property {string} [material] - Material
 * @property {string} [hts_code] - HTS code
 * @property {string} [unit_of_measure] - Unit of measure
 * @property {string} [country_of_origin] - Country code
 * @property {number} [standard_value] - Standard value
 */

// Error Types
/**
 * @typedef {Object} AppError
 * @property {string} message - Error message
 * @property {string} [code] - Error code
 * @property {('validation'|'business_logic'|'database'|'external_service'|'authentication'|'authorization'|'system')} category - Error category
 * @property {('low'|'medium'|'high'|'critical')} severity - Error severity
 * @property {Object} [context] - Additional error context
 * @property {string} [stack] - Stack trace
 * @property {string} timestamp - Error timestamp
 * @property {string} [service] - Service that generated error
 * @property {string} [method] - Method that generated error
 */

// Real-time Types
/**
 * @typedef {Object} RealtimeEvent
 * @property {string} event - Event name
 * @property {Object} payload - Event data
 * @property {string} timestamp - Event timestamp
 * @property {string} [user_id] - User who triggered event
 */

/**
 * @typedef {Object} RealtimeSubscription
 * @property {string} event - Event name
 * @property {Function} callback - Event handler
 * @property {Object} [options] - Subscription options
 */

export default {};

// Export types for JSDoc usage
export const Types = {
  // This object exists only for JSDoc reference
  // Actual type checking would be done with TypeScript or PropTypes
};
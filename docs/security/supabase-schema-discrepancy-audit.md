# Supabase Schema Discrepancy Audit

**Generated:** 2025-01-10  
**Scope:** Complete ICRS SPARC application codebase vs initial_schema.sql  
**Schema Source:** `/supabase/schemas/initial_schema.sql`

## Executive Summary

This audit identified **8 critical discrepancies** between the application code and the database schema that will cause runtime errors. The most common issue is services referencing non-existent tables, followed by missing RPC functions.

## Schema Overview

### Database Tables (31 total)
- approval_requests, approval_workflow_log, contacts, customers, employees
- entry_grand_totals, entry_group_preshipments, entry_summaries, entry_summary_groups, entry_summary_line_items
- foreign_ports, ftz_status_records, inventory_lots, login_attempts, material_indices, materials
- part_pricing_history, part_suppliers, parts, permission_audit_log, permission_inheritance
- permission_modules, permission_templates, preadmissions, preshipments, pricing_adjustments
- status_history, storage_locations, suppliers, system_pages, transactions, us_ports
- user_page_permissions, user_permissions

### Database Views (4 total)
- entry_summary_groups_with_stats
- module_permission_matrix  
- permission_audit_summary
- user_permission_summary

### RPC Functions (36 total)
- apply_role_template_permissions, audit_permission_changes, bulk_update_user_permissions
- can_manage_user_permissions, check_user_permission, create_employee, create_missing_auth_users
- deactivate_employee, ensure_single_primary_contact, ensure_single_primary_variant
- generate_reconciliation, get_all_employees, get_current_employee, get_employee_profile
- get_managers_list, get_user_accessible_pages, get_user_module_permissions, is_account_locked
- link_employee_to_auth_user, log_approval_workflow, reset_user_password, sync_employee_status
- track_login_attempt, update_employee (2 versions), update_entry_summary_groups_updated_at
- update_last_login, update_material_indices_updated_at, update_materials_updated_at
- update_parts_price_timestamp, update_permission_timestamps, update_permission_updated_at
- update_preshipment_grouping_status, update_pricing_adjustments_updated_at
- update_storage_locations_updated_at, update_updated_at_column, update_variant_timestamp
- user_action_requires_approval, user_has_module_permission, user_has_page_access
- validate_module_action, validate_permission_action, validate_preshipment_for_grouping

## Critical Discrepancies Found

### 1. MISSING_TABLE: UserService References Non-Existent 'users' Table
**File Path:** `src/backend/services/auth/UserService.js`  
**Line Number:** 11  
**Mismatch Type:** MISSING_TABLE  
**Code Snippet:** `super('users');`  
**Description:** The UserService extends BaseService with table name 'users', but this table does not exist in the schema. The correct table is 'employees'.

### 2. MISSING_TABLE: HTSService References Non-Existent 'hts_data' Table
**File Path:** `src/backend/services/reference/HTSService.js`  
**Line Number:** 13  
**Mismatch Type:** MISSING_TABLE  
**Code Snippet:** `super('hts_data');`  
**Description:** The HTSService extends BaseService with table name 'hts_data', but this table does not exist in the schema.

### 3. MISSING_TABLE: DashboardService References Non-Existent 'dashboard_metrics' Table
**File Path:** `src/backend/services/analytics/DashboardService.js`  
**Line Number:** 10  
**Mismatch Type:** MISSING_TABLE  
**Code Snippet:** `super('dashboard_metrics');`  
**Description:** The DashboardService extends BaseService with table name 'dashboard_metrics', but this table does not exist in the schema.

### 4. MISSING_TABLE: PermissionService References Non-Existent 'permissions' Table
**File Path:** `src/backend/services/auth/PermissionService.js`  
**Line Number:** 25  
**Mismatch Type:** MISSING_TABLE  
**Code Snippet:** `super('permissions');`  
**Description:** The PermissionService extends BaseService with table name 'permissions', but this table does not exist in the schema. The correct tables for permissions are 'user_permissions', 'permission_modules', 'permission_templates', etc.

### 5. MISSING_RPC: get_distinct_materials Function Does Not Exist
**File Path:** `src/backend/api/routes/parts.js`  
**Line Number:** 268  
**Mismatch Type:** MISSING_RPC_FUNCTION  
**Code Snippet:** `const result = await supabaseClient.callFunction('get_distinct_materials', {}, {});`  
**Description:** The code attempts to call RPC function 'get_distinct_materials' but this function does not exist in the schema.

### 6. MISSING_RPC: get_low_inventory_alerts Function Does Not Exist
**File Path:** `src/backend/api/routes/dashboard.js`  
**Line Number:** 229  
**Mismatch Type:** MISSING_RPC_FUNCTION  
**Code Snippet:** `const lowInventoryResult = await supabaseClient.callFunction('get_low_inventory_alerts', { threshold: 10 }, {});`  
**Description:** The code attempts to call RPC function 'get_low_inventory_alerts' but this function does not exist in the schema.

### 7. MISSING_RPC: execute_sql Function Does Not Exist
**File Path:** `src/backend/api/routes/preadmission.js`  
**Line Number:** 306  
**Mismatch Type:** MISSING_RPC_FUNCTION  
**Code Snippet:** `await supabaseClient.callFunction('execute_sql', { query: deleteLineItemsQuery, params: [id] }, {});`  
**Description:** The code attempts to call RPC function 'execute_sql' but this function does not exist in the schema.

### 8. MISSING_TABLE: ShippingService References Non-Existent 'shipping_labels' Table
**File Path:** `src/backend/services/business/ShippingService.js`  
**Line Number:** 344  
**Mismatch Type:** MISSING_TABLE  
**Code Snippet:** `const labelResult = await DatabaseService.insert('shipping_labels', [labelInfo], options);`  
**Description:** The ShippingService attempts to insert into a 'shipping_labels' table that does not exist in the schema.

## Potential Field Mapping Issues

### camelCase vs snake_case Inconsistencies

**High Priority:**
- **preadmissions table**: Uses camelCase fields (`customerId`, `admissionId`, `entryNumber`) while most other tables use snake_case
- **preshipments table**: Uses camelCase fields (`shipmentId`, `customerId`, `entryNumber`) while most other tables use snake_case

These field naming inconsistencies could lead to:
- Frontend query failures when expecting snake_case
- API endpoint parameter mapping errors
- Service layer data transformation issues

## Verification of Existing Code Patterns

### Correctly Referenced Tables
✅ The following services correctly reference existing tables:
- CustomerService → 'customers' table
- PartService → 'parts' table  
- PreshipmentService → 'preshipments' table
- PreadmissionService → 'preadmissions' table
- ShippingService → 'preshipments' table
- ReceivingService → 'preadmissions' table
- EntrySummaryService → 'entry_summaries' table
- InventoryService → 'inventory_lots' table
- MaterialIndexService → 'material_indices' table

### Correctly Referenced RPC Functions
✅ The following RPC functions are correctly called:
- check_user_permission (called from AuthService)

## Summary Statistics

| Mismatch Type | Count | Severity |
|---------------|-------|----------|
| MISSING_TABLE | 5 | Critical |
| MISSING_RPC_FUNCTION | 3 | Critical |
| FIELD_NAMING_INCONSISTENCY | 2+ | Medium |
| **Total Critical Issues** | **8** | **Critical** |

## Recommended Actions

### Immediate (Critical Issues)
1. **Fix UserService**: Change table reference from 'users' to 'employees'
2. **Fix HTSService**: Create 'hts_data' table or change service to use existing table
3. **Fix DashboardService**: Create 'dashboard_metrics' table or refactor service logic  
4. **Fix PermissionService**: Change table reference to existing permission tables
5. **Fix ShippingService**: Create 'shipping_labels' table or refactor shipping label logic
6. **Implement Missing RPC Functions**: Create the three missing RPC functions or refactor calls

### Medium Priority (Field Mapping)
1. **Standardize Field Naming**: Decide on camelCase vs snake_case convention
2. **Update Frontend Queries**: Ensure all frontend code matches actual database field names
3. **Add Field Mapping Layer**: Consider adding automatic field name conversion

## Risk Assessment

**HIGH RISK**: The 8 critical discrepancies will cause immediate runtime failures when the affected code paths are executed. These must be resolved before production deployment.

**MEDIUM RISK**: Field naming inconsistencies may cause sporadic failures depending on frontend implementation and API usage patterns.

## Verification Recommendations

1. **Database Integration Tests**: Create tests that verify all service table references
2. **RPC Function Tests**: Add tests for all RPC function calls
3. **Schema Validation**: Implement automated schema validation in CI/CD pipeline
4. **Field Name Auditing**: Add automated checks for consistent field naming patterns

---
*This audit was generated using Claude Code's schema analysis tools. For questions or clarifications, refer to the implementation team.*
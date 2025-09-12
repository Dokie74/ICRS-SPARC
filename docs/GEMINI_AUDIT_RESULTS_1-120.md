
# Gemini Code Audit Results (Files 1-120)

## Summary

A total of 120 out of 242 files have been reviewed. The audit has revealed several discrepancies between the code and the provided JSON schema. The most common issues are:

*   **Missing Tables:** The code references tables that are not defined in the schema, such as `inventory`, `locations`, `inventory_transactions`, and `preadmission_items`.
*   **Invalid Columns:** The code often refers to columns that do not exist in the database tables. Common examples include `active`, `status`, `current_quantity`, and `lot_number`.
*   **Unknown RPC Functions:** The code calls several RPC functions that are not defined in the schema, such as `get_table_list` and `exec_sql`.
*   **Incorrect Method Calls:** The code uses methods that are not available in the `api-client` service, such as `createLot`, `updateLot`, and `deleteLot`.

## Discrepancies Found

| File Path | Line Number | Mismatch Type | Code Snippet | Description |
| :--- | :--- | :--- | :--- | :--- |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\_handlers\dashboard.js` | 28 | INVALID_COLUMN | `totalInventoryValue = inventory.reduce((sum, lot) => sum + (parseFloat(lot.estimated_value ...` | The column 'estimated_value' does not exist in the table 'inventory_lots'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\_handlers\dashboard.js` | 38 | INVALID_COLUMN | `p.status === 'completed' && p.updated_at && p.updated_at.startsWith(today)` | The column 'updated_at' does not exist in the table 'preadmissions'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\_handlers\health.js` | 26 | INVALID_COLUMN | `await supabase.from('customers').select('count(*)', { count: 'exact', head: true });` | The column 'count(*)' does not exist in the table 'customers'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\_handlers\inventory.js` | 16 | INVALID_COLUMN | `select: 'id, lot_number, part_number, part_description, quantity, estimated_value, status, location_id, created_at'` | The columns 'lot_number', 'part_number', 'part_description', 'estimated_value', and 'location_id' do not exist in the table 'inventory_lots'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\_handlers\suppliers.js` | 16 | INVALID_COLUMN | `select: 'id, supplier_code, name, contact_person, email, phone, country, created_at, updated_at'` | The columns 'supplier_code' and 'email' do not exist in the table 'suppliers'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\controllers\EnhancedInventoryController.js` | 413 | INVALID_COLUMN | `const allowedColumns = ['status', 'customer_id', 'part_id', 'active', 'voided'];` | The columns 'active' and 'voided' do not exist in the table 'inventory_lots'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\admin.js` | 301 | INVALID_COLUMN | `const { phone, type, country, address } = req.body;` | The column 'type' does not exist in the table 'suppliers'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\admin.js` | 329 | INVALID_COLUMN | `const { phone, type, country, address, status } = req.body;` | The columns 'type' and 'status' do not exist in the table 'suppliers'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\admin.js` | 401 | INVALID_COLUMN | `filters.push({ column: 'type', value: type });` | The column 'type' does not exist in the table 'storage_locations'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\auth.js` | 250 | INVALID_COLUMN | `if (active !== undefined) { options.filters = []; }` | The column 'active' does not exist in the table 'employees'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\customers.js` | 140 | INVALID_COLUMN | `const { name, code, contact_person, email, phone, address, city, state, postal_code, country, tax_id, customs_broker, notes } = req.body;` | The columns 'code', 'contact_person', 'city', 'state', 'postal_code', 'country', 'tax_id', and 'customs_broker' do not exist in the table 'customers'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\customers.js` | 170 | INVALID_COLUMN | `filters: [{ column: 'code', value: updateData.code }, { column: 'id', value: id, operator: 'neq' }]` | The column 'code' does not exist in the table 'customers'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\dashboard.js` | 258 | INVALID_COLUMN | `filters: [{ column: 'expiration_date', value: expiringDate.toISOString(), operator: 'lte' }]` | The column 'expiration_date' does not exist in the table 'inventory_lots'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\inventory.js` | 108 | INVALID_COLUMN | `const lotData = { ... unit_of_measure, expiration_date, ... };` | The columns 'unit_of_measure' and 'expiration_date' do not exist in the table 'inventory_lots'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\inventory.js` | 168 | INVALID_COLUMN | `const transactionData = { ... reference_number, ... };` | The column 'reference_number' does not exist in the table 'transactions'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\inventory.js` | 200 | INVALID_COLUMN | `if (transaction_type) filters.push({ column: 'type', value: transaction_type });` | The column 'transaction_type' does not exist in the table 'transactions'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\locations.js` | 100 | INVALID_COLUMN | `const result = await supabaseClient.update('storage_locations', id, { active: false, ... });` | The column 'active' does not exist in the table 'storage_locations'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\parts.js` | 91 | INVALID_COLUMN | `select: '*, inventory_lots:part_id(id, current_quantity), part_variants:part_id(id, variant_name, variant_value)'` | The column 'current_quantity' does not exist in the table 'inventory_lots'. The table 'part_variants' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\preadmission.js` | 301 | INVALID_COLUMN | `updateData.status_notes = notes; ... updateData.release_date = new Date().toISOString();` | The columns 'status_notes' and 'release_date' do not exist in the table 'preadmissions'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\preshipments.js` | 130 | MISSING_TABLE | `const inventoryQuery = await supabaseClient.getAll('inventory', ...);` | The table 'inventory' does not exist in the database. It should be 'inventory_lots'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\shipping.js` | 251 | MISSING_TABLE | `const labelResult = await DatabaseService.insert('shipping_labels', [labelInfo], options);` | The table 'shipping_labels' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\shipping.js` | 361 | INVALID_COLUMN | `const newQuantity = Math.max(0, lot.current_quantity - item.quantity); ... last_shipped_at: new Date().toISOString()` | The columns 'current_quantity' and 'last_shipped_at' do not exist in the table 'inventory_lots'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\shipping.js` | 153 | INVALID_COLUMN | `signed_off_by: options.userId || null` | The column 'signed_off_by' does not exist in the table 'preshipments'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\shipping.js` | 421 | MISSING_TABLE | `await DatabaseService.insert('preshipment_audit', [auditRecord], options);` | The table 'preshipment_audit' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\shipping.js` | 439 | MISSING_TABLE | `await DatabaseService.insert('shipment_completions', [completionRecord], options);` | The table 'shipment_completions' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\analytics\DashboardService.js` | 171 | INVALID_COLUMN | `select: 'id, "admission_id", status, container, arrival_date, estimated_value, customer_id, ...'` | The columns 'container' and 'estimated_value' do not exist in the table 'preadmissions'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\analytics\DashboardService.js` | 209 | INVALID_COLUMN | `select: 'id, "shipment_id", status, ship_date, estimated_value, customer_id, created_at, ...'` | The columns 'ship_date' and 'estimated_value' do not exist in the table 'preshipments'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\analytics\DashboardService.js` | 244 | INVALID_COLUMN | `select: 'id, current_quantity, status, parts (description)'` | The column 'current_quantity' does not exist in the table 'inventory_lots'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\analytics\DashboardService.js` | 300 | INVALID_COLUMN | `select: 'current_quantity, parts!inner (material, standard_value, material_weight)'` | The columns 'current_quantity' and 'voided' do not exist in the table 'inventory_lots'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\analytics\DashboardService.js` | 350 | INVALID_COLUMN | `select: 'id, transaction_date, quantity, transaction_type, lot_id, ...'` | The columns 'transaction_date' and 'transaction_type' do not exist in the table 'transactions'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\auth\AuthService.js` | 411 | INVALID_COLUMN | `const result = await supabaseClient.update('employees', userId, { active: false }, options);` | The column 'active' does not exist in the table 'employees'. It should be 'is_active'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\auth\PermissionService.js` | 108 | INVALID_COLUMN | `const { data, error } = await DatabaseService.update('user_permissions', { granted: false, updated_at: ... });` | The column 'updated_at' does not exist in the table 'user_permissions'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\BaseService.js` | 81 | INVALID_COLUMN | `const updateData = { active: false, updated_at: new Date().toISOString() };` | The column 'active' does not exist in the table 'customers'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\business\EntrySummaryService.js` | 201 | MISSING_TABLE | `const lineItemsResult = await this.createLineItemsFromPreshipment(...)` | The table 'entry_line_items' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\business\EntrySummaryService.js` | 258 | MISSING_TABLE | `const pgaResult = await DatabaseService.getAll('pga_data', ...)` | The table 'pga_data' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\business\PreadmissionService.js` | 446 | MISSING_TABLE | `const locationResult = await DatabaseService.insert('inventory_locations', ...)` | The table 'inventory_locations' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\business\PreadmissionService.js` | 459 | INVALID_COLUMN | `const transactionResult = await DatabaseService.insert('transactions', ...)` | The columns 'quantity_change' and 'source_document_number' do not exist in the table 'transactions'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\business\PreadmissionService.js` | 653 | MISSING_TABLE | `const complianceResult = await DatabaseService.insert('ftz_compliance', ...)` | The table 'ftz_compliance' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\business\PreadmissionService.js` | 758 | MISSING_TABLE | `const result = await DatabaseService.insert('preadmission_items', ...)` | The table 'preadmission_items' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\business\PreadmissionService.js` | 773 | MISSING_TABLE | `const deleteResult = await DatabaseService.delete('preadmission_items', ...)` | The table 'preadmission_items' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\business\PreadmissionService.js` | 792 | MISSING_TABLE | `const itemsResult = await DatabaseService.getAll('preadmission_items', ...)` | The table 'preadmission_items' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\business\PreadmissionService.js` | 882 | MISSING_TABLE | `const result = await DatabaseService.getAll('audit_photos', ...)` | The table 'audit_photos' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\business\ReceivingService.js` | 218 | MISSING_TABLE | `const photoResult = await DatabaseService.insert('audit_photos', ...)` | The table 'audit_photos' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\business\ReceivingService.js` | 261 | INVALID_COLUMN | `manifest_number: preadmission.bill_of_lading, conveyance_name: preadmission.vessel_name, ...` | The column 'bill_of_lading' does not exist in the table 'inventory_lots'. The column 'vessel_name' does not exist in the table 'preadmissions'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\business\ReceivingService.js` | 280 | MISSING_TABLE | `locationRecords.push({ lot_id: lotNumber, location_name: location, ... })` | The table 'inventory_locations' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\business\ReceivingService.js` | 365 | MISSING_TABLE | `const complianceResult = await DatabaseService.insert('ftz_compliance', ...)` | The table 'ftz_compliance' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\business\ReceivingService.js` | 521 | MISSING_TABLE | `const result = await DatabaseService.getAll('audit_photos', ...)` | The table 'audit_photos' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\core\CustomerService.js` | 101 | REQUIRES_MANUAL_REVIEW | `const result = await DatabaseService.delete('customers', customerId, options);` | The `delete` operation is not a soft delete. It will permanently delete the record. The table `customers` does not have an `active` or `status` column to perform a soft delete. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\core\CustomerService.js` | 148 | UNKNOWN_RPC_FUNCTION | `const result = await DatabaseService.rpc('get_customer_activity', ...)` | The RPC function 'get_customer_activity' does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\core\CustomerService.js` | 168 | INVALID_COLUMN | `filters: [{ column: 'customer_id', value: customerId }, { column: 'current_quantity', operator: 'gt', value: 0 }]` | The column 'current_quantity' does not exist in the table 'inventory_lots'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\core\CustomerService.js` | 210 | REQUIRES_MANUAL_REVIEW | `const result = await DatabaseService.insertBatchWithDuplicateHandling('customers', ...)` | The function `insertBatchWithDuplicateHandling` does not exist in the `DatabaseService`. It should be `createBatch` or `upsertBatch`. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\core\CustomerService.js` | 229 | MISSING_TABLE | `const result = await DatabaseService.getAll('customer_contacts', ...)` | The table 'customer_contacts' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\core\CustomerService.js` | 300 | UNKNOWN_RPC_FUNCTION | `const result = await DatabaseService.rpc('unset_primary_contact', ...)` | The RPC function 'unset_primary_contact' does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\contexts\AuthContext.js` | 101 | INVALID_COLUMN | `const permissionsResponse = await apiClient.get('/api/auth/permissions');` | The endpoint `/api/auth/permissions` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\contexts\AuthContext.js` | 130 | INVALID_COLUMN | `const result = await apiClient.auth.register(userData);` | The method `register` does not exist in the `auth` service. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\contexts\AuthContext.js` | 150 | INVALID_COLUMN | `const result = await apiClient.auth.updateProfile(profileData);` | The method `updateProfile` does not exist in the `auth` service. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\hooks\useEnhancedQuery.js` | 138 | INVALID_COLUMN | `({ lotId, updates }) => apiClient.inventory.updateLot(lotId, updates)` | The method `updateLot` does not exist in the `inventory` service. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\services\api-client.js` | 228 | INVALID_COLUMN | `createLot: async (lotData) => { return this.post('/inventory/lots', lotData); }` | The method `createLot` does not exist in the `inventory` service. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\services\api-client.js` | 232 | INVALID_COLUMN | `updateLot: async (id, lotData) => { return this.put('/api/inventory/lots/${id}', lotData); }` | The method `updateLot` does not exist in the `inventory` service. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\services\api-client.js` | 236 | INVALID_COLUMN | `deleteLot: async (id) => { return this.delete('/api/inventory/lots/${id}'); }` | The method `deleteLot` does not exist in the `inventory` service. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\services\api-client.js` | 240 | INVALID_COLUMN | `getTransactions: async (params = {}) => { return this.get('/inventory/transactions', params); }` | The method `getTransactions` does not exist in the `inventory` service. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\services\api-client.js` | 244 | INVALID_COLUMN | `createTransaction: async (transactionData) => { return this.post('/inventory/transactions', transactionData); }` | The method `createTransaction` does not exist in the `inventory` service. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\services\api-client.js` | 264 | INVALID_COLUMN | `search: async (query, params = {}) => { return this.get('/parts/search', { q: query, ...params }); }` | The method `search` does not exist in the `parts` service. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\analyze-schema-expectations.js` | 140 | MISSING_TABLE | `const knownIssues = [ { table: 'inventory_transactions', ... } ];` | The table 'inventory_transactions' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\analyze-schema-expectations.js` | 142 | MISSING_TABLE | `const knownIssues = [ ... { table: 'locations', ... } ];` | The table 'locations' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\analyze-schema-expectations.js` | 143 | INVALID_COLUMN | `const knownIssues = [ ... { column: 'parts.active', ... } ];` | The column 'active' does not exist in the table 'parts'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\analyze-schema-expectations.js` | 144 | INVALID_COLUMN | `const knownIssues = [ ... { column: 'customers.active', ... } ];` | The column 'active' does not exist in the table 'customers'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\analyze-schema-expectations.js` | 146 | INVALID_COLUMN | `const knownIssues = [ ... { column: 'inventory_lots.lot_number', ... } ];` | The column 'lot_number' does not exist in the table 'inventory_lots'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\analyze-schema-expectations.js` | 147 | INVALID_COLUMN | `const knownIssues = [ ... { column: 'inventory_lots.active', ... } ];` | The column 'active' does not exist in the table 'inventory_lots'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\analyze-schema-expectations.js` | 148 | INVALID_COLUMN | `const knownIssues = [ ... { column: 'preadmissions.entry_date', ... } ];` | The column 'entry_date' does not exist in the table 'preadmissions'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\analyze-schema-expectations.js` | 149 | INVALID_COLUMN | `const knownIssues = [ ... { column: 'suppliers.company_name', ... } ];` | The column 'company_name' does not exist in the table 'suppliers'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\complete-schema-analysis.js` | 111 | MISSING_TABLE | `const wrongTableNames = [ { wrong: 'inventory_transactions', ... } ];` | The table 'inventory_transactions' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\complete-schema-analysis.js` | 113 | MISSING_TABLE | `const wrongTableNames = [ ... { wrong: 'locations', ... } ];` | The table 'locations' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\complete-schema-analysis.js` | 122 | INVALID_COLUMN | `const columnIssues = [ { table: 'parts', column: 'active', ... } ];` | The column 'active' does not exist in the table 'parts'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\complete-schema-analysis.js` | 123 | INVALID_COLUMN | `const columnIssues = [ ... { table: 'customers', column: 'active', ... } ];` | The column 'active' does not exist in the table 'customers'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\complete-schema-analysis.js` | 125 | INVALID_COLUMN | `const columnIssues = [ ... { table: 'inventory_lots', column: 'lot_number', ... } ];` | The column 'lot_number' does not exist in the table 'inventory_lots'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\complete-schema-analysis.js` | 126 | INVALID_COLUMN | `const columnIssues = [ ... { table: 'inventory_lots', column: 'active', ... } ];` | The column 'active' does not exist in the table 'inventory_lots'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\complete-schema-analysis.js` | 127 | INVALID_COLUMN | `const columnIssues = [ ... { table: 'preadmissions', column: 'entry_date', ... } ];` | The column 'entry_date' does not exist in the table 'preadmissions'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\complete-schema-analysis.js` | 128 | INVALID_COLUMN | `const columnIssues = [ ... { table: 'suppliers', column: 'company_name', ... } ];` | The column 'company_name' does not exist in the table 'suppliers'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\fixes\fix-remaining-console-errors.js` | 45 | INVALID_COLUMN | `filters: [ { column: 'expiration_date', ... } ]` | The column 'expiration_date' does not exist in the table 'inventory_lots'. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\fixes\fix-schema-mismatches.js` | 21 | MISSING_TABLE | `const SCHEMA_FIXES = { 'inventory_transactions': 'transactions', ... };` | The table 'inventory_transactions' does not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\inspect-supabase-schema.js` | 26 | UNKNOWN_RPC_FUNCTION | `const { data: tables, error: tablesError } = await supabase.rpc('get_table_list');` | The RPC function 'get_table_list' does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\inspect-supabase-schema.js` | 42 | MISSING_TABLE | `const knownTables = [ ... 'preadmission_line_items', 'inventory', 'locations', 'materials', 'inventory_transactions' ... ];` | The tables 'preadmission_line_items', 'inventory', 'locations', 'materials', and 'inventory_transactions' do not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\migrate.js` | 22 | UNKNOWN_RPC_FUNCTION | `const { error } = await supabase.rpc('exec_sql', { sql: ... });` | The RPC function 'exec_sql' does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\seed-db.js` | 130 | MISSING_TABLE | `await clearTable('inventory'); ... await clearTable('locations');` | The tables 'inventory' and 'locations' do not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\seed-db.js` | 138 | MISSING_TABLE | `await seedTable('locations', ...); await seedTable('inventory', ...);` | The tables 'locations' and 'inventory' do not exist in the database. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\examine-schema.js` | 29 | UNKNOWN_RPC_FUNCTION | `const { data, error } = await supabase.rpc('get_table_list');` | The RPC function 'get_table_list' does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\get-schema-direct.js` | 16 | UNKNOWN_RPC_FUNCTION | `const { data, error } = await supabase.rpc('exec_sql', { sql: query });` | The RPC function 'exec_sql' does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\api-client.js` | 154 | INVALID_COLUMN | `updateProfile: async (profileData) => { return this.put('/auth/me', profileData); }` | The endpoint `/auth/me` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\api-client.js` | 264 | INVALID_COLUMN | `search: async (query, params = {}) => { return this.get('/parts/search', { q: query, ...params }); }` | The endpoint `/parts/search` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\api-client.js` | 300 | INVALID_COLUMN | `updateStatus: async (id, status, notes = '') => { return this.patch(\
`/api/preadmission/${id}/status
`, { status, notes }); }` | The endpoint `/api/preadmission/:id/status` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\api-client.js` | 324 | INVALID_COLUMN | `updateStatus: async (id, status, notes = '') => { return this.patch(\
`/preshipments/${id}/status
`, { status, notes }); },` | The endpoint `/preshipments/:id/status` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\api-client.js` | 328 | INVALID_COLUMN | `generateEntryS: async (id) => { return this.post(\
`/preshipments/${id}/generate-entry-summary
`); },` | The endpoint `/preshipments/:id/generate-entry-summary` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\api-client.js` | 332 | INVALID_COLUMN | `fileWithCBP: async (id) => { return this.post(\
`/preshipments/${id}/file-cbp
`); },` | The endpoint `/preshipments/:id/file-cbp` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\api-client.js` | 336 | INVALID_COLUMN | `validateACEEntry: async (entryData) => { return this.post(\
`/preshipments/validate-ace-entry
`, entryData); },` | The endpoint `/preshipments/validate-ace-entry` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\api-client.js` | 340 | INVALID_COLUMN | `getStats: async () => { return this.get(\
`/preshipments/stats/dashboard
`); }` | The endpoint `/preshipments/stats/dashboard` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\api-client.js` | 360 | INVALID_COLUMN | `search: async (query, params = {}) => { return this.get(\
`/materials/search
`, { q: query, ...params }); }` | The endpoint `/materials/search` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\api-client.js` | 380 | INVALID_COLUMN | `search: async (query, params = {}) => { return this.get(\
`/suppliers/search
`, { q: query, ...params }); }` | The endpoint `/suppliers/search` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\api-client.js` | 400 | INVALID_COLUMN | `search: async (query, params = {}) => { return this.get(\
`/locations/search
`, { q: query, ...params }); }` | The endpoint `/locations/search` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\api-client.js` | 416 | INVALID_COLUMN | `getPerformanceMetrics: async (params = {}) => { return this.get(\
`/dashboard/performance
`, params); }` | The endpoint `/dashboard/performance` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\preshipmentService.js` | 140 | INVALID_COLUMN | `mutationFn: ({ id, status, notes }) => preshipmentService.updateStatus(id, status, notes),` | The method `updateStatus` does not exist in the `preshipmentService`. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\preshipmentService.js` | 154 | INVALID_COLUMN | `mutationFn: preshipmentService.generateEntryS,` | The method `generateEntryS` does not exist in the `preshipmentService`. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\preshipmentService.js` | 168 | INVALID_COLUMN | `mutationFn: preshipmentService.fileWithCBP,` | The method `fileWithCBP` does not exist in the `preshipmentService`. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\preshipmentService.js` | 182 | INVALID_COLUMN | `mutationFn: preshipmentService.validateACEEntry,` | The method `validateACEEntry` does not exist in the `preshipmentService`. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\receivingService.js` | 101 | INVALID_COLUMN | `const response = await apiClient.request(\
`${this.baseUrl}/${id}/dock-audit
`), { ... });` | The endpoint `/api/receiving/:id/dock-audit` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\receivingService.js` | 123 | INVALID_COLUMN | `const response = await apiClient.post(\
`${this.baseUrl}/${id}/inspection/start
`), inspectorData);` | The endpoint `/api/receiving/:id/inspection/start` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\receivingService.js` | 141 | INVALID_COLUMN | `const response = await apiClient.post(\
`${this.baseUrl}/${id}/arrival
`), { ... });` | The endpoint `/api/receiving/:id/arrival` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\receivingService.js` | 159 | INVALID_COLUMN | `const response = await apiClient.post(\
`${this.baseUrl}/${id}/ftz-validation
`), complianceData);` | The endpoint `/api/receiving/:id/ftz-validation` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\receivingService.js` | 181 | INVALID_COLUMN | `const url = 
`${this.baseUrl}/dock/schedule?${queryParams.toString()}
` : 
`${this.baseUrl}/dock/schedule`
;` | The endpoint `/api/receiving/dock/schedule` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\receivingService.js` | 203 | INVALID_COLUMN | `const response = await apiClient.post(\
`${this.baseUrl}/${id}/appointment
`), appointmentData);` | The endpoint `/api/receiving/:id/appointment` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\receivingService.js` | 229 | INVALID_COLUMN | `const url = 
`${this.baseUrl}/stats?${queryParams.toString()}
` : 
`${this.baseUrl}/stats`
;` | The endpoint `/api/receiving/stats` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\receivingService.js` | 249 | INVALID_COLUMN | `const response = await apiClient.post(\
`${this.baseUrl}/${id}/report/${reportType}
`);` | The endpoint `/api/receiving/:id/report/:reportType` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\receivingService.js` | 269 | INVALID_COLUMN | `const response = await apiClient.request(\
`${this.baseUrl}/${id}/documents
`), { ... });` | The endpoint `/api/receiving/:id/documents` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\receivingService.js` | 288 | INVALID_COLUMN | `const response = await apiClient.get(\
`${this.baseUrl}/${id}/documents
`);` | The endpoint `/api/receiving/:id/documents` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\receivingService.js` | 303 | INVALID_COLUMN | `await apiClient.delete(\
`${this.baseUrl}/${id}/documents/${documentId}
`);` | The endpoint `/api/receiving/:id/documents/:documentId` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\receivingService.js` | 318 | INVALID_COLUMN | `const response = await apiClient.patch(\
`${this.baseUrl}/bulk/status
`), { ... });` | The endpoint `/api/receiving/bulk/status` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\receivingService.js` | 348 | INVALID_COLUMN | `const url = 
`${this.baseUrl}/export?${queryParams.toString()}
`;` | The endpoint `/api/receiving/export` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\receivingService.js` | 374 | INVALID_COLUMN | `const response = await apiClient.get(\
`${this.baseUrl}/ftz/workflow
`);` | The endpoint `/api/receiving/ftz/workflow` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\receivingService.js` | 392 | INVALID_COLUMN | `const response = await apiClient.post(\
`${this.baseUrl}/${id}/seal/validate
`), sealData);` | The endpoint `/api/receiving/:id/seal/validate` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\receivingService.js` | 409 | INVALID_COLUMN | `const response = await apiClient.get(\
`${this.baseUrl}/${id}/audit-trail
`);` | The endpoint `/api/receiving/:id/audit-trail` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\receivingService.js` | 424 | INVALID_COLUMN | `const response = await apiClient.patch(\
`${this.baseUrl}/${id}/archive
`);` | The endpoint `/api/receiving/:id/archive` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\receivingService.js` | 439 | INVALID_COLUMN | `const response = await apiClient.patch(\
`${this.baseUrl}/${id}/restore
`);` | The endpoint `/api/receiving/:id/restore` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\shippingService.js` | 101 | INVALID_COLUMN | `const response = await apiClient.post(\
`${this.baseUrl}/${id}/labels
`), labelData);` | The endpoint `/api/shipping/:id/labels` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\shippingService.js` | 119 | INVALID_COLUMN | `const response = await apiClient.post(\
`${this.baseUrl}/${id}/signoff
`), signoffData);` | The endpoint `/api/shipping/:id/signoff` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\shippingService.js` | 137 | INVALID_COLUMN | `const response = await apiClient.post(\
`${this.baseUrl}/${id}/cbp-filing
`);` | The endpoint `/api/shipping/:id/cbp-filing` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\shippingService.js` | 163 | INVALID_COLUMN | `const url = 
`${this.baseUrl}/stats?${queryParams.toString()}
` : 
`${this.baseUrl}/stats`
;` | The endpoint `/api/shipping/stats` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\shippingService.js` | 183 | INVALID_COLUMN | `const response = await apiClient.post(\
`/validate
`), shipmentData);` | The endpoint `/api/shipping/validate` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\shippingService.js` | 202 | INVALID_COLUMN | `const response = await apiClient.post(\
`/rates
`), shipmentData);` | The endpoint `/api/shipping/rates` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\shippingService.js` | 220 | INVALID_COLUMN | `const response = await apiClient.get(\
`/track?${params.toString()}
`);` | The endpoint `/api/shipping/track` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\shippingService.js` | 243 | INVALID_COLUMN | `const response = await apiClient.patch(\
`/bulk/status
`), { ... });` | The endpoint `/api/shipping/bulk/status` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\shippingService.js` | 273 | INVALID_COLUMN | `const url = 
`${this.baseUrl}/export?${queryParams.toString()}
`;` | The endpoint `/api/shipping/export` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\shippingService.js` | 299 | INVALID_COLUMN | `const response = await apiClient.get(\
`/workflow/config
`);` | The endpoint `/api/shipping/workflow/config` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\shippingService.js` | 317 | INVALID_COLUMN | `const response = await apiClient.patch(\
`${this.baseUrl}/${id}/archive
`);` | The endpoint `/api/shipping/:id/archive` does not exist. |
| `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\shippingService.js` | 332 | INVALID_COLUMN | `const response = await apiClient.patch(\
`${this.baseUrl}/${id}/restore
`);` | The endpoint `/api/shipping/:id/restore` does not exist. |

### Files Reviewed

*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\lib\database.types.ts`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\auth\AuthService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\contexts\AppContext.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\contexts\AppContext.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\types\index.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\business\ReceivingService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\components\modals\AddPreadmissionModal.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\preadmission.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\analytics\DashboardService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\utils\validation.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\components\modals\CreatePreshipmentModal.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\business\PreshipmentService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\business\PreadmissionService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\preshipments.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\dashboard.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\parts.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\auth\PermissionService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\auth\UserService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\_handlers\admin.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\_handlers\auth-login.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\_handlers\auth-refresh.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\_handlers\customers.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\_handlers\dashboard.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\_handlers\health.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\_handlers\hts.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\_handlers\inventory.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\_handlers\locations.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\_handlers\materials.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\_handlers\parts.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\_handlers\suppliers.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\_utils\auth.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\_utils\cors.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\_utils\db.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\api\index.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\check_customers_schema.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\examples\enhanced-backend-integration.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\check_employees_schema.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\check-exact-columns.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\copy-build.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\analyze-schema-expectations.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\complete-schema-analysis.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\fixes\complete-schema-fix.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\fixes\create-admin-employee.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\fixes\fix-remaining-console-errors.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\fixes\fix-schema-mismatches.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\inspect-supabase-schema.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\migrate.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\db\seed-db.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\discover-columns.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\download-hts-csv.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\download-hts-data.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\examine-schema.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\get-schema-direct.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\scripts\import-preadmissions-spreadsheet.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\auth.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\controllers\EnhancedInventoryController.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\index.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\middleware\async.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\middleware\auth.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\middleware\error-handler.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\middleware\request-logger.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\middleware\validation.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\admin.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\auth.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\customers.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\hts.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\inventory.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\locations.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\material-pricing.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\materials.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\receiving.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\shipping.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\api\routes\tariff.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\db\supabase-client.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\monitoring\MonitoringService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\realtime\WebSocketManager.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\BaseService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\business\EntrySummaryService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\business\ShippingService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\core\CustomerService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\enhanced\EnhancedBaseService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\inventory\InventoryService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\inventory\PartService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\pricing\MaterialIndexService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\reference\HTSService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\reference\verifiedDutyRates.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\registry\ServiceRegistry.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\backend\services\ServiceInitializer.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\data\hts\browse-data.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\data\hts\countries-data.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\data\hts\duty-rate-data.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\data\hts\popular-codes-data.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\data\hts\search-data.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\App.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\components\pages\Admin.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\components\pages\Customers.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\components\pages\Dashboard.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\components\pages\EntrySummaryGroups.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\components\pages\HTSBrowser.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\components\pages\Inventory.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\components\pages\Login.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\components\pages\Parts.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\components\pages\PreAdmissions.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\components\pages\PreShipments.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\components\pages\Receiving.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\components\pages\Reports.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\components\pages\Shipping.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\components\shared\BaseModal.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\components\shared\BatchUploader.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\components\shared\CollapsibleSection.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\components\shared\ErrorBoundary.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\components\shared\LoadingSpinner.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\components\shared\Sidebar.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\components\shared\StatCard.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\components\shared\TariffDisplay.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\contexts\AuthContext.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\index.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\api-client.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\htsService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\materialIndexService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\preshipmentService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\receivingService.js`
*   `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\services\shippingService.js`

### Files Remaining

There are 122 files remaining to be reviewed. The next time we continue, we can start with the file `C:\Users\DavidOkonoski\OneDrive\Documents\Integrator Consulting, LLC\App Development\ICRS_SPARC\src\frontend\src\utils\csvHelpers.js`.

# Manual Testing Checklist - Admin Modals

## Overview
This checklist provides systematic manual testing procedures for Admin page modals in the ICRS SPARC application. Use this for scenarios that require human judgment, accessibility testing, and edge cases that are difficult to automate.

---

## Pre-Test Setup

### Environment Verification
- [ ] Frontend running on localhost:3000
- [ ] Backend API running on localhost:5000  
- [ ] User logged in with admin permissions
- [ ] Browser developer tools open (for console errors)
- [ ] Test data prepared (see data templates below)

### Browser Testing Matrix
Test each modal functionality across:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome (responsive)
- [ ] Mobile Safari (responsive)

---

## AddEmployeeModal Testing

### Modal Opening/Closing
- [ ] Click "Add Employee" button → Modal opens immediately
- [ ] Modal displays correct title "Add New Employee"
- [ ] All form fields visible and properly labeled
- [ ] Modal has proper focus management (first input focused)
- [ ] Press ESC key → Modal closes
- [ ] Click outside modal → Modal closes
- [ ] Click X button → Modal closes
- [ ] Click Cancel button → Modal closes

### Form Fields and Validation
- [ ] **Name field**: 
  - [ ] Required validation shows on empty submit
  - [ ] Error clears when typing starts
  - [ ] Accepts special characters (José, O'Connor)
  - [ ] Rejects extremely long names (500+ chars)

- [ ] **Email field**:
  - [ ] Required validation shows on empty submit
  - [ ] Invalid format validation (test@, @test.com, invalid-email)
  - [ ] Valid formats accepted (user@domain.com, user+tag@domain.co.uk)
  - [ ] Auto-trim whitespace

- [ ] **Role dropdown**:
  - [ ] Required validation shows on empty selection
  - [ ] All options present (Administrator, Manager, Employee, Viewer)
  - [ ] Selection changes properly

- [ ] **Department field**:
  - [ ] Optional field (no required validation)
  - [ ] Accepts text input properly

- [ ] **Phone field**:
  - [ ] Optional field (no required validation)  
  - [ ] Accepts various formats ((555) 123-4567, 555-123-4567, +1-555-123-4567)

- [ ] **Status dropdown**:
  - [ ] Defaults to "Active"
  - [ ] Can select "Inactive"

### Form Submission
- [ ] **Valid submission**:
  - [ ] Fill all required fields with valid data
  - [ ] Click "Add Employee" → Loading spinner appears
  - [ ] Submit button shows "Adding..." text and is disabled
  - [ ] Cancel button is disabled during submission
  - [ ] Success message appears after completion
  - [ ] Modal closes automatically
  - [ ] Employee appears in admin list

- [ ] **Network error handling**:
  - [ ] Disconnect network → Submit form → Error message appears
  - [ ] Form data preserved after error
  - [ ] Can retry submission
  - [ ] Form remains functional after error

### Edit Mode Testing
- [ ] Click Edit on existing employee → Modal opens with pre-filled data
- [ ] Modal title shows "Edit Employee"
- [ ] Submit button shows "Update Employee"
- [ ] All existing data properly populated
- [ ] Changes save correctly
- [ ] Updated data reflects in employee list

---

## AddPartModal Testing

### Modal Structure
- [ ] Modal opens with "Add New Part" title
- [ ] Three main sections visible:
  - [ ] Basic Information
  - [ ] Classification  
  - [ ] Pricing & Weight
- [ ] All sections properly labeled and organized
- [ ] Large modal size (wider than employee modal)

### Basic Information Section
- [ ] **Part Number field**:
  - [ ] Required validation works
  - [ ] Accepts alphanumeric with hyphens (PART-001)
  - [ ] Rejects special characters (?, !, @)

- [ ] **Manufacturer field**:
  - [ ] Optional field
  - [ ] Accepts text input

- [ ] **Description field**:
  - [ ] Required validation works
  - [ ] Textarea allows multiple lines
  - [ ] Handles long descriptions properly

### Classification Section
- [ ] **HTS Code field**:
  - [ ] Format validation (XXXX.XX.XXXX)
  - [ ] Valid: 8541.10.0060
  - [ ] Invalid: 8541.10, invalid-hts, 85411.0060
  - [ ] Optional field (no error when empty)

- [ ] **Country of Origin**:
  - [ ] Text input accepts country codes
  - [ ] Optional field

- [ ] **Material dropdown**:
  - [ ] Shows material options (Steel, Aluminum, Electronic, etc.)
  - [ ] Optional field

- [ ] **Unit of Measure dropdown**:
  - [ ] Shows UOM options (EA, LB, KG, FT, M, GAL, L)
  - [ ] Defaults to "EA"

### Pricing & Weight Section
- [ ] **Material Cost field**:
  - [ ] Accepts decimal numbers (15.50)
  - [ ] Rejects non-numeric input
  - [ ] Auto-calculates standard value when changed

- [ ] **Labor Cost field**:
  - [ ] Accepts decimal numbers (10.25)
  - [ ] Rejects non-numeric input
  - [ ] Auto-calculates standard value when changed

- [ ] **Standard Value field**:
  - [ ] Auto-calculates as Material + Labor
  - [ ] Test: Material=15.50, Labor=9.50 → Standard=25.00
  - [ ] Can be manually overridden
  - [ ] Number validation works

- [ ] **Weight fields**:
  - [ ] Accept decimal numbers with 3 decimal places
  - [ ] Optional fields
  - [ ] Number validation works

### Auto-calculation Testing
- [ ] Enter Material Cost: 15.50 → Standard Value updates
- [ ] Enter Labor Cost: 10.25 → Standard Value becomes 25.75
- [ ] Change Material Cost to 20.00 → Standard Value becomes 30.25
- [ ] Manually edit Standard Value → Calculation stops auto-updating
- [ ] Clear and re-enter costs → Auto-calculation resumes

---

## AddCustomerModal Testing

### Modal Structure and Sections
- [ ] Modal opens with "Add New Customer" title
- [ ] Extra large modal size
- [ ] Four main sections:
  - [ ] Company Information
  - [ ] Contact Information  
  - [ ] Additional Contacts
  - [ ] Notes

### Company Information Section
- [ ] **Company Name**:
  - [ ] Required validation works
  - [ ] Accepts business names with various characters

- [ ] **EIN field**:
  - [ ] Format validation (XX-XXXXXXX)
  - [ ] Valid: 12-3456789
  - [ ] Invalid: 123456789, 12-345678, invalid
  - [ ] Optional field

- [ ] **Industry dropdown**:
  - [ ] Shows industry options (Manufacturing, Automotive, Electronics, etc.)
  - [ ] Optional field

- [ ] **Status dropdown**:
  - [ ] Shows status options (Active, Inactive, Suspended)
  - [ ] Defaults to "Active"

- [ ] **Address field**:
  - [ ] Textarea for multi-line addresses
  - [ ] Optional field

### Contact Information Section
- [ ] **Primary Email**:
  - [ ] Email format validation
  - [ ] Optional field

- [ ] **Phone**:
  - [ ] Accepts various phone formats
  - [ ] Optional field

- [ ] **Website**:
  - [ ] URL format validation
  - [ ] Auto-corrects missing protocol (example.com → https://example.com)
  - [ ] Valid: https://company.com, http://company.com
  - [ ] Invalid: just-text, .com

- [ ] **Customs Broker**:
  - [ ] Text input for broker name
  - [ ] Optional field

### Additional Contacts Section
- [ ] **Default contact**:
  - [ ] One contact row present by default
  - [ ] Primary contact checkbox checked
  - [ ] No delete button for single contact

- [ ] **Add Contact functionality**:
  - [ ] Click "Add Contact" → New contact row appears
  - [ ] Delete buttons appear for multiple contacts
  - [ ] Can add multiple contacts (test up to 5)

- [ ] **Contact fields per row**:
  - [ ] Name (optional but recommended)
  - [ ] Email (optional, format validated if provided)
  - [ ] Phone (optional)
  - [ ] Job Title (optional)

- [ ] **Primary contact management**:
  - [ ] Only one contact can be primary
  - [ ] Checking new primary unchecks previous
  - [ ] Deleting primary contact auto-assigns to first remaining
  - [ ] Cannot delete all contacts (minimum 1 required)

- [ ] **Contact validation**:
  - [ ] At least one contact must have name OR email
  - [ ] Error shows if all contacts are empty
  - [ ] Validation clears when contact info added

### Form Submission Testing
- [ ] **Minimum valid submission**:
  - [ ] Company name + one contact name/email
  - [ ] Submission succeeds
  - [ ] Customer appears in list

- [ ] **Complete data submission**:
  - [ ] Fill all fields including multiple contacts
  - [ ] Submission succeeds with all data
  - [ ] All contact relationships preserved

---

## AddSupplierModal Testing

### Modal Structure and Sections  
- [ ] Modal opens with "Add New Supplier" title
- [ ] Extra large modal size
- [ ] Five main sections:
  - [ ] Basic Information
  - [ ] Contact Information
  - [ ] Customs Broker Information
  - [ ] Business Terms
  - [ ] Additional Contacts

### Basic Information Section
- [ ] **Supplier Name**:
  - [ ] Required validation works
  - [ ] Accepts international business names

- [ ] **Country dropdown**:
  - [ ] Required validation works
  - [ ] Shows common country codes (USA, CHN, DEU, JPN, etc.)
  - [ ] At least 20 countries available

- [ ] **EIN/Tax ID**:
  - [ ] Format validation (XX-XXXXXXX) for US suppliers
  - [ ] Optional field

- [ ] **Industry dropdown**:
  - [ ] Shows supplier-specific industries
  - [ ] Includes: Manufacturing, Raw Materials, Electronics, etc.
  - [ ] Optional field

- [ ] **Address**:
  - [ ] Textarea for international addresses
  - [ ] Optional field

### Contact Information Section
- [ ] **Primary Contact Person**:
  - [ ] Text input for contact name
  - [ ] Optional field

- [ ] **Phone**:
  - [ ] Accepts international phone formats
  - [ ] Placeholder shows international format (+1 (555) 123-4567)

- [ ] **Email**:
  - [ ] Email format validation
  - [ ] Optional field

- [ ] **Website**:
  - [ ] URL format validation with auto-correction
  - [ ] Optional field

### Customs Broker Information Section
- [ ] **Broker Name**:
  - [ ] Text input for broker company
  - [ ] Optional field

- [ ] **Broker Contact Person**:
  - [ ] Text input for broker contact
  - [ ] Optional field

- [ ] **Broker Email**:
  - [ ] Email format validation
  - [ ] Optional field

- [ ] **Broker Phone**:
  - [ ] Phone format similar to main contact
  - [ ] Optional field

### Business Terms Section
- [ ] **Payment Terms dropdown**:
  - [ ] Shows options: Net 30, Net 60, Net 90, COD, Prepaid, Letter of Credit, Other
  - [ ] Optional field

- [ ] **Currency dropdown**:
  - [ ] Shows major currencies: USD, EUR, CNY, JPY, GBP, CAD
  - [ ] Defaults to USD

- [ ] **Status dropdown**:
  - [ ] Shows: Active, Inactive, Blocked, Pending Approval
  - [ ] Defaults to Active

### Additional Contacts Section
- [ ] Same testing as Customer contacts section
- [ ] Contact management functionality identical
- [ ] Primary contact designation works correctly

### Supplier-Specific Validation
- [ ] **Country requirement**:
  - [ ] Submit without country → Error appears
  - [ ] Error message: "Country is required"
  - [ ] Error clears when country selected

- [ ] **International data handling**:
  - [ ] Chinese characters in supplier name
  - [ ] International phone numbers
  - [ ] Various address formats

---

## Cross-Modal Functionality Testing

### Modal State Management
- [ ] Open Employee modal → Close → Open Part modal → Correct modal shows
- [ ] Open modal → Fill data → Close without saving → Reopen → Form is reset
- [ ] Cannot open multiple modals simultaneously
- [ ] Modal z-index prevents interaction with background

### Form Reset Testing
- [ ] Fill form partially → Click Cancel → Reopen → Form is clean
- [ ] Submit successful form → Reopen → Form is clean
- [ ] Submit form with error → Close → Reopen → Form is clean

### Loading State Consistency
Test with slow network (throttle to Slow 3G):
- [ ] Employee modal: Submission shows loading state correctly
- [ ] Part modal: Submission shows loading state correctly
- [ ] Customer modal: Submission shows loading state correctly  
- [ ] Supplier modal: Submission shows loading state correctly
- [ ] All modals disable form during submission
- [ ] All modals prevent closing during submission

### Error Handling Consistency
Test with network errors:
- [ ] API timeout: Error message appears, form stays open
- [ ] Server error (500): Generic error message appears
- [ ] Validation error (400): Specific validation messages appear
- [ ] Network offline: Appropriate offline message appears

---

## Accessibility Testing

### Keyboard Navigation
- [ ] **Tab navigation**:
  - [ ] Tab moves through all form fields in logical order
  - [ ] Shift+Tab moves backward correctly
  - [ ] Focus indicators visible on all elements
  - [ ] Tab order includes modal controls (Close, Cancel, Submit)

- [ ] **Keyboard shortcuts**:
  - [ ] ESC closes modal from any field
  - [ ] Enter in text fields moves to next field (not submit)
  - [ ] Enter on Submit button submits form
  - [ ] Enter on Cancel button cancels form

### Screen Reader Testing
Test with NVDA, JAWS, or VoiceOver:
- [ ] Modal opens with appropriate announcement
- [ ] Modal title read correctly
- [ ] Required fields announced as required
- [ ] Error messages read when they appear
- [ ] Field labels properly associated with inputs
- [ ] Form sections announced with headings

### Focus Management
- [ ] Modal opening: Focus moves to first form field
- [ ] Modal closing: Focus returns to trigger button
- [ ] Error state: Focus moves to first error field
- [ ] Loading state: Focus preserved appropriately

### Color and Contrast
- [ ] All text meets WCAG AA contrast standards
- [ ] Error messages visible without relying on color alone
- [ ] Form validation indicators work for colorblind users
- [ ] Focus indicators have sufficient contrast

---

## Performance Testing

### Modal Opening Performance
- [ ] Employee modal opens < 200ms
- [ ] Part modal opens < 300ms (larger form)
- [ ] Customer modal opens < 300ms
- [ ] Supplier modal opens < 400ms (largest form)

### Form Interaction Performance  
- [ ] Typing in fields responsive (no lag)
- [ ] Dropdown selections immediate
- [ ] Auto-calculations instantaneous (Part modal)
- [ ] Adding contacts smooth (Customer/Supplier modals)

### Memory Usage
Open and close each modal 10 times:
- [ ] Browser memory usage stable
- [ ] No console errors about memory leaks
- [ ] React DevTools shows proper component cleanup

---

## Visual Design Testing

### Layout and Spacing
- [ ] All form fields properly aligned
- [ ] Consistent spacing between sections
- [ ] Modal fits properly on different screen sizes
- [ ] Mobile responsive behavior works correctly

### Typography and Content
- [ ] All field labels clear and descriptive
- [ ] Error messages helpful and specific
- [ ] Button text appropriate for context
- [ ] Placeholder text provides good examples

### Modal Sizing
- [ ] Employee: Medium modal appropriate for content
- [ ] Part: Large modal accommodates all sections
- [ ] Customer: XL modal handles contacts section
- [ ] Supplier: XL modal handles all business sections

---

## Test Data Templates

### Valid Employee Data
```
Name: María José García-Smith
Email: maria.garcia@testcompany.com
Role: Administrator
Department: International Operations
Phone: +1 (555) 123-4567
```

### Valid Part Data
```
Part Number: INT-COMP-2024-001
Manufacturer: International Electronics Ltd
Description: High-performance microprocessor component with integrated heat dissipation and multi-core architecture for industrial applications
HTS Code: 8542.31.0000
Country of Origin: SGP
Material: Electronic
Material Cost: 45.75
Labor Cost: 12.25
Gross Weight: 0.125
```

### Valid Customer Data
```
Company: Acme International Manufacturing Corporation
EIN: 98-7654321
Industry: Automotive
Address: 1234 Industrial Boulevard
Suite 567
Manufacturing District
City, State 12345-6789
Primary Email: procurement@acme-intl.com
Phone: +1 (555) 987-6543
Website: acme-international.com
Customs Broker: Global Customs Solutions LLC

Contact 1 (Primary):
Name: Sarah Johnson
Email: sarah.johnson@acme-intl.com
Phone: +1 (555) 987-6544
Title: Procurement Director

Contact 2:
Name: Michael Chen
Email: m.chen@acme-intl.com  
Phone: +1 (555) 987-6545
Title: Supply Chain Manager
```

### Valid Supplier Data
```
Supplier: 深圳全球制造有限公司 (Shenzhen Global Manufacturing Ltd)
Country: CHN
EIN: (leave empty for international)
Industry: Electronics
Address: Building 12, Industrial Park
Shenzhen Technology Zone
Guangdong Province, China 518000
Contact Person: 李伟 (Li Wei)
Phone: +86 755-1234-5678
Email: li.wei@sz-global-mfg.com
Website: sz-global-manufacturing.com

Broker Name: Pacific Customs Brokers Inc
Broker Contact: Jennifer Martinez
Broker Email: j.martinez@pacific-customs.com
Broker Phone: +1 (555) 555-0123

Payment Terms: Net 30
Currency: USD
Status: Active

Additional Contact:
Name: 王晓明 (Wang Xiaoming)
Email: wang.xm@sz-global-mfg.com
Phone: +86 755-1234-5679
Title: Export Manager
Primary: Yes
```

---

## Issue Documentation Template

When documenting issues found during manual testing:

**Issue ID**: ADMIN-MODAL-XXX
**Severity**: Critical / Major / Minor
**Component**: AddEmployeeModal / AddPartModal / AddCustomerModal / AddSupplierModal
**Browser**: Chrome 120.0 / Firefox 118.0 / etc.
**Environment**: localhost:3000

**Description**: 
Brief description of the issue

**Steps to Reproduce**:
1. Navigate to Admin page
2. Click "Add [Entity]" button
3. [Specific steps]

**Expected Result**:
What should happen

**Actual Result**: 
What actually happens

**Screenshot/Video**: 
[Attach if visual issue]

**Workaround**: 
Any temporary solution

**Additional Notes**:
Any other relevant information
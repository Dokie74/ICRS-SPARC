# ICRS_SPARC Technical Architecture Blueprint
## Foreign Trade Zone Operations Platform - Next Generation Architecture

**Status Date:** August 29, 2025  
**System Architect:** Claude Code Analysis System  
**Target Release:** Q4 2025  

---

## Executive Summary

### Project Overview
ICRS_SPARC transforms the proven Foreign Trade Zone management system into a modern, scalable, production-ready platform that maintains 100% operational continuity while adding enterprise-grade capabilities. The architecture preserves all business logic from the original ICRS system while modernizing the technical foundation.

### Key Architectural Decisions

**Backend Preservation Strategy:**
- Maintain proven BaseService pattern with standardized `{success, data, error}` responses
- Preserve all 21 specialized services with their domain organization
- Enhance with comprehensive TypeScript interfaces and API contracts
- Add comprehensive error handling, logging, and monitoring

**Frontend Modernization Strategy:**
- Replace switch-statement routing with React Router v6 architecture
- Implement React Query + Zustand hybrid state management
- Add comprehensive code splitting with React.lazy and Suspense
- Implement robust error boundaries and loading states

**Technology Stack Summary:**
- **Frontend:** React 18, React Router v6, React Query, Zustand, Tailwind CSS
- **Backend:** Node.js/Express, preserved BaseService architecture
- **Database:** Supabase PostgreSQL with Row Level Security
- **Real-time:** Supabase Realtime + WebSocket integration
- **Testing:** Jest, React Testing Library, Playwright E2E
- **Deployment:** Docker containers with CI/CD pipeline

### Critical Technical Constraints
- Zero disruption to existing FTZ operations during migration
- 100% preservation of business logic and audit trails
- Performance targets: Dashboard <2s with 1000+ inventory lots
- OWASP compliance and security scanning integration

---

## Backend Architecture Specifications

### Proven BaseService Pattern (Preserved)

The existing BaseService pattern provides a robust foundation with standardized response format across all services:

```javascript
// Standardized Response Format
{
  success: boolean,
  data?: any,      // Present on success
  error?: string   // Present on failure
}
```

**Core BaseService Capabilities:**
- CRUD operations with audit trails (created_at, updated_at, created_by, updated_by)
- Batch operations (createBatch, upsertBatch)
- Search and filtering with pagination
- Soft delete with active flag
- Real-time subscription management
- Standardized error handling and logging

### Enhanced BaseService Architecture

**TypeScript Interface Definition:**
```typescript
interface BaseServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

interface ServiceOptions {
  userId?: string;
  filters?: Array<{column: string, value: any, operator?: string}>;
  orderBy?: {column: string, ascending: boolean};
  limit?: number;
  offset?: number;
  select?: string;
  single?: boolean;
}

abstract class BaseService<T = any> {
  protected tableName: string;
  protected client: DatabaseClient;
  
  // Core CRUD operations
  abstract getAll(options?: ServiceOptions): Promise<BaseServiceResponse<T[]>>;
  abstract getById(id: string, options?: ServiceOptions): Promise<BaseServiceResponse<T>>;
  abstract create(data: Partial<T>, options?: ServiceOptions): Promise<BaseServiceResponse<T>>;
  abstract update(id: string, data: Partial<T>, options?: ServiceOptions): Promise<BaseServiceResponse<T>>;
  abstract delete(id: string, options?: ServiceOptions): Promise<BaseServiceResponse<void>>;
  
  // Enhanced operations
  abstract search(searchText: string, fields: string[], options?: ServiceOptions): Promise<BaseServiceResponse<T[]>>;
  abstract count(options?: ServiceOptions): Promise<BaseServiceResponse<{count: number}>>;
  abstract createSubscription(callback: Function, filters?: object): any;
  
  // Validation and utility
  protected validateRequired(data: any, fields: string[]): BaseServiceResponse<void>;
  protected createResponse<U>(success: boolean, data?: U, error?: string): BaseServiceResponse<U>;
}
```

### Domain-Organized Service Architecture (21 Specialized Services)

**Authentication Domain (`/auth/`):**
```typescript
// AuthService.ts - Session management and user authentication
interface AuthService {
  login(email: string, password: string): Promise<AuthResponse>;
  logout(): Promise<BaseServiceResponse<void>>;
  getCurrentSession(): Promise<BaseServiceResponse<Session>>;
  getCurrentUser(): Promise<BaseServiceResponse<User>>;
  getUserProfile(userId: string): Promise<BaseServiceResponse<EmployeeProfile>>;
  checkPermission(permission: string, userId?: string): Promise<BaseServiceResponse<boolean>>;
  getUserRole(userId?: string): Promise<BaseServiceResponse<string>>;
  onAuthStateChange(callback: Function): Subscription;
}

// UserService.ts - User profile and employee management
interface UserService {
  getAllUsers(options?: ServiceOptions): Promise<BaseServiceResponse<User[]>>;
  createUser(userData: CreateUserRequest): Promise<BaseServiceResponse<User>>;
  updateUserProfile(userId: string, data: UpdateProfileRequest): Promise<BaseServiceResponse<User>>;
  deactivateUser(userId: string): Promise<BaseServiceResponse<void>>;
  getUserPermissions(userId: string): Promise<BaseServiceResponse<Permission[]>>;
}

// PermissionService.ts - Role-based access control
interface PermissionService {
  getRolePermissions(role: string): Promise<BaseServiceResponse<Permission[]>>;
  assignUserPermissions(userId: string, permissions: string[]): Promise<BaseServiceResponse<void>>;
  checkUserAccess(userId: string, resource: string, action: string): Promise<BaseServiceResponse<boolean>>;
}
```

**Core Business Domain (`/core/`):**
```typescript
// CustomerService.ts - FTZ customer management
interface CustomerService {
  getAllCustomers(options?: ServiceOptions): Promise<BaseServiceResponse<Customer[]>>;
  getCustomerById(customerId: string): Promise<BaseServiceResponse<Customer>>;
  createCustomer(customerData: CreateCustomerRequest): Promise<BaseServiceResponse<Customer>>;
  updateCustomer(customerId: string, data: UpdateCustomerRequest): Promise<BaseServiceResponse<Customer>>;
  getCustomerInventory(customerId: string): Promise<BaseServiceResponse<InventoryLot[]>>;
  searchCustomers(searchTerm: string): Promise<BaseServiceResponse<Customer[]>>;
}
```

**Inventory Domain (`/inventory/`):**
```typescript
// InventoryService.ts - FTZ lot and transaction management
interface InventoryService {
  getAllLots(options?: ServiceOptions): Promise<BaseServiceResponse<InventoryLot[]>>;
  getLotById(lotId: string): Promise<BaseServiceResponse<EnhancedInventoryLot>>;
  createLot(lotData: CreateLotRequest): Promise<BaseServiceResponse<InventoryLot>>;
  adjustLotQuantity(lotId: string, newQuantity: number, reason: string, oldQuantity: number): Promise<BaseServiceResponse<InventoryLot>>;
  changeLotStatus(lotId: string, newStatus: string, reason: string, oldStatus: string): Promise<BaseServiceResponse<InventoryLot>>;
  voidLot(lotId: string, reason: string, quantityToRemove: number): Promise<BaseServiceResponse<InventoryLot>>;
  searchLots(searchTerm: string, filters?: LotFilters): Promise<BaseServiceResponse<InventoryLot[]>>;
  getLotTransactionHistory(lotId: string): Promise<BaseServiceResponse<Transaction[]>>;
  subscribeToInventoryChanges(callback: Function): Subscription;
  getInventorySummary(): Promise<BaseServiceResponse<InventorySummary>>;
}

// PartService.ts - Parts catalog and HTS code management
interface PartService {
  getAllParts(options?: ServiceOptions): Promise<BaseServiceResponse<Part[]>>;
  getPartById(partId: string): Promise<BaseServiceResponse<Part>>;
  createPart(partData: CreatePartRequest): Promise<BaseServiceResponse<Part>>;
  updatePart(partId: string, data: UpdatePartRequest): Promise<BaseServiceResponse<Part>>;
  getPartInventory(partId: string): Promise<BaseServiceResponse<InventoryLot[]>>;
  getPartTransactionHistory(partId: string): Promise<BaseServiceResponse<Transaction[]>>;
  searchParts(searchTerm: string): Promise<BaseServiceResponse<Part[]>>;
  validateHTSCode(htsCode: string): Promise<BaseServiceResponse<HTSValidation>>;
}
```

**Business Operations Domain (`/business/`):**
```typescript
// PreadmissionService.ts - FTZ admission workflow
interface PreadmissionService {
  getAllPreadmissions(options?: ServiceOptions): Promise<BaseServiceResponse<Preadmission[]>>;
  getPreadmissionById(id: string): Promise<BaseServiceResponse<EnhancedPreadmission>>;
  createPreadmission(data: CreatePreadmissionRequest): Promise<BaseServiceResponse<Preadmission>>;
  updatePreadmissionStatus(id: string, status: string, notes?: string): Promise<BaseServiceResponse<Preadmission>>;
  processToAdmission(id: string): Promise<BaseServiceResponse<InventoryLot>>;
  generateE214Form(id: string): Promise<BaseServiceResponse<{formData: any, pdfUrl: string}>>;
  validatePreadmissionData(data: any): Promise<BaseServiceResponse<ValidationResult>>;
}

// PreshipmentService.ts - FTZ shipment and withdrawal workflow  
interface PreshipmentService {
  getAllPreshipments(options?: ServiceOptions): Promise<BaseServiceResponse<Preshipment[]>>;
  getPreshipmentById(id: string): Promise<BaseServiceResponse<EnhancedPreshipment>>;
  createPreshipment(data: CreatePreshipmentRequest): Promise<BaseServiceResponse<Preshipment>>;
  processPreshipment(id: string): Promise<BaseServiceResponse<Transaction[]>>;
  generateShippingDocuments(id: string): Promise<BaseServiceResponse<{documents: Document[]}>>;
  calculateDutyAndTaxes(preshipmentId: string): Promise<BaseServiceResponse<DutyCalculation>>;
}

// EntrySummaryService.ts - Customs entry summary and duty calculations
interface EntrySummaryService {
  getAllEntrySummaries(options?: ServiceOptions): Promise<BaseServiceResponse<EntrySummary[]>>;
  getEntrySummaryById(id: string): Promise<BaseServiceResponse<EnhancedEntrySummary>>;
  createEntrySummary(data: CreateEntrySummaryRequest): Promise<BaseServiceResponse<EntrySummary>>;
  calculateDuties(entrySummaryId: string): Promise<BaseServiceResponse<DutyCalculation>>;
  generateCBPForms(entrySummaryId: string): Promise<BaseServiceResponse<{forms: CBPForm[]}>>;
  submitToACE(entrySummaryId: string): Promise<BaseServiceResponse<ACESubmissionResult>>;
  getEntrySummaryStatus(id: string): Promise<BaseServiceResponse<EntrySummaryStatus>>;
}
```

**Analytics Domain (`/analytics/`):**
```typescript
// DashboardService.ts - Business intelligence and reporting
interface DashboardService {
  getDashboardMetrics(): Promise<BaseServiceResponse<DashboardMetrics>>;
  getInventoryMetrics(): Promise<BaseServiceResponse<InventoryMetrics>>;
  getOperationalMetrics(): Promise<BaseServiceResponse<OperationalMetrics>>;
  getComplianceMetrics(): Promise<BaseServiceResponse<ComplianceMetrics>>;
  generateInventoryReport(filters: ReportFilters): Promise<BaseServiceResponse<InventoryReport>>;
  generateComplianceReport(dateRange: DateRange): Promise<BaseServiceResponse<ComplianceReport>>;
  getRealtimeMetrics(): Promise<BaseServiceResponse<RealtimeMetrics>>;
  subscribeToMetricsUpdates(callback: Function): Subscription;
}
```

**Reference Data Domain (`/reference/`):**
```typescript
// Services for managing reference data, HTS codes, tariff schedules, etc.
interface HTSService {
  searchHTSCodes(searchTerm: string): Promise<BaseServiceResponse<HTSCode[]>>;
  getHTSCodeDetails(htsCode: string): Promise<BaseServiceResponse<HTSCodeDetails>>;
  validateHTSCode(htsCode: string): Promise<BaseServiceResponse<HTSValidation>>;
  getCurrentTariffRates(htsCode: string): Promise<BaseServiceResponse<TariffRate[]>>;
}

interface LocationService {
  getAllLocations(): Promise<BaseServiceResponse<StorageLocation[]>>;
  createLocation(locationData: CreateLocationRequest): Promise<BaseServiceResponse<StorageLocation>>;
  updateLocation(locationId: string, data: UpdateLocationRequest): Promise<BaseServiceResponse<StorageLocation>>;
  getLocationInventory(locationId: string): Promise<BaseServiceResponse<InventoryLot[]>>;
}
```

**Pricing Domain (`/pricing/`):**
```typescript
// Services for duty calculations, tariff management, and cost analysis
interface TariffService {
  getCurrentTariffSchedule(): Promise<BaseServiceResponse<TariffSchedule>>;
  calculateDutyRate(htsCode: string, countryOfOrigin: string, tradeAgreement?: string): Promise<BaseServiceResponse<DutyRate>>;
  getTradeAgreementRates(agreement: string, htsCode: string): Promise<BaseServiceResponse<PreferentialRate>>;
}

interface CostService {
  calculateLandedCost(lotId: string, additionalCharges?: AdditionalCharge[]): Promise<BaseServiceResponse<LandedCost>>;
  calculateStorageCosts(lotId: string, dateRange: DateRange): Promise<BaseServiceResponse<StorageCost>>;
  generateCostAnalysis(customerId: string, dateRange: DateRange): Promise<BaseServiceResponse<CostAnalysis>>;
}
```

---

## API Contract Specifications

### REST API Endpoints

**Authentication Endpoints:**
```yaml
# Authentication API contracts
POST /api/auth/login
  Request: { email: string, password: string }
  Response: { success: boolean, data?: { user: User, session: Session, profile: EmployeeProfile }, error?: string }
  
POST /api/auth/logout
  Request: {}
  Response: { success: boolean, error?: string }
  
GET /api/auth/session
  Headers: { Authorization: "Bearer <token>" }
  Response: { success: boolean, data?: Session, error?: string }
  
GET /api/auth/profile
  Headers: { Authorization: "Bearer <token>" }
  Response: { success: boolean, data?: EmployeeProfile, error?: string }
  
GET /api/auth/permissions
  Headers: { Authorization: "Bearer <token>" }
  Response: { success: boolean, data?: { permissions: string[], employee: EmployeeProfile }, error?: string }
```

**Inventory Management Endpoints:**
```yaml
# Inventory API contracts
GET /api/inventory/lots
  Query: { limit?, offset?, orderBy?, filters?, search? }
  Response: { success: boolean, data?: InventoryLot[], count?: number, error?: string }
  
GET /api/inventory/lots/:lotId
  Response: { success: boolean, data?: EnhancedInventoryLot, error?: string }
  
POST /api/inventory/lots
  Request: CreateLotRequest
  Response: { success: boolean, data?: InventoryLot, error?: string }
  
PUT /api/inventory/lots/:lotId/quantity
  Request: { newQuantity: number, reason: string, oldQuantity: number }
  Response: { success: boolean, data?: InventoryLot, error?: string }
  
PUT /api/inventory/lots/:lotId/status
  Request: { newStatus: string, reason: string, oldStatus: string }
  Response: { success: boolean, data?: InventoryLot, error?: string }
  
DELETE /api/inventory/lots/:lotId
  Request: { reason: string, quantityToRemove: number }
  Response: { success: boolean, data?: InventoryLot, error?: string }
  
GET /api/inventory/lots/:lotId/transactions
  Response: { success: boolean, data?: Transaction[], error?: string }
  
GET /api/inventory/summary
  Response: { success: boolean, data?: InventorySummary, error?: string }
```

**Customer Management Endpoints:**
```yaml
# Customer API contracts
GET /api/customers
  Query: { limit?, offset?, search? }
  Response: { success: boolean, data?: Customer[], count?: number, error?: string }
  
GET /api/customers/:customerId
  Response: { success: boolean, data?: Customer, error?: string }
  
POST /api/customers
  Request: CreateCustomerRequest
  Response: { success: boolean, data?: Customer, error?: string }
  
PUT /api/customers/:customerId
  Request: UpdateCustomerRequest
  Response: { success: boolean, data?: Customer, error?: string }
  
GET /api/customers/:customerId/inventory
  Response: { success: boolean, data?: InventoryLot[], error?: string }
```

**Parts Management Endpoints:**
```yaml
# Parts API contracts
GET /api/parts
  Query: { limit?, offset?, search?, filters? }
  Response: { success: boolean, data?: Part[], count?: number, error?: string }
  
GET /api/parts/:partId
  Response: { success: boolean, data?: Part, error?: string }
  
POST /api/parts
  Request: CreatePartRequest
  Response: { success: boolean, data?: Part, error?: string }
  
PUT /api/parts/:partId
  Request: UpdatePartRequest
  Response: { success: boolean, data?: Part, error?: string }
  
GET /api/parts/:partId/inventory
  Response: { success: boolean, data?: InventoryLot[], error?: string }
  
GET /api/parts/:partId/transactions
  Response: { success: boolean, data?: Transaction[], error?: string }
  
GET /api/hts/validate/:htsCode
  Response: { success: boolean, data?: HTSValidation, error?: string }
```

**Preadmission Workflow Endpoints:**
```yaml
# Preadmission API contracts
GET /api/preadmissions
  Query: { limit?, offset?, status?, customer_id? }
  Response: { success: boolean, data?: Preadmission[], count?: number, error?: string }
  
GET /api/preadmissions/:id
  Response: { success: boolean, data?: EnhancedPreadmission, error?: string }
  
POST /api/preadmissions
  Request: CreatePreadmissionRequest
  Response: { success: boolean, data?: Preadmission, error?: string }
  
PUT /api/preadmissions/:id/status
  Request: { status: string, notes?: string }
  Response: { success: boolean, data?: Preadmission, error?: string }
  
POST /api/preadmissions/:id/process
  Response: { success: boolean, data?: InventoryLot, error?: string }
  
GET /api/preadmissions/:id/e214
  Response: { success: boolean, data?: { formData: any, pdfUrl: string }, error?: string }
```

**Dashboard and Analytics Endpoints:**
```yaml
# Dashboard API contracts
GET /api/dashboard/metrics
  Response: { success: boolean, data?: DashboardMetrics, error?: string }
  
GET /api/dashboard/inventory-metrics
  Response: { success: boolean, data?: InventoryMetrics, error?: string }
  
GET /api/dashboard/operational-metrics
  Response: { success: boolean, data?: OperationalMetrics, error?: string }
  
GET /api/dashboard/compliance-metrics
  Response: { success: boolean, data?: ComplianceMetrics, error?: string }
  
POST /api/reports/inventory
  Request: ReportFilters
  Response: { success: boolean, data?: InventoryReport, error?: string }
  
POST /api/reports/compliance
  Request: { startDate: string, endDate: string }
  Response: { success: boolean, data?: ComplianceReport, error?: string }
```

### WebSocket Real-Time Events

**Real-Time Event Architecture:**
```yaml
# WebSocket connection management
Connection: wss://api.icrs-sparc.com/realtime
Authentication: Bearer token in connection params
Heartbeat: 30-second intervals

# Inventory real-time events
Event: inventory.lot.updated
Payload: { lot_id: string, changes: InventoryLotChanges, user_id: string, timestamp: string }

Event: inventory.lot.created  
Payload: { lot_data: InventoryLot, user_id: string, timestamp: string }

Event: inventory.lot.deleted
Payload: { lot_id: string, reason: string, user_id: string, timestamp: string }

Event: inventory.transaction.added
Payload: { transaction: Transaction, lot_id: string, user_id: string, timestamp: string }

# User session events
Event: user.session.expired
Payload: { user_id: string, timestamp: string }

Event: user.permission.changed
Payload: { user_id: string, new_permissions: string[], timestamp: string }

# System events
Event: system.maintenance.scheduled
Payload: { start_time: string, duration_minutes: number, message: string }

Event: system.error.occurred
Payload: { error_id: string, severity: 'low' | 'medium' | 'high', message: string, timestamp: string }
```

### Error Handling Specifications

**Standardized Error Response Format:**
```typescript
interface APIError {
  success: false;
  error: string;              // Human-readable error message
  code?: string;              // Error code for programmatic handling
  details?: any;              // Additional error context
  timestamp: string;          // ISO timestamp
  traceId?: string;           // Request tracing ID
  validationErrors?: Array<{  // Field validation errors
    field: string;
    message: string;
  }>;
}

// Example error responses
{
  "success": false,
  "error": "Invalid inventory lot data",
  "code": "VALIDATION_ERROR",
  "details": {
    "validationErrors": [
      { "field": "part_id", "message": "Part ID is required" },
      { "field": "customer_id", "message": "Customer ID is required" },
      { "field": "original_quantity", "message": "Quantity must be greater than 0" }
    ]
  },
  "timestamp": "2025-08-29T10:30:00Z",
  "traceId": "req_abc123def456"
}
```

**HTTP Status Code Standards:**
```yaml
200: Success - Request completed successfully
201: Created - Resource created successfully
400: Bad Request - Invalid request data or parameters
401: Unauthorized - Authentication required or invalid
403: Forbidden - User lacks required permissions
404: Not Found - Resource does not exist
409: Conflict - Resource conflict (e.g., duplicate lot ID)
422: Unprocessable Entity - Validation errors
429: Too Many Requests - Rate limit exceeded
500: Internal Server Error - Server-side error
503: Service Unavailable - Service temporarily unavailable
```

---

## Frontend Architecture Modernization

### Current State Analysis

**Existing Frontend Architecture:**
- React Router v6 already implemented with protected routes
- React Query configured with proper retry logic and caching
- Context-based state management (AuthContext, AppContext)
- Tailwind CSS for styling with responsive design
- Error boundaries and loading states partially implemented
- Toast notifications configured with react-hot-toast

### Enhanced Frontend Architecture

**State Management Strategy (React Query + Zustand Hybrid):**

```typescript
// Enhanced State Architecture
interface ApplicationState {
  // Global application state (Zustand)
  ui: {
    sidebarOpen: boolean;
    theme: 'light' | 'dark';
    notifications: Notification[];
    activeModal: string | null;
    loadingStates: Record<string, boolean>;
  };
  
  // User session state (Zustand + React Query)
  auth: {
    isAuthenticated: boolean;
    user: User | null;
    permissions: string[];
    employee: EmployeeProfile | null;
  };
  
  // Navigation state (React Router + Zustand)
  navigation: {
    currentRoute: string;
    routeHistory: string[];
    breadcrumbs: Breadcrumb[];
  };
  
  // Real-time data sync state (Zustand)
  realtime: {
    connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
    subscriptions: Record<string, Subscription>;
    pendingUpdates: Update[];
  };
}

// Zustand store for UI and global state
const useAppStore = create<ApplicationState>((set, get) => ({
  ui: {
    sidebarOpen: false,
    theme: 'light',
    notifications: [],
    activeModal: null,
    loadingStates: {}
  },
  
  // Actions
  setSidebarOpen: (open: boolean) => 
    set(state => ({ ui: { ...state.ui, sidebarOpen: open } })),
    
  addNotification: (notification: Notification) =>
    set(state => ({ 
      ui: { 
        ...state.ui, 
        notifications: [...state.ui.notifications, notification] 
      } 
    })),
    
  setLoadingState: (key: string, loading: boolean) =>
    set(state => ({
      ui: {
        ...state.ui,
        loadingStates: { ...state.ui.loadingStates, [key]: loading }
      }
    }))
}));

// React Query for server state management
const useInventoryQuery = (options?: QueryOptions) => 
  useQuery({
    queryKey: ['inventory', 'lots', options],
    queryFn: () => apiClient.inventory.getAllLots(options),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    onError: (error) => {
      useAppStore.getState().addNotification({
        type: 'error',
        message: 'Failed to fetch inventory data',
        details: error.message
      });
    }
  });

const useInventoryMutation = () => 
  useMutation({
    mutationFn: (data: CreateLotRequest) => apiClient.inventory.createLot(data),
    onMutate: async (newLot) => {
      // Optimistic update
      await queryClient.cancelQueries(['inventory', 'lots']);
      const previousLots = queryClient.getQueryData(['inventory', 'lots']);
      
      queryClient.setQueryData(['inventory', 'lots'], (old: any) => ({
        ...old,
        data: [...old.data, { ...newLot, id: 'temp_' + Date.now() }]
      }));
      
      return { previousLots };
    },
    onError: (err, newLot, context) => {
      // Revert optimistic update
      queryClient.setQueryData(['inventory', 'lots'], context?.previousLots);
      useAppStore.getState().addNotification({
        type: 'error',
        message: 'Failed to create inventory lot'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      useAppStore.getState().addNotification({
        type: 'success',
        message: 'Inventory lot created successfully'
      });
    }
  });
```

**Enhanced Routing Architecture:**

```typescript
// Route configuration with lazy loading and error boundaries
const routeConfig = [
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <Login />,
    public: true
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
    preload: () => import('./components/pages/Dashboard'),
    permissions: ['warehouse_staff']
  },
  {
    path: '/inventory',
    element: <ProtectedRoute><Inventory /></ProtectedRoute>,
    preload: () => import('./components/pages/Inventory'),
    permissions: ['warehouse_staff']
  },
  {
    path: '/inventory/lot/:lotId',
    element: <ProtectedRoute><InventoryLotDetail /></ProtectedRoute>,
    preload: () => import('./components/pages/InventoryLotDetail'),
    permissions: ['warehouse_staff']
  },
  {
    path: '/preadmissions',
    element: <ProtectedRoute><PreAdmissions /></ProtectedRoute>,
    preload: () => import('./components/pages/PreAdmissions'),
    permissions: ['warehouse_staff']
  },
  {
    path: '/preadmissions/:id',
    element: <ProtectedRoute><PreadmissionDetail /></ProtectedRoute>,
    preload: () => import('./components/pages/PreadmissionDetail'),
    permissions: ['warehouse_staff']
  },
  {
    path: '/preshipments',
    element: <ProtectedRoute><PreShipments /></ProtectedRoute>,
    preload: () => import('./components/pages/PreShipments'),
    permissions: ['warehouse_staff']
  },
  {
    path: '/parts',
    element: <ProtectedRoute><Parts /></ProtectedRoute>,
    preload: () => import('./components/pages/Parts'),
    permissions: ['warehouse_staff']
  },
  {
    path: '/customers',
    element: <ProtectedRoute><Customers /></ProtectedRoute>,
    preload: () => import('./components/pages/Customers'),
    permissions: ['warehouse_staff']
  },
  {
    path: '/reports',
    element: <ProtectedRoute><Reports /></ProtectedRoute>,
    preload: () => import('./components/pages/Reports'),
    permissions: ['manager']
  },
  {
    path: '/admin',
    element: <ProtectedRoute><Admin /></ProtectedRoute>,
    preload: () => import('./components/pages/Admin'),
    permissions: ['admin']
  },
  {
    path: '*',
    element: <NotFound />
  }
];

// Enhanced route component with preloading
const AppRouter = () => {
  const { isAuthenticated, hasPermission } = useAuth();
  const navigate = useNavigate();
  
  // Preload routes on hover/focus
  const preloadRoute = useCallback((routePath: string) => {
    const route = routeConfig.find(r => r.path === routePath);
    if (route?.preload) {
      route.preload();
    }
  }, []);
  
  return (
    <Routes>
      {routeConfig.map(route => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <RouteErrorBoundary>
              <Suspense fallback={<RouteLoadingSpinner />}>
                {route.element}
              </Suspense>
            </RouteErrorBoundary>
          }
        />
      ))}
    </Routes>
  );
};
```

**Code Splitting Strategy:**

```typescript
// Lazy loading with proper error handling
const Dashboard = lazy(() => 
  import('./components/pages/Dashboard').catch(error => ({
    default: () => <LoadError error={error} retry={() => window.location.reload()} />
  }))
);

const Inventory = lazy(() => 
  import('./components/pages/Inventory').catch(error => ({
    default: () => <LoadError error={error} retry={() => window.location.reload()} />
  }))
);

// Component-level code splitting
const InventoryLotModal = lazy(() => import('./components/modals/InventoryLotModal'));
const CustomerModal = lazy(() => import('./components/modals/CustomerModal'));
const ReportGenerator = lazy(() => import('./components/reports/ReportGenerator'));

// Dynamic imports for heavy components
const useHeavyComponent = (shouldLoad: boolean) => {
  const [Component, setComponent] = useState(null);
  
  useEffect(() => {
    if (shouldLoad && !Component) {
      import('./components/heavy/HeavyComponent').then(module => {
        setComponent(() => module.default);
      });
    }
  }, [shouldLoad, Component]);
  
  return Component;
};
```

**Enhanced Error Boundary System:**

```typescript
// Application-level error boundary
class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }
  
  static getDerivedStateFromError(error) {
    return { 
      hasError: true, 
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }
  
  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });
    
    // Log error to monitoring service
    errorReportingService.reportError({
      error,
      errorInfo,
      errorId: this.state.errorId,
      userId: this.props.user?.id,
      route: window.location.pathname,
      timestamp: new Date().toISOString()
    });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <ErrorDisplay
          error={this.state.error}
          errorId={this.state.errorId}
          onRetry={() => window.location.reload()}
          onReport={() => this.reportIssue()}
        />
      );
    }
    
    return this.props.children;
  }
}

// Route-specific error boundaries
const RouteErrorBoundary = ({ children }) => (
  <ErrorBoundary
    FallbackComponent={RouteErrorFallback}
    onError={(error, errorInfo) => {
      console.error('Route error:', error, errorInfo);
      useAppStore.getState().addNotification({
        type: 'error',
        message: 'Page failed to load',
        persistent: true
      });
    }}
  >
    {children}
  </ErrorBoundary>
);

// Component-specific error boundaries  
const ComponentErrorBoundary = ({ children, componentName }) => (
  <ErrorBoundary
    FallbackComponent={({ error, resetErrorBoundary }) => (
      <div className="border border-red-200 rounded-lg p-4 bg-red-50">
        <h3 className="text-red-800 font-medium">Component Error</h3>
        <p className="text-red-600 text-sm mt-1">
          The {componentName} component failed to load.
        </p>
        <button 
          onClick={resetErrorBoundary}
          className="mt-2 text-sm text-red-700 underline"
        >
          Try again
        </button>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);
```

**Loading State Management:**

```typescript
// Comprehensive loading state system
const useLoadingState = () => {
  const { setLoadingState } = useAppStore();
  
  const withLoading = useCallback(async (key: string, asyncFunction: () => Promise<any>) => {
    setLoadingState(key, true);
    try {
      return await asyncFunction();
    } finally {
      setLoadingState(key, false);
    }
  }, [setLoadingState]);
  
  return { withLoading };
};

// Loading UI components
const GlobalLoadingOverlay = () => {
  const loadingStates = useAppStore(state => state.ui.loadingStates);
  const isGlobalLoading = Object.values(loadingStates).some(Boolean);
  
  if (!isGlobalLoading) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <LoadingSpinner size="large" />
        <p className="mt-2 text-gray-600">Processing...</p>
      </div>
    </div>
  );
};

const InlineLoadingState = ({ isLoading, children, skeleton = null }) => {
  if (isLoading) {
    return skeleton || <LoadingSpinner />;
  }
  return children;
};

// Skeleton loading components
const InventoryTableSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex space-x-4 mb-3">
        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/5"></div>
        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
        <div className="h-4 bg-gray-200 rounded w-1/8"></div>
      </div>
    ))}
  </div>
);
```

### Real-Time Integration Architecture

**WebSocket Connection Management:**

```typescript
// Real-time connection service
class RealtimeService {
  private connection: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private subscriptions = new Map<string, Function[]>();
  
  constructor(private token: string) {
    this.connect();
  }
  
  private connect() {
    try {
      this.connection = new WebSocket(`wss://api.icrs-sparc.com/realtime?token=${this.token}`);
      
      this.connection.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        useAppStore.getState().setConnectionStatus('connected');
      };
      
      this.connection.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      this.connection.onclose = () => {
        console.log('WebSocket disconnected');
        useAppStore.getState().setConnectionStatus('disconnected');
        this.attemptReconnect();
      };
      
      this.connection.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      this.attemptReconnect();
    }
  }
  
  private handleMessage(message: any) {
    const { event, payload } = message;
    const callbacks = this.subscriptions.get(event) || [];
    
    callbacks.forEach(callback => {
      try {
        callback(payload);
      } catch (error) {
        console.error(`Error in ${event} callback:`, error);
      }
    });
  }
  
  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      useAppStore.getState().setConnectionStatus('reconnecting');
      
      setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1));
    }
  }
  
  subscribe(event: string, callback: Function) {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, []);
    }
    this.subscriptions.get(event)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }
  
  disconnect() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    this.subscriptions.clear();
  }
}

// React hook for real-time subscriptions
const useRealtimeSubscription = (event: string, callback: Function, deps: any[] = []) => {
  const realtimeService = useContext(RealtimeContext);
  
  useEffect(() => {
    if (!realtimeService) return;
    
    const unsubscribe = realtimeService.subscribe(event, callback);
    return unsubscribe;
  }, [event, callback, realtimeService, ...deps]);
};

// Usage example
const InventoryDashboard = () => {
  const { data: inventory, refetch } = useInventoryQuery();
  
  useRealtimeSubscription('inventory.lot.updated', (payload) => {
    // Optimistically update the inventory data
    queryClient.setQueryData(['inventory', 'lots'], (old: any) => {
      if (!old?.data) return old;
      
      return {
        ...old,
        data: old.data.map(lot => 
          lot.id === payload.lot_id 
            ? { ...lot, ...payload.changes }
            : lot
        )
      };
    });
    
    // Show notification
    toast.success(`Lot ${payload.lot_id} updated`);
  }, []);
  
  useRealtimeSubscription('inventory.lot.created', (payload) => {
    // Add new lot to the list
    queryClient.setQueryData(['inventory', 'lots'], (old: any) => ({
      ...old,
      data: [payload.lot_data, ...(old?.data || [])]
    }));
    
    toast.success('New inventory lot added');
  }, []);
  
  return (
    // Component JSX
  );
};
```

---

## Database Architecture and Migration Strategy

### Current Supabase Schema Analysis

**Existing Database Architecture:**
- Supabase PostgreSQL with Row Level Security (RLS) policies
- Transaction-based inventory quantity calculations
- Comprehensive audit trails with created_at/updated_at fields
- Real-time subscriptions for live data updates
- Foreign key relationships maintaining data integrity

**Core Tables Structure:**

```sql
-- Users and Authentication (Supabase Auth + Profiles)
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_number VARCHAR(50) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'warehouse_staff',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Management
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE,
  address JSONB,
  contact_info JSONB,
  bond_number VARCHAR(100),
  ftz_operator_id VARCHAR(100),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Parts Catalog with HTS Codes
CREATE TABLE parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  part_number VARCHAR(100),
  material VARCHAR(255),
  hts_code VARCHAR(20),
  unit_of_measure VARCHAR(50),
  country_of_origin VARCHAR(3),
  standard_value DECIMAL(12,2),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Storage Locations
CREATE TABLE storage_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  zone VARCHAR(50),
  aisle VARCHAR(20),
  rack VARCHAR(20),
  shelf VARCHAR(20),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Lots (Core FTZ Management)
CREATE TABLE inventory_lots (
  id VARCHAR(50) PRIMARY KEY, -- Custom lot ID format
  part_id uuid REFERENCES parts(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) NOT NULL,
  storage_location_id uuid REFERENCES storage_locations(id),
  status VARCHAR(50) NOT NULL DEFAULT 'In Stock',
  original_quantity INTEGER NOT NULL,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  admission_date TIMESTAMPTZ,
  manifest_number VARCHAR(100),
  e214_admission_number VARCHAR(100),
  conveyance_name VARCHAR(255),
  import_date DATE,
  port_of_unlading VARCHAR(100),
  bill_of_lading VARCHAR(100),
  total_value DECIMAL(12,2) DEFAULT 0,
  total_charges DECIMAL(12,2) DEFAULT 0,
  voided BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Transaction History (Audit Trail for Quantities)
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id VARCHAR(50) REFERENCES inventory_lots(id) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'Admission', 'Shipment', 'Adjustment', 'Removal'
  quantity INTEGER NOT NULL, -- Positive for receipts, negative for shipments
  source_document_number VARCHAR(255),
  reference_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by uuid REFERENCES auth.users(id)
);

-- Preadmissions (FTZ Admission Workflow)
CREATE TABLE preadmissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) NOT NULL,
  part_id uuid REFERENCES parts(id) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  quantity INTEGER NOT NULL,
  estimated_admission_date DATE,
  manifest_number VARCHAR(100),
  conveyance_name VARCHAR(255),
  import_date DATE,
  port_of_unlading VARCHAR(100),
  bill_of_lading VARCHAR(100),
  total_value DECIMAL(12,2),
  notes TEXT,
  processed_to_lot_id VARCHAR(50) REFERENCES inventory_lots(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Preshipments (FTZ Withdrawal Workflow)
CREATE TABLE preshipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  shipment_date DATE,
  destination JSONB,
  total_value DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Preshipment Items (Line Items)
CREATE TABLE preshipment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preshipment_id uuid REFERENCES preshipments(id) NOT NULL,
  lot_id VARCHAR(50) REFERENCES inventory_lots(id) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_value DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entry Summaries (Customs Declarations)
CREATE TABLE entry_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) NOT NULL,
  entry_number VARCHAR(100),
  entry_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'Draft',
  total_value DECIMAL(12,2),
  total_duty DECIMAL(12,2),
  total_taxes DECIMAL(12,2),
  cbp_form_data JSONB,
  ace_submission_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Entry Summary Line Items
CREATE TABLE entry_summary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_summary_id uuid REFERENCES entry_summaries(id) NOT NULL,
  lot_id VARCHAR(50) REFERENCES inventory_lots(id) NOT NULL,
  hts_code VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_of_measure VARCHAR(50),
  unit_value DECIMAL(12,2),
  total_value DECIMAL(12,2),
  duty_rate DECIMAL(8,4),
  duty_amount DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Permissions
CREATE TABLE user_page_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  page_name VARCHAR(100) NOT NULL,
  permission_level VARCHAR(50) NOT NULL, -- 'read', 'write', 'admin'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  reason TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Database Migration and Enhancement Plan

**Phase 1: Schema Validation and Optimization**

```sql
-- Migration 001: Add missing indexes for performance
CREATE INDEX CONCURRENTLY idx_inventory_lots_customer_id 
  ON inventory_lots(customer_id) WHERE active = true;

CREATE INDEX CONCURRENTLY idx_inventory_lots_part_id 
  ON inventory_lots(part_id) WHERE active = true;

CREATE INDEX CONCURRENTLY idx_inventory_lots_status 
  ON inventory_lots(status) WHERE active = true;

CREATE INDEX CONCURRENTLY idx_transactions_lot_id_created_at 
  ON transactions(lot_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_preadmissions_customer_status 
  ON preadmissions(customer_id, status);

CREATE INDEX CONCURRENTLY idx_preshipments_customer_status 
  ON preshipments(customer_id, status);

-- Migration 002: Add computed columns for performance
ALTER TABLE inventory_lots 
  ADD COLUMN computed_current_quantity INTEGER;

-- Create function to calculate current quantity from transactions
CREATE OR REPLACE FUNCTION calculate_lot_quantity(lot_id_param VARCHAR(50))
RETURNS INTEGER AS $$
DECLARE
  total_received INTEGER;
  total_shipped INTEGER;
BEGIN
  SELECT 
    COALESCE(SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN quantity < 0 THEN ABS(quantity) ELSE 0 END), 0)
  INTO total_received, total_shipped
  FROM transactions
  WHERE lot_id = lot_id_param;
  
  RETURN total_received - total_shipped;
END;
$$ LANGUAGE plpgsql;

-- Migration 003: Add full-text search capabilities
ALTER TABLE parts ADD COLUMN search_vector tsvector;

CREATE INDEX CONCURRENTLY idx_parts_search 
  ON parts USING gin(search_vector);

-- Trigger to maintain search vector
CREATE OR REPLACE FUNCTION update_parts_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.part_number, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.material, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.hts_code, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parts_search_vector_update
  BEFORE INSERT OR UPDATE ON parts
  FOR EACH ROW EXECUTE FUNCTION update_parts_search_vector();

-- Migration 004: Enhanced Row Level Security policies
-- Customer data isolation
CREATE POLICY customer_isolation ON customers
  FOR ALL TO authenticated
  USING (
    -- Admin and managers can see all customers
    EXISTS (
      SELECT 1 FROM employees e 
      WHERE e.user_id = auth.uid() 
      AND e.role IN ('admin', 'manager')
      AND e.active = true
    )
    OR
    -- Warehouse staff can only see customers they have permissions for
    EXISTS (
      SELECT 1 FROM user_page_permissions upp
      WHERE upp.user_id = auth.uid()
      AND upp.page_name = 'customers'
      AND upp.is_active = true
    )
  );

-- Inventory lot access control
CREATE POLICY inventory_lot_access ON inventory_lots
  FOR ALL TO authenticated
  USING (
    -- Admin can see all lots
    EXISTS (
      SELECT 1 FROM employees e 
      WHERE e.user_id = auth.uid() 
      AND e.role = 'admin'
      AND e.active = true
    )
    OR
    -- Others can see lots for customers they have access to
    customer_id IN (
      SELECT c.id FROM customers c
      WHERE (
        -- Manager can see all customers
        EXISTS (
          SELECT 1 FROM employees e 
          WHERE e.user_id = auth.uid() 
          AND e.role IN ('admin', 'manager')
          AND e.active = true
        )
        OR
        -- Customer-specific access
        EXISTS (
          SELECT 1 FROM user_page_permissions upp
          WHERE upp.user_id = auth.uid()
          AND upp.page_name = 'customers'
          AND upp.is_active = true
        )
      )
    )
  );
```

**Phase 2: Data Migration and Validation**

```sql
-- Migration 005: Data migration from legacy system (if applicable)
-- This would be customized based on existing data structure

-- Validate data integrity
CREATE OR REPLACE FUNCTION validate_inventory_integrity()
RETURNS TABLE(
  lot_id VARCHAR(50),
  calculated_quantity INTEGER,
  stored_quantity INTEGER,
  difference INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    il.id,
    calculate_lot_quantity(il.id) as calc_qty,
    il.current_quantity as stored_qty,
    (calculate_lot_quantity(il.id) - il.current_quantity) as diff
  FROM inventory_lots il
  WHERE calculate_lot_quantity(il.id) != il.current_quantity;
END;
$$ LANGUAGE plpgsql;

-- Migration 006: Performance optimization functions
CREATE OR REPLACE FUNCTION get_inventory_summary()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_lots', COUNT(*),
    'active_lots', COUNT(*) FILTER (WHERE status NOT IN ('Depleted', 'Voided')),
    'total_quantity', SUM(current_quantity),
    'total_value', SUM(total_value),
    'customers_with_inventory', COUNT(DISTINCT customer_id),
    'parts_in_stock', COUNT(DISTINCT part_id),
    'by_status', json_object_agg(status, status_count)
  ) INTO result
  FROM inventory_lots il
  LEFT JOIN LATERAL (
    SELECT status, COUNT(*) as status_count
    FROM inventory_lots il2
    WHERE il2.status = il.status
    GROUP BY status
  ) status_counts ON true
  WHERE il.active = true;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Migration 007: Real-time trigger functions
CREATE OR REPLACE FUNCTION notify_inventory_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify connected clients about inventory changes
  PERFORM pg_notify(
    'inventory_change',
    json_build_object(
      'operation', TG_OP,
      'lot_id', COALESCE(NEW.id, OLD.id),
      'customer_id', COALESCE(NEW.customer_id, OLD.customer_id),
      'changes', CASE 
        WHEN TG_OP = 'UPDATE' THEN 
          json_build_object(
            'status', CASE WHEN OLD.status != NEW.status THEN json_build_object('old', OLD.status, 'new', NEW.status) END,
            'quantity', CASE WHEN OLD.current_quantity != NEW.current_quantity THEN json_build_object('old', OLD.current_quantity, 'new', NEW.current_quantity) END
          )
        ELSE NULL
      END,
      'timestamp', NOW()
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_change_notify
  AFTER INSERT OR UPDATE OR DELETE ON inventory_lots
  FOR EACH ROW EXECUTE FUNCTION notify_inventory_change();

CREATE TRIGGER transaction_change_notify
  AFTER INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION notify_inventory_change();
```

### Performance Optimization Strategy

**Query Optimization:**

```sql
-- Optimized queries for common operations
-- Dashboard metrics query
CREATE OR REPLACE VIEW dashboard_metrics AS
SELECT 
  COUNT(*) as total_lots,
  COUNT(*) FILTER (WHERE current_quantity > 0) as active_lots,
  SUM(current_quantity) as total_quantity,
  SUM(total_value) as total_value,
  COUNT(DISTINCT customer_id) as active_customers,
  COUNT(DISTINCT part_id) as parts_in_inventory,
  AVG(current_quantity) as avg_lot_size
FROM inventory_lots
WHERE active = true AND NOT voided;

-- Inventory search with full-text search
CREATE OR REPLACE FUNCTION search_inventory(
  search_term TEXT DEFAULT NULL,
  customer_filter UUID DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id VARCHAR(50),
  part_description TEXT,
  customer_name VARCHAR(255),
  current_quantity INTEGER,
  status VARCHAR(50),
  admission_date TIMESTAMPTZ,
  location_code VARCHAR(50),
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    il.id,
    p.description,
    c.name,
    il.current_quantity,
    il.status,
    il.admission_date,
    sl.location_code,
    CASE 
      WHEN search_term IS NOT NULL THEN 
        ts_rank(p.search_vector, plainto_tsquery('english', search_term))
      ELSE 0
    END as rank
  FROM inventory_lots il
  JOIN parts p ON il.part_id = p.id
  JOIN customers c ON il.customer_id = c.id
  LEFT JOIN storage_locations sl ON il.storage_location_id = sl.id
  WHERE 
    il.active = true 
    AND NOT il.voided
    AND (search_term IS NULL OR p.search_vector @@ plainto_tsquery('english', search_term))
    AND (customer_filter IS NULL OR il.customer_id = customer_filter)
    AND (status_filter IS NULL OR il.status = status_filter)
  ORDER BY 
    CASE WHEN search_term IS NOT NULL THEN rank END DESC,
    il.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Batch operations for better performance
CREATE OR REPLACE FUNCTION batch_update_lot_quantities(
  lot_updates JSON
)
RETURNS JSON AS $$
DECLARE
  update_record RECORD;
  results JSON[] := '{}';
  success_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  FOR update_record IN 
    SELECT * FROM json_to_recordset(lot_updates) AS x(
      lot_id VARCHAR(50), 
      new_quantity INTEGER, 
      reason TEXT,
      user_id UUID
    )
  LOOP
    BEGIN
      -- Update lot quantity
      UPDATE inventory_lots 
      SET 
        current_quantity = update_record.new_quantity,
        updated_at = NOW(),
        updated_by = update_record.user_id
      WHERE id = update_record.lot_id;
      
      -- Add transaction record
      INSERT INTO transactions (lot_id, type, quantity, source_document_number, created_by)
      VALUES (
        update_record.lot_id,
        'Bulk Adjustment',
        update_record.new_quantity - (SELECT current_quantity FROM inventory_lots WHERE id = update_record.lot_id),
        update_record.reason,
        update_record.user_id
      );
      
      success_count := success_count + 1;
      results := results || json_build_object('lot_id', update_record.lot_id, 'status', 'success');
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      results := results || json_build_object('lot_id', update_record.lot_id, 'status', 'error', 'message', SQLERRM);
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success_count', success_count,
    'error_count', error_count,
    'results', results
  );
END;
$$ LANGUAGE plpgsql;
```

---

## Integration Architecture and Patterns

### Service-to-Service Communication

**Inter-Service Communication Patterns:**

```typescript
// Service dependency injection and communication
class ServiceRegistry {
  private services: Map<string, any> = new Map();
  
  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }
  
  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service;
  }
}

// Enhanced BaseService with cross-service communication
abstract class EnhancedBaseService<T = any> extends BaseService<T> {
  protected serviceRegistry: ServiceRegistry;
  protected eventEmitter: EventEmitter;
  
  constructor(tableName: string, serviceRegistry: ServiceRegistry, eventEmitter: EventEmitter) {
    super(tableName);
    this.serviceRegistry = serviceRegistry;
    this.eventEmitter = eventEmitter;
  }
  
  // Cross-service method calls with error handling
  protected async callService<U>(
    serviceName: string, 
    methodName: string, 
    ...args: any[]
  ): Promise<BaseServiceResponse<U>> {
    try {
      const service = this.serviceRegistry.get(serviceName);
      const method = service[methodName];
      
      if (typeof method !== 'function') {
        throw new Error(`Method ${methodName} not found on service ${serviceName}`);
      }
      
      const result = await method.apply(service, args);
      return result;
    } catch (error) {
      console.error(`Error calling ${serviceName}.${methodName}:`, error);
      return this.createResponse(false, null, error.message);
    }
  }
  
  // Event-based communication
  protected emitEvent(eventName: string, payload: any): void {
    this.eventEmitter.emit(eventName, {
      service: this.constructor.name,
      timestamp: new Date().toISOString(),
      ...payload
    });
  }
  
  protected subscribeToEvent(eventName: string, handler: Function): void {
    this.eventEmitter.on(eventName, handler);
  }
}

// Service orchestration example
class PreadmissionService extends EnhancedBaseService<Preadmission> {
  constructor(serviceRegistry: ServiceRegistry, eventEmitter: EventEmitter) {
    super('preadmissions', serviceRegistry, eventEmitter);
  }
  
  async processToAdmission(preadmissionId: string, options: ServiceOptions = {}): Promise<BaseServiceResponse<InventoryLot>> {
    try {
      // 1. Get preadmission data
      const preadmissionResult = await this.getById(preadmissionId, options);
      if (!preadmissionResult.success) {
        return preadmissionResult;
      }
      
      const preadmission = preadmissionResult.data;
      
      // 2. Validate part exists
      const partResult = await this.callService<Part>('PartService', 'getById', preadmission.part_id, options);
      if (!partResult.success) {
        return this.createResponse(false, null, 'Part not found');
      }
      
      // 3. Validate customer exists  
      const customerResult = await this.callService<Customer>('CustomerService', 'getById', preadmission.customer_id, options);
      if (!customerResult.success) {
        return this.createResponse(false, null, 'Customer not found');
      }
      
      // 4. Create inventory lot
      const lotData: CreateLotRequest = {
        part_id: preadmission.part_id,
        customer_id: preadmission.customer_id,
        original_quantity: preadmission.quantity,
        admission_date: new Date().toISOString(),
        manifest_number: preadmission.manifest_number,
        conveyance_name: preadmission.conveyance_name,
        import_date: preadmission.import_date,
        port_of_unlading: preadmission.port_of_unlading,
        bill_of_lading: preadmission.bill_of_lading,
        total_value: preadmission.total_value
      };
      
      const inventoryResult = await this.callService<InventoryLot>('InventoryService', 'createLot', lotData, options);
      if (!inventoryResult.success) {
        return inventoryResult;
      }
      
      // 5. Update preadmission status
      const updateResult = await this.update(preadmissionId, {
        status: 'Processed',
        processed_to_lot_id: inventoryResult.data.id
      }, options);
      
      if (!updateResult.success) {
        // Rollback inventory lot creation
        await this.callService('InventoryService', 'delete', inventoryResult.data.id, options);
        return updateResult;
      }
      
      // 6. Emit events for other services
      this.emitEvent('preadmission.processed', {
        preadmission_id: preadmissionId,
        lot_id: inventoryResult.data.id,
        customer_id: preadmission.customer_id,
        part_id: preadmission.part_id,
        quantity: preadmission.quantity
      });
      
      return inventoryResult;
      
    } catch (error) {
      console.error('Error processing preadmission to admission:', error);
      return this.createResponse(false, null, error.message);
    }
  }
}

// Cross-service event handlers
class DashboardService extends EnhancedBaseService {
  constructor(serviceRegistry: ServiceRegistry, eventEmitter: EventEmitter) {
    super('dashboard_metrics', serviceRegistry, eventEmitter);
    
    // Subscribe to inventory events for real-time dashboard updates
    this.subscribeToEvent('inventory.lot.created', this.handleInventoryChange.bind(this));
    this.subscribeToEvent('inventory.lot.updated', this.handleInventoryChange.bind(this));
    this.subscribeToEvent('preadmission.processed', this.handlePreadmissionProcessed.bind(this));
  }
  
  private async handleInventoryChange(event: any): Promise<void> {
    try {
      // Invalidate cached dashboard metrics
      await this.invalidateMetricsCache();
      
      // Emit real-time update to connected clients
      this.emitEvent('dashboard.metrics.updated', {
        trigger: event,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error handling inventory change in dashboard:', error);
    }
  }
  
  private async handlePreadmissionProcessed(event: any): Promise<void> {
    try {
      // Update operational metrics
      await this.updateOperationalMetrics('preadmissions_processed', 1);
      
      // Emit notification for operations team
      this.emitEvent('notification.operational', {
        type: 'preadmission_processed',
        message: `Preadmission ${event.preadmission_id} processed to lot ${event.lot_id}`,
        recipients: ['operations_team'],
        priority: 'normal'
      });
    } catch (error) {
      console.error('Error handling preadmission processed event:', error);
    }
  }
}
```

### Error Propagation and Handling

**Comprehensive Error Handling Strategy:**

```typescript
// Error classification system
enum ErrorCategory {
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic', 
  DATABASE = 'database',
  EXTERNAL_SERVICE = 'external_service',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  SYSTEM = 'system'
}

enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface ServiceError {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context?: any;
  stack?: string;
  timestamp: string;
  service: string;
  method: string;
}

// Enhanced error handling in BaseService
abstract class ErrorAwareBaseService<T = any> extends EnhancedBaseService<T> {
  protected async executeWithErrorHandling<U>(
    operation: string,
    asyncOperation: () => Promise<U>,
    context?: any
  ): Promise<BaseServiceResponse<U>> {
    const startTime = Date.now();
    
    try {
      const result = await asyncOperation();
      
      // Log successful operation
      this.logOperation(operation, 'success', Date.now() - startTime, context);
      
      return this.createResponse(true, result);
      
    } catch (error) {
      // Classify and handle error
      const serviceError = this.classifyError(error, operation, context);
      
      // Log error
      this.logError(serviceError, Date.now() - startTime);
      
      // Emit error event for monitoring
      this.emitEvent('service.error', serviceError);
      
      // Handle based on severity
      await this.handleErrorBySeverity(serviceError);
      
      return this.createResponse(false, null, serviceError.message);
    }
  }
  
  private classifyError(error: any, operation: string, context?: any): ServiceError {
    let category = ErrorCategory.SYSTEM;
    let severity = ErrorSeverity.MEDIUM;
    let code = 'UNKNOWN_ERROR';
    
    // Database errors
    if (error.code && error.code.startsWith('23')) { // PostgreSQL constraint violations
      category = ErrorCategory.DATABASE;
      if (error.code === '23505') { // Unique violation
        code = 'DUPLICATE_ENTRY';
        severity = ErrorSeverity.LOW;
      } else if (error.code === '23503') { // Foreign key violation
        code = 'REFERENCE_ERROR';
        severity = ErrorSeverity.MEDIUM;
      }
    }
    
    // Validation errors
    if (error.message.includes('required') || error.message.includes('invalid')) {
      category = ErrorCategory.VALIDATION;
      severity = ErrorSeverity.LOW;
      code = 'VALIDATION_ERROR';
    }
    
    // Authentication/Authorization errors
    if (error.message.includes('unauthorized') || error.message.includes('permission')) {
      category = ErrorCategory.AUTHORIZATION;
      severity = ErrorSeverity.HIGH;
      code = 'ACCESS_DENIED';
    }
    
    return {
      code,
      message: error.message || 'An unknown error occurred',
      category,
      severity,
      context,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      service: this.constructor.name,
      method: operation
    };
  }
  
  private async handleErrorBySeverity(error: ServiceError): Promise<void> {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        // Immediate notification to operations team
        await this.sendCriticalAlert(error);
        break;
        
      case ErrorSeverity.HIGH:
        // Log to error tracking service
        await this.reportToErrorTracking(error);
        break;
        
      case ErrorSeverity.MEDIUM:
        // Standard error logging
        console.error('Service error:', error);
        break;
        
      case ErrorSeverity.LOW:
        // Debug logging only
        console.debug('Minor service error:', error);
        break;
    }
  }
  
  private logOperation(operation: string, status: string, duration: number, context?: any): void {
    console.log(`Service operation: ${this.constructor.name}.${operation}`, {
      status,
      duration_ms: duration,
      context,
      timestamp: new Date().toISOString()
    });
  }
  
  private logError(error: ServiceError, duration: number): void {
    console.error(`Service error: ${error.service}.${error.method}`, {
      ...error,
      duration_ms: duration
    });
  }
  
  private async sendCriticalAlert(error: ServiceError): Promise<void> {
    // Implementation would integrate with alerting system
    // For now, log critical error
    console.error('CRITICAL ERROR:', error);
    
    // Emit high-priority event
    this.emitEvent('alert.critical', {
      error,
      requires_immediate_attention: true
    });
  }
  
  private async reportToErrorTracking(error: ServiceError): Promise<void> {
    // Implementation would integrate with error tracking service (e.g., Sentry)
    console.error('High severity error reported:', error);
  }
}

// Usage in specialized services
class InventoryService extends ErrorAwareBaseService<InventoryLot> {
  async createLot(lotData: CreateLotRequest, options: ServiceOptions = {}): Promise<BaseServiceResponse<InventoryLot>> {
    return this.executeWithErrorHandling(
      'createLot',
      async () => {
        // Validation
        const validation = this.validateRequired(lotData, ['part_id', 'customer_id', 'original_quantity']);
        if (!validation.success) {
          throw new Error(validation.error);
        }
        
        // Business logic validation
        if (lotData.original_quantity <= 0) {
          throw new Error('Quantity must be greater than zero');
        }
        
        // Check if part exists
        const partResult = await this.callService<Part>('PartService', 'getById', lotData.part_id, options);
        if (!partResult.success) {
          throw new Error(`Part ${lotData.part_id} not found`);
        }
        
        // Check if customer exists
        const customerResult = await this.callService<Customer>('CustomerService', 'getById', lotData.customer_id, options);
        if (!customerResult.success) {
          throw new Error(`Customer ${lotData.customer_id} not found`);
        }
        
        // Create lot (this would call the actual database operation)
        const result = await this.performLotCreation(lotData, options);
        
        // Emit success event
        this.emitEvent('inventory.lot.created', {
          lot: result,
          created_by: options.userId
        });
        
        return result;
      },
      { lotData, options }
    );
  }
  
  private async performLotCreation(lotData: CreateLotRequest, options: ServiceOptions): Promise<InventoryLot> {
    // Actual database operation would go here
    // This is a placeholder for the real implementation
    const lotNumber = `L-${Date.now()}`;
    
    const lotRecord = {
      id: lotNumber,
      part_id: lotData.part_id,
      customer_id: lotData.customer_id,
      status: lotData.status || 'In Stock',
      original_quantity: parseInt(lotData.original_quantity.toString()),
      current_quantity: parseInt(lotData.original_quantity.toString()),
      admission_date: lotData.admission_date || new Date().toISOString(),
      manifest_number: lotData.manifest_number,
      conveyance_name: lotData.conveyance_name,
      import_date: lotData.import_date,
      port_of_unlading: lotData.port_of_unlading,
      bill_of_lading: lotData.bill_of_lading,
      total_value: parseFloat(lotData.total_value?.toString() || '0'),
      total_charges: parseFloat(lotData.total_charges?.toString() || '0')
    };
    
    // Simulate database insert
    const result = await DatabaseService.insert('inventory_lots', [lotRecord], options);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create inventory lot');
    }
    
    return result.data[0];
  }
}
```

### Monitoring and Observability

**Comprehensive Monitoring Strategy:**

```typescript
// Monitoring service integration
interface MetricData {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp?: string;
}

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  service: string;
  operation?: string;
  duration?: number;
  context?: any;
  timestamp: string;
  traceId?: string;
  userId?: string;
}

class MonitoringService {
  private metrics: MetricData[] = [];
  private logs: LogEntry[] = [];
  
  recordMetric(metric: MetricData): void {
    this.metrics.push({
      ...metric,
      timestamp: metric.timestamp || new Date().toISOString()
    });
    
    // Send to monitoring system (Prometheus, DataDog, etc.)
    this.sendMetricToMonitoring(metric);
  }
  
  log(entry: LogEntry): void {
    this.logs.push({
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString()
    });
    
    // Send to logging system
    this.sendLogToSystem(entry);
    
    // Console output for development
    const logMethod = console[entry.level] || console.log;
    logMethod(`[${entry.service}] ${entry.message}`, entry.context);
  }
  
  private sendMetricToMonitoring(metric: MetricData): void {
    // Implementation would integrate with actual monitoring service
    console.log('Metric recorded:', metric);
  }
  
  private sendLogToSystem(entry: LogEntry): void {
    // Implementation would integrate with logging service
    console.log('Log entry:', entry);
  }
  
  getMetrics(namePattern?: string): MetricData[] {
    if (!namePattern) return this.metrics;
    return this.metrics.filter(m => m.name.includes(namePattern));
  }
  
  getLogs(service?: string, level?: string): LogEntry[] {
    return this.logs.filter(entry => 
      (!service || entry.service === service) &&
      (!level || entry.level === level)
    );
  }
}

// Enhanced BaseService with monitoring
abstract class MonitoredBaseService<T = any> extends ErrorAwareBaseService<T> {
  protected monitoring: MonitoringService;
  
  constructor(
    tableName: string, 
    serviceRegistry: ServiceRegistry, 
    eventEmitter: EventEmitter,
    monitoring: MonitoringService
  ) {
    super(tableName, serviceRegistry, eventEmitter);
    this.monitoring = monitoring;
  }
  
  protected async executeWithMonitoring<U>(
    operation: string,
    asyncOperation: () => Promise<U>,
    context?: any
  ): Promise<BaseServiceResponse<U>> {
    const startTime = Date.now();
    const traceId = this.generateTraceId();
    
    // Log operation start
    this.monitoring.log({
      level: 'info',
      message: `Starting operation: ${operation}`,
      service: this.constructor.name,
      operation,
      context,
      traceId
    });
    
    // Record operation started metric
    this.monitoring.recordMetric({
      name: 'service_operation_started',
      value: 1,
      labels: {
        service: this.constructor.name,
        operation,
      }
    });
    
    try {
      const result = await asyncOperation();
      const duration = Date.now() - startTime;
      
      // Log success
      this.monitoring.log({
        level: 'info',
        message: `Operation completed successfully: ${operation}`,
        service: this.constructor.name,
        operation,
        duration,
        traceId
      });
      
      // Record success metrics
      this.monitoring.recordMetric({
        name: 'service_operation_completed',
        value: 1,
        labels: {
          service: this.constructor.name,
          operation,
          status: 'success'
        }
      });
      
      this.monitoring.recordMetric({
        name: 'service_operation_duration',
        value: duration,
        labels: {
          service: this.constructor.name,
          operation
        }
      });
      
      return this.createResponse(true, result);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error
      this.monitoring.log({
        level: 'error',
        message: `Operation failed: ${operation} - ${error.message}`,
        service: this.constructor.name,
        operation,
        duration,
        context: { error: error.message, stack: error.stack },
        traceId
      });
      
      // Record error metrics
      this.monitoring.recordMetric({
        name: 'service_operation_completed',
        value: 1,
        labels: {
          service: this.constructor.name,
          operation,
          status: 'error'
        }
      });
      
      this.monitoring.recordMetric({
        name: 'service_error_count',
        value: 1,
        labels: {
          service: this.constructor.name,
          operation,
          error_type: error.constructor.name
        }
      });
      
      return this.createResponse(false, null, error.message);
    }
  }
  
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Health check endpoints
class HealthCheckService {
  constructor(private serviceRegistry: ServiceRegistry, private monitoring: MonitoringService) {}
  
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, any>;
    timestamp: string;
  }> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkExternalServices(),
      this.checkMemoryUsage(),
      this.checkServiceRegistry()
    ]);
    
    const results = {
      database: checks[0],
      external_services: checks[1], 
      memory: checks[2],
      service_registry: checks[3]
    };
    
    const hasFailures = checks.some(check => check.status === 'rejected');
    const hasWarnings = Object.values(results).some((result: any) => 
      result.status === 'fulfilled' && result.value?.status === 'warning'
    );
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (hasFailures) {
      overallStatus = 'unhealthy';
    } else if (hasWarnings) {
      overallStatus = 'degraded';
    }
    
    return {
      status: overallStatus,
      services: results,
      timestamp: new Date().toISOString()
    };
  }
  
  private async checkDatabase(): Promise<{ status: string; details?: any }> {
    try {
      // Test database connection
      const result = await DatabaseService.raw('SELECT 1 as health_check');
      return { 
        status: 'healthy',
        details: { connection: 'active', query_time: result.duration }
      };
    } catch (error) {
      return { 
        status: 'unhealthy',
        details: { error: error.message }
      };
    }
  }
  
  private async checkExternalServices(): Promise<{ status: string; details?: any }> {
    // Check external service health (CBP API, etc.)
    const services = [];
    let allHealthy = true;
    
    try {
      // Example external service check
      // const cbpStatus = await this.checkCBPAPI();
      // services.push({ name: 'CBP_API', status: cbpStatus });
      
      return {
        status: allHealthy ? 'healthy' : 'degraded',
        details: { services }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error.message }
      };
    }
  }
  
  private async checkMemoryUsage(): Promise<{ status: string; details?: any }> {
    const memoryUsage = process.memoryUsage();
    const maxHeapSize = memoryUsage.heapTotal;
    const usedHeap = memoryUsage.heapUsed;
    const memoryPercent = (usedHeap / maxHeapSize) * 100;
    
    let status = 'healthy';
    if (memoryPercent > 90) {
      status = 'unhealthy';
    } else if (memoryPercent > 75) {
      status = 'warning';
    }
    
    return {
      status,
      details: {
        memory_usage_mb: Math.round(usedHeap / 1024 / 1024),
        memory_total_mb: Math.round(maxHeapSize / 1024 / 1024),
        memory_percent: Math.round(memoryPercent)
      }
    };
  }
  
  private async checkServiceRegistry(): Promise<{ status: string; details?: any }> {
    // Check that all required services are registered
    const requiredServices = [
      'AuthService', 'InventoryService', 'CustomerService', 
      'PartService', 'PreadmissionService', 'DashboardService'
    ];
    
    const missingServices = requiredServices.filter(serviceName => {
      try {
        this.serviceRegistry.get(serviceName);
        return false;
      } catch {
        return true;
      }
    });
    
    return {
      status: missingServices.length === 0 ? 'healthy' : 'unhealthy',
      details: {
        registered_services: requiredServices.length - missingServices.length,
        missing_services: missingServices
      }
    };
  }
}
```

---

## Team Handoff Documentation

### For Backend Engineers

**Immediate Implementation Tasks:**

1. **Enhanced BaseService Implementation** (`/src/backend/services/BaseService.js`)
   - Add TypeScript interfaces and type definitions
   - Implement comprehensive error handling with classification system
   - Add monitoring and observability integration
   - Enhance batch operations for performance

2. **Service Registry Setup** (`/src/backend/services/ServiceRegistry.js`)
   - Implement dependency injection container
   - Add service lifecycle management
   - Create event-driven communication system
   - Set up cross-service method calls with error handling

3. **API Endpoint Implementation** (`/src/backend/api/routes/`)
   - Implement all REST endpoints per API contract specifications
   - Add request validation using existing validation.js patterns
   - Implement standardized error response format
   - Add comprehensive logging and tracing

4. **Database Migration Scripts** (`/src/db/migrations/`)
   - Create migration scripts for performance indexes
   - Implement computed columns and functions
   - Set up Row Level Security policies
   - Add full-text search capabilities

5. **Real-time Integration** (`/src/backend/realtime/`)
   - Implement WebSocket connection management
   - Create event emission system for inventory changes
   - Set up subscription management for multi-user scenarios
   - Add connection recovery and error handling

**Key Implementation Files:**
- `/src/backend/services/EnhancedBaseService.ts` - Enhanced base service with monitoring
- `/src/backend/api/controllers/` - All controller implementations
- `/src/backend/middleware/monitoring.js` - Request/response monitoring
- `/src/backend/realtime/WebSocketManager.js` - Real-time connection management

### For Frontend Engineers

**Immediate Implementation Tasks:**

1. **State Management Enhancement** (`/src/frontend/stores/`)
   - Implement Zustand stores for UI and global state
   - Enhance React Query configuration for server state
   - Create optimistic update patterns for inventory operations
   - Set up real-time subscription management

2. **Component Architecture** (`/src/frontend/components/`)
   - Implement enhanced error boundaries with recovery options
   - Create comprehensive loading state components
   - Build lazy-loaded route components with proper fallbacks
   - Enhance existing page components with new patterns

3. **Real-time Integration** (`/src/frontend/services/realtime.js`)
   - Create WebSocket service for real-time updates
   - Implement reconnection logic and error handling
   - Set up event-driven state updates
   - Add connection status indicators

4. **Performance Optimization** (`/src/frontend/utils/`)
   - Implement code splitting with React.lazy
   - Create preloading strategies for route components
   - Add performance monitoring and metrics
   - Optimize bundle size and loading times

5. **Enhanced API Client** (`/src/frontend/services/api-client.js`)
   - Add comprehensive error handling and retries
   - Implement request/response interceptors
   - Create typed API service methods
   - Add offline handling and sync queues

**Key Implementation Files:**
- `/src/frontend/stores/useAppStore.js` - Zustand global state store
- `/src/frontend/hooks/useRealtimeSubscription.js` - Real-time data hooks
- `/src/frontend/components/shared/ErrorBoundary.js` - Enhanced error boundaries
- `/src/frontend/services/RealtimeService.js` - WebSocket management

### For QA Engineers

**Testing Strategy Implementation** (`/tests/`)

1. **Backend API Testing** (`/tests/backend/`)
   - Unit tests for all BaseService methods and specialized services
   - Integration tests for cross-service communication
   - API endpoint testing with request/response validation
   - Database operation testing with rollback scenarios
   - Performance testing for complex queries and batch operations

2. **Frontend Component Testing** (`/tests/frontend/`)
   - Unit tests for all React components and hooks
   - State management testing (Zustand stores and React Query)
   - Error boundary testing and recovery flows
   - Real-time update testing and subscription management
   - Loading state and user interaction testing

3. **End-to-End Testing** (`/tests/e2e/`)
   - Complete user workflow testing (login → inventory management → reports)
   - Cross-browser compatibility testing
   - Mobile responsive design testing
   - Performance testing under load
   - Real-time collaboration testing with multiple users

**Test Data and Fixtures:**
- Create realistic test data matching FTZ operations
- Set up database seeding for consistent test environments
- Implement test user accounts with different permission levels
- Create mock external service responses

**Performance Benchmarks:**
- Dashboard load time <2 seconds with 1000+ inventory lots
- Real-time update propagation <2 seconds end-to-end
- API response times <500ms for CRUD operations
- Memory usage <100MB for typical user sessions

### For Security Analysts

**Security Implementation Tasks** (`/docs/security/`)

1. **Authentication and Authorization**
   - Implement comprehensive JWT token management
   - Set up role-based access control with granular permissions
   - Create session timeout and refresh token handling
   - Add multi-factor authentication support

2. **Data Protection**
   - Implement input sanitization and validation at all layers
   - Set up SQL injection prevention measures
   - Create data encryption for sensitive fields
   - Implement audit logging for all business operations

3. **API Security**
   - Add rate limiting and DDoS protection
   - Implement CORS policies for cross-origin requests
   - Set up security headers and HTTPS enforcement
   - Create API key management for external integrations

4. **Vulnerability Assessment**
   - Set up automated security scanning in CI/CD pipeline
   - Implement dependency vulnerability monitoring
   - Create penetration testing procedures
   - Set up security incident response procedures

**Security Monitoring:**
- Real-time alerting for suspicious activities
- Failed authentication attempt tracking
- Unusual data access pattern detection
- Security metrics and compliance reporting

### For DevOps Engineers

**Infrastructure and Deployment** (`/docs/deployment.md`, `/config/`, `/scripts/`)

1. **Container Configuration**
   - Create Docker containers for frontend and backend
   - Set up docker-compose for local development
   - Implement multi-stage builds for optimization
   - Configure environment variable management

2. **CI/CD Pipeline Setup**
   - Implement automated testing in build pipeline
   - Set up code quality gates and security scanning
   - Create staging deployment automation
   - Implement blue-green or canary deployment strategies

3. **Monitoring and Alerting**
   - Set up application performance monitoring (APM)
   - Implement log aggregation and analysis
   - Create health check endpoints and uptime monitoring
   - Set up alerting for critical system metrics

4. **Database Management**
   - Implement automated database migrations
   - Set up database backup and recovery procedures
   - Create database performance monitoring
   - Implement connection pooling and optimization

**Environment Configuration:**
- Development environment setup scripts
- Staging environment matching production
- Production deployment procedures
- Disaster recovery and backup strategies

---

## Migration Timeline and Critical Dependencies

### Phase 1: Foundation (Weeks 1-2)
**Backend Infrastructure:**
- Enhanced BaseService implementation
- Service registry and dependency injection setup
- Database migrations for performance optimization
- Basic monitoring and logging integration

**Frontend Infrastructure:**
- Enhanced state management setup (Zustand + React Query)
- Error boundary and loading state components
- Basic real-time connection management
- Route component lazy loading implementation

### Phase 2: Core Services (Weeks 3-4)
**Backend Services:**
- All 21 specialized services enhanced with new patterns
- API endpoints with comprehensive contracts
- Real-time event system implementation
- Cross-service communication patterns

**Frontend Components:**
- Enhanced page components with new state management
- Real-time subscription integration
- Optimistic update patterns for inventory operations
- Performance monitoring and metrics

### Phase 3: Integration and Testing (Weeks 5-6)
**System Integration:**
- End-to-end workflow testing
- Performance optimization and tuning
- Security vulnerability assessment
- Real-time collaboration testing

**Production Readiness:**
- CI/CD pipeline implementation
- Production environment setup
- Monitoring and alerting configuration
- Documentation and training materials

### Phase 4: Deployment and Validation (Weeks 7-8)
**Production Deployment:**
- Staged rollout with feature flags
- User acceptance testing in production
- Performance monitoring and optimization
- Issue resolution and system stabilization

### Critical Success Factors

1. **Zero Disruption Requirement:**
   - Parallel operation during transition
   - Gradual feature rollout with rollback capability
   - Continuous data validation and integrity checks
   - User training and change management

2. **Performance Targets:**
   - Dashboard loads <2 seconds with 1000+ inventory lots
   - Real-time updates <2 seconds end-to-end
   - 50 concurrent users per FTZ site support
   - Memory usage <100MB per user session

3. **Compliance and Audit:**
   - 100% audit trail preservation during migration
   - FTZ regulatory compliance maintained
   - Security scan results with zero critical vulnerabilities
   - Complete test coverage across all critical paths

---

*This technical architecture blueprint provides the comprehensive foundation for transforming ICRS into ICRS_SPARC while maintaining 100% operational continuity. All architectural decisions preserve the proven business logic while modernizing the technical foundation for scalability, performance, and maintainability.*
# ICRS SPARC Frontend Migration Guide

## Overview

This guide outlines the systematic migration of React components from the original ICRS application to the new SPARC architecture, replacing direct Supabase calls with backend API integration.

## Migration Framework

### 1. API Integration Patterns

#### Original Pattern (Direct Supabase)
```javascript
// OLD: Direct Supabase calls
const { data, error } = await supabase
  .from('inventory_lots')
  .select('*')
  .order('created_at', { ascending: false });
```

#### New Pattern (API Client)
```javascript
// NEW: API client calls
const result = await apiClient.inventory.getLots({
  orderBy: 'created_at',
  ascending: 'false'
});

if (result.success) {
  const data = result.data;
  // Handle success
} else {
  // Handle error
}
```

### 2. State Management Migration

#### Original Pattern (Direct State)
```javascript
// OLD: Component-level state with direct Supabase
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchData = async () => {
    const { data, error } = await supabase.from('table').select('*');
    if (data) setData(data);
    setLoading(false);
  };
  fetchData();
}, []);
```

#### New Pattern (React Query + API Client)
```javascript
// NEW: React Query with API client
import { useQuery } from 'react-query';
import apiClient from '../services/api-client';

const {
  data,
  isLoading,
  error,
  refetch
} = useQuery(
  'queryKey',
  () => apiClient.endpoint.method(params),
  {
    refetchInterval: 30000,
    onError: (error) => showError(error.message)
  }
);
```

### 3. Authentication Migration

#### Original Pattern (Supabase Auth)
```javascript
// OLD: Direct Supabase auth
const { user } = useAuth();
const session = supabase.auth.getSession();
```

#### New Pattern (Context + API)
```javascript
// NEW: Auth context with API client
const { user, isAuthenticated, hasPermission } = useAuth();
// API client automatically handles token management
```

### 4. Component Migration Checklist

For each component migration, follow these steps:

#### Phase 1: Preparation
- [ ] Identify all Supabase calls in the component
- [ ] Map Supabase queries to API endpoints
- [ ] Document component dependencies
- [ ] Create test cases for current functionality

#### Phase 2: API Integration
- [ ] Replace Supabase imports with API client
- [ ] Update data fetching patterns
- [ ] Implement React Query for data management
- [ ] Update error handling

#### Phase 3: State Management
- [ ] Replace local state with React Query
- [ ] Update loading states
- [ ] Implement optimistic updates where appropriate
- [ ] Add proper error boundaries

#### Phase 4: Testing & Validation
- [ ] Test all CRUD operations
- [ ] Verify real-time updates work
- [ ] Test error scenarios
- [ ] Validate permissions and security
- [ ] Performance testing

## Component Migration Priority

### High Priority (Core Functionality)
1. **Dashboard.js** ✅ COMPLETED
2. **Login.js** ✅ COMPLETED
3. **Inventory.js** - Migration pending
4. **PreAdmissions.js** - Migration pending

### Medium Priority (Business Operations)
5. **Parts.js** - Migration pending
6. **Customers.js** - Migration pending
7. **PreShipments.js** - Migration pending

### Lower Priority (Advanced Features)
8. **HTSBrowser.js** - Migration pending
9. **EntrySummaryGroups.js** - Migration pending
10. **Reports.js** - Migration pending
11. **Admin.js** - Migration pending

## Migration Examples

### Example 1: Inventory Component Migration

#### Original Component Structure
```javascript
// Original Inventory.js structure
import { supabase } from '../lib/supabaseClient';

const Inventory = () => {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchLots();
  }, []);

  const fetchLots = async () => {
    const { data, error } = await supabase
      .from('inventory_lots')
      .select(`
        *,
        parts:part_id(description),
        customers:customer_id(name)
      `);
    
    if (data) setLots(data);
    setLoading(false);
  };

  // Component JSX...
};
```

#### Migrated Component Structure
```javascript
// Migrated Inventory.js structure
import { useQuery } from 'react-query';
import apiClient from '../services/api-client';
import { useApp } from '../contexts/AppContext';

const Inventory = () => {
  const { showError } = useApp();
  
  const {
    data: lots,
    isLoading,
    error,
    refetch
  } = useQuery(
    'inventoryLots',
    () => apiClient.inventory.getLots(),
    {
      refetchInterval: 30000,
      onError: (error) => showError('Failed to load inventory lots')
    }
  );

  // Component JSX with proper loading states and error handling...
};
```

### Example 2: Modal Component Migration

#### Original Modal Pattern
```javascript
// Original modal with direct Supabase
const EditLotModal = ({ lot, onClose, onUpdate }) => {
  const [saving, setSaving] = useState(false);

  const handleSave = async (formData) => {
    setSaving(true);
    const { data, error } = await supabase
      .from('inventory_lots')
      .update(formData)
      .eq('id', lot.id);
    
    if (data) {
      onUpdate(data[0]);
      onClose();
    }
    setSaving(false);
  };

  // Modal JSX...
};
```

#### Migrated Modal Pattern
```javascript
// Migrated modal with API client and React Query
import { useMutation, useQueryClient } from 'react-query';

const EditLotModal = ({ lot, onClose }) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useApp();

  const updateMutation = useMutation(
    (formData) => apiClient.inventory.updateLot(lot.id, formData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('inventoryLots');
        showSuccess('Lot updated successfully');
        onClose();
      },
      onError: (error) => showError('Failed to update lot')
    }
  );

  const handleSave = (formData) => {
    updateMutation.mutate(formData);
  };

  // Modal JSX with updateMutation.isLoading...
};
```

## Key Migration Benefits

### 1. Standardized Error Handling
- Centralized error handling in API client
- Consistent error message formatting
- Automatic authentication error handling

### 2. Improved Performance
- Request/response caching with React Query
- Automatic background refetching
- Optimistic updates for better UX

### 3. Better Security
- All database access goes through API layer
- Centralized authentication token management
- Consistent permission checking

### 4. Enhanced Developer Experience
- TypeScript-ready API client structure
- Consistent response patterns
- Better debugging and logging

## Migration Testing Strategy

### 1. Unit Testing
- Test API client methods
- Test React Query integration
- Test error handling scenarios

### 2. Integration Testing
- Test complete user workflows
- Test real-time data updates
- Test offline/error scenarios

### 3. Performance Testing
- Compare loading times vs original
- Test with large datasets
- Verify memory usage optimization

## Rollback Strategy

If issues are discovered during migration:

1. **Component-level rollback**: Keep original components as backup
2. **Feature flags**: Use environment variables to switch between old/new patterns
3. **Gradual migration**: Migrate one component at a time
4. **Data validation**: Ensure data consistency between systems

## Next Steps

1. **Phase 1**: Complete infrastructure setup (✅ DONE)
2. **Phase 2**: Migrate core components (Dashboard, Login complete)
3. **Phase 3**: Migrate business logic components
4. **Phase 4**: Migrate advanced features
5. **Phase 5**: Performance optimization and cleanup

## Resources

- [API Client Documentation](./services/api-client.js)
- [Authentication Context](./contexts/AuthContext.js)
- [App Context](./contexts/AppContext.js)
- [Component Examples](./components/)
- [Backend API Documentation](../backend/api/README.md)

---

**Note**: This is a living document that should be updated as migration progresses and new patterns are identified.
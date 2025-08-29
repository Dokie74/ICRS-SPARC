# ICRS SPARC Frontend

React frontend application for the ICRS SPARC Foreign Trade Zone Operations Management System.

## Architecture Overview

The frontend is built with modern React patterns and integrates with the backend API layer instead of directly accessing Supabase. This provides better security, performance, and maintainability.

### Key Technologies

- **React 18** - Modern React with Concurrent Features
- **React Router v6** - Client-side routing
- **React Query v3** - Server state management and caching
- **Tailwind CSS** - Utility-first CSS framework
- **Headless UI** - Accessible UI components
- **React Hook Form** - Form management
- **Zustand** - Lightweight state management (if needed)
- **React Hot Toast** - Notifications

## Project Structure

```
src/frontend/
├── components/
│   ├── pages/           # Page components
│   ├── shared/          # Reusable components
│   └── modals/          # Modal components (to be migrated)
├── contexts/
│   ├── AuthContext.js   # Authentication state
│   └── AppContext.js    # Global app state
├── services/
│   └── api-client.js    # API client service
├── styles/
│   └── index.css        # Main styles with Tailwind
├── hooks/               # Custom React hooks (to be added)
├── utils/               # Utility functions (to be added)
├── App.js               # Main app component
├── index.js             # Entry point
└── package.json         # Frontend dependencies
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm 8+
- Backend API server running on localhost:5000

### Installation

```bash
# Install all dependencies (backend + frontend)
npm run install:all

# Or install frontend only
cd src/frontend && npm install
```

### Development

```bash
# Start both backend and frontend
npm run dev:full

# Or start frontend only (requires backend running separately)
npm run frontend:start
```

The frontend will be available at http://localhost:3000

### Environment Setup

1. Copy the environment template:
```bash
cp src/frontend/.env.example src/frontend/.env
```

2. Update the environment variables:
```bash
REACT_APP_API_URL=http://localhost:5000
```

## API Integration

### API Client Usage

The `api-client.js` service provides a centralized way to interact with the backend API:

```javascript
import apiClient from '../services/api-client';

// Authentication
await apiClient.auth.login(email, password);

// Inventory operations
const lots = await apiClient.inventory.getLots();
const lot = await apiClient.inventory.getLot(id);

// Parts operations  
const parts = await apiClient.parts.getAll();
```

### Response Format

All API responses follow a standardized format:

```javascript
{
  success: true,
  data: { ... },          // Response data
  count: 100,             // Total count (for paginated responses)
  pagination: { ... }     // Pagination info (for paginated responses)
}

// Error responses
{
  success: false,
  error: "Error message"
}
```

### React Query Integration

Components use React Query for server state management:

```javascript
import { useQuery } from 'react-query';

const { data, isLoading, error } = useQuery(
  'queryKey',
  () => apiClient.someEndpoint(),
  {
    refetchInterval: 30000,  // Refresh every 30 seconds
    onError: (error) => showError(error.message)
  }
);
```

## Authentication

The frontend uses a context-based authentication system:

```javascript
import { useAuth } from '../contexts/AuthContext';

const { 
  user, 
  isAuthenticated, 
  login, 
  logout, 
  hasPermission 
} = useAuth();

// Check permissions
if (hasPermission('admin')) {
  // Show admin features
}
```

### Protected Routes

Routes are protected using the `ProtectedRoute` component:

```javascript
<Route 
  path="/admin" 
  element={
    <ProtectedRoute requiredRole="admin">
      <Admin />
    </ProtectedRoute>
  } 
/>
```

## Component Migration

Components are being migrated from the original ICRS application. See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed migration patterns and examples.

### Migration Status

- ✅ **Infrastructure**: API client, contexts, routing
- ✅ **Authentication**: Login, protected routes
- ✅ **Dashboard**: Basic dashboard with API integration
- 🔄 **In Progress**: Core business components
- ⏳ **Pending**: Advanced features and modals

## State Management

### Global State (AppContext)

The `AppContext` manages application-wide state:

```javascript
import { useApp } from '../contexts/AppContext';

const { 
  customers,         // Cached reference data
  parts,
  showSuccess,       // Notification helpers
  showError,
  refreshData        // Data refresh functions
} = useApp();
```

### Form State

Forms use React Hook Form for optimal performance:

```javascript
import { useForm } from 'react-hook-form';

const { register, handleSubmit, formState: { errors } } = useForm();
```

## Styling

### Tailwind CSS

The project uses Tailwind CSS with custom configurations:

```javascript
// Custom utility classes defined in index.css
<button className="btn-primary">Primary Button</button>
<input className="input-field" />
<div className="card">Card Content</div>
```

### Component Patterns

Consistent styling patterns for common elements:

- **Cards**: `.card`, `.card-header`, `.card-body`
- **Forms**: `.form-group`, `.input-field`, `.label`
- **Tables**: `.table`, `.table-header-cell`, `.table-cell`
- **Buttons**: `.btn-primary`, `.btn-secondary`, `.btn-danger`

## Error Handling

### Global Error Boundary

The app includes an error boundary for graceful error handling:

```javascript
// Automatic error reporting and user-friendly error screens
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### API Error Handling

API errors are handled consistently:

```javascript
// Automatic token refresh on 401 errors
// Centralized error logging
// User-friendly error messages
```

## Performance Optimization

### Code Splitting

Routes are lazy-loaded for optimal bundle sizes:

```javascript
const Dashboard = lazy(() => import('./components/pages/Dashboard'));
```

### Caching Strategy

- React Query handles API response caching
- Static assets cached via service worker
- Font loading optimization

### Bundle Optimization

- Tree shaking for unused code elimination
- Dynamic imports for large dependencies
- Image optimization and lazy loading

## Testing Strategy

### Unit Testing

```bash
npm run frontend:test
```

Tests cover:
- API client methods
- React components
- Context providers
- Utility functions

### Integration Testing

- User workflow testing
- API integration testing
- Authentication flow testing

## Building for Production

```bash
# Build frontend for production
npm run frontend:build

# Build entire application
npm run build:full
```

The build process:
1. Optimizes bundle sizes
2. Minifies CSS and JavaScript
3. Generates service worker for caching
4. Creates production-ready assets

## Deployment

The frontend can be deployed to any static hosting service:

- **Vercel** (recommended)
- **Netlify**
- **AWS S3 + CloudFront**
- **Azure Static Web Apps**

### Environment Variables

Ensure the following environment variables are set in production:

```bash
REACT_APP_API_URL=https://your-api-domain.com
REACT_APP_SENTRY_DSN=your-sentry-dsn (optional)
```

## Development Guidelines

### Code Style

- Use functional components with hooks
- Follow React Query patterns for server state
- Use TypeScript-like prop documentation
- Follow Tailwind CSS conventions

### Component Structure

```javascript
// Component template
import React from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../contexts/AuthContext';

const ComponentName = ({ prop1, prop2 }) => {
  const { user } = useAuth();
  
  const { data, isLoading } = useQuery(
    'queryKey',
    queryFunction
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="container">
      {/* Component JSX */}
    </div>
  );
};

export default ComponentName;
```

## Troubleshooting

### Common Issues

1. **API Connection Error**: Check backend server is running on localhost:5000
2. **Authentication Issues**: Verify JWT tokens in localStorage
3. **Build Errors**: Check Node.js version (18+) and dependencies
4. **Styling Issues**: Ensure Tailwind CSS is properly configured

### Debug Mode

Enable debug mode in development:

```bash
REACT_APP_ENABLE_DEBUG=true
```

This enables:
- Detailed error logging
- API request/response logging
- Performance metrics

## Contributing

1. Follow the migration guide for component updates
2. Test all changes thoroughly
3. Update documentation for new features
4. Follow the established code style and patterns

---

For more information about the migration from original ICRS, see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md).

For backend API documentation, see [../backend/api/README.md](../backend/api/README.md).
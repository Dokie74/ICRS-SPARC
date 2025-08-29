# ICRS SPARC Backend API

Foreign Trade Zone Operations Management System - Backend API Foundation

## Overview

The ICRS SPARC backend API provides a robust Express.js foundation for managing Foreign Trade Zone operations, migrated from the original ICRS system with enhanced architecture patterns.

## Architecture

### Core Components

#### 1. Express.js API Server (`src/backend/api/index.js`)
- Security middleware (Helmet, CORS, Rate limiting)
- Comprehensive request/response logging
- Graceful shutdown handling
- Health check endpoints

#### 2. Supabase Client Abstraction (`src/backend/db/supabase-client.js`)
- Row Level Security (RLS) integration
- User context management
- Admin and anonymous client access
- Real-time subscription support
- Standardized response patterns

#### 3. Authentication Middleware (`src/backend/api/middleware/auth.js`)
- JWT token validation with Supabase Auth
- Role-based authorization (admin, manager, warehouse_staff)
- Optional authentication for public endpoints
- User context injection for RLS policies

#### 4. Base Service Class (`src/backend/services/BaseService.js`)
- Standardized CRUD operations
- Consistent response patterns
- Audit trail management
- Error handling and validation

#### 5. Business Services (`src/backend/services/business/`)
- Domain-specific logic extensions
- Foreign Trade Zone operations
- Transaction-based inventory calculations
- Real-time data processing

## API Endpoints

### Authentication Routes (`/api/auth`)
- `POST /login` - User authentication
- `POST /refresh` - Token refresh
- `POST /logout` - User logout
- `GET /me` - Current user profile
- `POST /change-password` - Password change

### Inventory Routes (`/api/inventory`)
- `GET /lots` - List inventory lots with filters
- `GET /lots/:id` - Get specific lot with transaction history
- `POST /lots` - Create new inventory lot
- `PUT /lots/:id` - Update inventory lot
- `DELETE /lots/:id` - Soft delete lot
- `GET /transactions` - List inventory transactions
- `POST /transactions` - Create inventory transaction

### Parts Routes (`/api/parts`)
- `GET /` - List parts with search and filters
- `GET /:id` - Get specific part with inventory
- `POST /` - Create new part
- `PUT /:id` - Update part
- `DELETE /:id` - Soft delete part
- `GET /reference/materials` - Get material types
- `GET /:id/inventory` - Get part inventory summary

### Customer Routes (`/api/customers`)
- `GET /` - List customers with search
- `GET /:id` - Get customer with summary statistics
- `POST /` - Create new customer
- `PUT /:id` - Update customer
- `DELETE /:id` - Soft delete customer
- `GET /:id/inventory` - Get customer inventory
- `GET /:id/preadmissions` - Get customer preadmissions

### Pre-admission Routes (`/api/preadmission`)
- `GET /` - List preadmissions with filters
- `GET /:id` - Get specific preadmission with line items
- `POST /` - Create new preadmission
- `PUT /:id` - Update preadmission
- `PUT /:id/status` - Update preadmission status
- `DELETE /:id` - Delete preadmission
- `GET /reference/statuses` - Get available statuses

### Dashboard Routes (`/api/dashboard`)
- `GET /metrics` - Comprehensive dashboard metrics
- `GET /inventory-summary` - Detailed inventory analysis
- `GET /alerts` - System alerts and notifications

## Key Features

### Standardized Response Pattern
All API endpoints return responses in the format:
```json
{
  "success": boolean,
  "data": any,        // Present on success
  "error": string,    // Present on failure
  "count": number,    // For paginated results
  "pagination": {     // For paginated results
    "limit": number,
    "offset": number,
    "total": number
  }
}
```

### Row Level Security (RLS) Integration
- User context automatically applied to all database operations
- Admin operations can bypass RLS when needed
- Employee role-based access control
- Secure multi-tenant data isolation

### Real-time Capabilities
- Supabase real-time subscriptions
- Inventory change notifications
- Live dashboard updates
- WebSocket support for real-time features

### Foreign Trade Zone Compliance
- Customs documentation workflow
- Entry summary management
- Material classification tracking
- Duty calculation support
- Transaction-based quantity tracking

### Transaction-Based Inventory
Preserves original ICRS pattern where inventory quantities are calculated from transaction history:
- Receipt transactions (positive quantities)
- Shipment transactions (negative quantities)
- Adjustment transactions (positive/negative)
- Transfer transactions (in/out)

## Environment Configuration

Required environment variables in `.env`:
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# API Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Security
JWT_SECRET=your-jwt-secret
```

## Getting Started

### Installation
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials
```

### Development
```bash
# Start development server with hot reload
npm run dev

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint
```

### API Testing
The API includes comprehensive health checks and documentation:
- Health check: `GET /health`
- API documentation: `GET /api`
- All endpoints support JSON responses

## Database Schema Requirements

The API expects the following Supabase tables with RLS policies:
- `employees` - User profiles and roles
- `inventory_lots` - Inventory lot records
- `inventory_transactions` - Transaction history
- `parts` - Part master data
- `customers` - Customer information
- `preadmissions` - Customs documentation
- `preadmission_line_items` - Pre-admission details
- `storage_locations` - Warehouse locations

## Security Features

### Request Security
- Helmet.js for security headers
- CORS configuration for trusted origins
- Rate limiting (1000 requests per 15 minutes)
- Request size limits (10MB)

### Authentication Security
- JWT token validation
- Secure session management
- Password strength requirements
- Role-based access control

### Data Security
- Row Level Security enforcement
- SQL injection prevention
- Input validation and sanitization
- Audit trails for all modifications

## Error Handling

### Global Error Handler
- Standardized error responses
- Development vs production error details
- Request context logging
- Error categorization and HTTP status codes

### Validation
- Required field validation
- Data type validation
- Business rule enforcement
- Custom validation patterns

## Logging and Monitoring

### Request Logging
- HTTP request/response logging
- Performance timing
- User context tracking
- Error condition logging

### Business Logic Logging
- Transaction processing
- Authentication events
- Business rule violations
- System alerts and notifications

## Migration from Original ICRS

### Preserved Patterns
- Standardized response format: `{ success, data, error }`
- Transaction-based quantity calculations
- Row Level Security integration
- Real-time subscription support
- Foreign Trade Zone business logic

### Enhanced Features
- Improved error handling and validation
- Comprehensive request logging
- Security middleware integration
- Modular service architecture
- Consistent audit trail management

### Business Logic Transfer
The backend provides a clean foundation for systematically transferring business logic from the original ICRS services while maintaining operational requirements for Foreign Trade Zone compliance.

## Next Steps

1. **Service Migration**: Transfer remaining business logic from original ICRS services
2. **Real-time Features**: Implement WebSocket connections for live updates  
3. **Reporting Services**: Add comprehensive reporting endpoints
4. **Integration APIs**: External system integration points
5. **Performance Optimization**: Database query optimization and caching
6. **Testing Suite**: Comprehensive API testing coverage
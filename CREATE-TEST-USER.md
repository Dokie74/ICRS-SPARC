# Create Test User for ICRS SPARC

To fix authentication and see the full UI, you need to create a test user in Supabase.

## Option 1: Create User via Supabase Dashboard

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **Authentication** → **Users**
3. Click **Add User**
4. Use these credentials:
   - **Email**: `admin@icrs.com`
   - **Password**: `admin123456`
   - **Email Confirm**: `true`

## Option 2: Create User via SQL (Supabase SQL Editor)

```sql
-- Create a test user in auth.users
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  confirmed_at
) VALUES (
  gen_random_uuid(),
  'admin@icrs.com',
  crypt('admin123456', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  now()
);
```

## Option 3: Temporarily Disable Auth (for testing UI only)

Edit `/src/backend/api/index.js` and comment out the auth middleware:

```javascript
// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', /* authMiddleware, */ inventoryRoutes);
app.use('/api/parts', /* authMiddleware, */ partsRoutes);
app.use('/api/customers', /* authMiddleware, */ customersRoutes);
app.use('/api/materials', /* authMiddleware, */ materialsRoutes);
app.use('/api/locations', /* authMiddleware, */ locationsRoutes);
```

## After Creating User

1. Start the application: `npm run dev:full`
2. Navigate to: http://localhost:3000
3. Login with: `admin@icrs.com` / `admin123456`
4. You should now see the full ICRS SPARC interface!

## Current Application Status

✅ **Backend API**: Running on http://localhost:5000  
✅ **Frontend**: Running on http://localhost:3000  
✅ **Database**: Connected to Supabase  
✅ **Routes**: All API endpoints created  
⚠️ **Authentication**: Needs test user  
⚠️ **UI**: Will show after login  

The application structure is complete - it just needs a user account to display the full interface!
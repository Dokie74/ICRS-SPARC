# ICRS SPARC - Vercel Production Deployment Guide

## Overview

This deployment migrates ICRS SPARC from local Express.js server to Vercel serverless functions for production scalability.

## Architecture Changes

**Before (Local Development):**
- Express.js server on port 5001
- React frontend on port 3001
- Supabase cloud database

**After (Vercel Production):**
- Serverless API functions at `/api/*`
- React frontend served from Vercel CDN
- Same Supabase database (no changes needed)

## Deployment Steps

### 1. Prerequisites

- GitHub account with this repository
- Vercel account (free tier works)
- Supabase project with existing data

### 2. Deploy to Vercel

#### Option A: Vercel CLI (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from your project directory
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Set build command: npm run build:full
# - Set output directory: src/frontend/build
```

#### Option B: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Connect your GitHub account
3. Import this repository
4. Configure build settings:
   - Build Command: `npm run build:full`
   - Output Directory: `src/frontend/build`
   - Install Command: `npm run install:all`

### 3. Configure Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
FRONTEND_URL=https://your-vercel-domain.vercel.app
NODE_ENV=production
```

### 4. Verify Deployment

1. **Health Check**: Visit `https://your-vercel-domain.vercel.app/health`
2. **API Docs**: Visit `https://your-vercel-domain.vercel.app/api`
3. **Frontend**: Visit `https://your-vercel-domain.vercel.app`

## API Routes Converted

**Completed Routes:**
- ✅ `/api/health` - Health check
- ✅ `/api/` - API documentation
- ✅ `/api/auth/login` - User authentication
- ✅ `/api/auth/refresh` - Token refresh
- ✅ `/api/dashboard/stats` - Dashboard statistics
- ✅ `/api/customers` - Customer management
- ✅ `/api/inventory` - Inventory management

**Remaining Routes (TODO):**
- 🔄 `/api/parts` - Parts management
- 🔄 `/api/preadmission` - Pre-admission processing
- 🔄 `/api/preshipments` - Pre-shipment processing
- 🔄 `/api/shipping` - Shipping management
- 🔄 `/api/receiving` - Receiving management
- 🔄 `/api/admin` - Admin operations
- 🔄 `/api/materials` - Materials management
- 🔄 `/api/locations` - Location management
- 🔄 `/api/hts` - HTS code management
- 🔄 `/api/tariff` - Tariff management

## Benefits of Vercel Deployment

1. **Scalability**: Serverless functions auto-scale with demand
2. **Performance**: Global CDN for fast frontend delivery
3. **Cost**: Pay only for usage (free tier available)
4. **Reliability**: Built-in redundancy and monitoring
5. **CI/CD**: Automatic deployments on git push
6. **SSL**: Free HTTPS certificates
7. **Analytics**: Built-in web analytics

## Troubleshooting

### Common Issues

**1. Build Failures**
```bash
# Check build locally first
npm run build:full

# Common fixes:
# - Update Node version to 18+ in vercel.json
# - Check all imports use relative paths
# - Ensure all environment variables are set
```

**2. API Errors**
- Verify Supabase environment variables
- Check CORS configuration in `api/_utils/cors.js`
- Review function logs in Vercel Dashboard

**3. Frontend Issues**
- Clear browser cache
- Check that `REACT_APP_API_URL=/api` is set correctly
- Verify build output in Vercel function logs

### Monitoring

- **Function Logs**: Vercel Dashboard → Functions → View Logs
- **Analytics**: Vercel Dashboard → Analytics
- **Performance**: Use browser dev tools Network tab

## Migration Notes

- **Database**: No changes needed - continues using existing Supabase
- **Authentication**: Same Supabase Auth flow
- **File Uploads**: May need adjustment for serverless (future work)
- **WebSockets**: Not supported in current setup (would need separate service)

## Next Steps

1. Complete remaining API route conversions
2. Add comprehensive error monitoring (Sentry integration)
3. Implement caching strategies
4. Add API rate limiting per user
5. Set up staging environment
6. Configure custom domain

---

*Generated with Claude Code for ICRS SPARC Vercel Migration*
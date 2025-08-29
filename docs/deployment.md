# SPARC Deployment Guide

This guide covers deployment configurations for the SPARC (Foreign Trade Zone Operations Management System) application, from local development setup to full production deployment.

## Table of Contents

- [Local Development Environment](#local-development-environment)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [CI/CD Pipeline](#cicd-pipeline)
- [Production Deployment](#production-deployment)
- [Monitoring and Logging](#monitoring-and-logging)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Local Development Environment

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development without Docker)
- Supabase account and project
- Git

### Quick Start

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd ICRS_SPARC
   
   # Copy environment template
   cp .env.example .env
   # Update .env with your Supabase credentials
   ```

2. **Start Development Environment**
   ```bash
   # Using the setup script (Linux/Mac)
   chmod +x scripts/dev/dev-setup.sh
   ./scripts/dev/dev-setup.sh
   
   # Or manually with Docker Compose
   docker-compose -f scripts/dev/docker-compose.yml up --build
   ```

3. **Access the Application**
   - Full Application: http://localhost (via Nginx proxy)
   - Frontend Only: http://localhost:3000
   - Backend API: http://localhost:5000
   - Redis: localhost:6379

### Development Services

The development environment includes:

- **Backend**: Node.js/Express API with hot reloading
- **Frontend**: React development server with hot reloading
- **Redis**: Session storage and caching
- **Nginx**: Reverse proxy for unified access

### Development Commands

```bash
# View logs
docker-compose -f scripts/dev/docker-compose.yml logs -f

# Stop services
docker-compose -f scripts/dev/docker-compose.yml down

# Restart a specific service
docker-compose -f scripts/dev/docker-compose.yml restart backend

# Shell access
docker exec -it sparc-backend-dev sh
docker exec -it sparc-frontend-dev sh

# Database operations
node scripts/db/migrate.js migrate
node scripts/db/seed-db.js --clear
```

## Environment Configuration

### Development Environment

Copy `/config/.env.development` and customize:

```bash
# Application
NODE_ENV=development
PORT=5000

# Supabase (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Security
JWT_SECRET=your-development-jwt-secret
SESSION_SECRET=your-session-secret

# Redis
REDIS_URL=redis://redis:6379
```

### Production Environment

Use environment variables or secrets management:

```bash
# Required Production Variables
NODE_ENV=production
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
JWT_SECRET=
REDIS_URL=
REDIS_PASSWORD=

# Optional Monitoring
SENTRY_DSN=
GRAFANA_PASSWORD=
```

## Database Setup

### Migrations

The application uses a custom migration system for database schema management:

```bash
# Check migration status
node scripts/db/migrate.js status

# Run pending migrations
node scripts/db/migrate.js migrate

# Create new migration
node scripts/db/migrate.js create add_user_roles

# Rollback last migration
node scripts/db/migrate.js rollback

# Rollback multiple migrations
node scripts/db/migrate.js rollback 3
```

### Database Seeding

For development and testing:

```bash
# Seed with sample data
node scripts/db/seed-db.js

# Clear existing data and seed
node scripts/db/seed-db.js --clear
```

### Migration File Structure

Migrations are stored in `/src/db/migrations/`:

```
20240829120000_create_customers.sql
20240829120000_create_customers_rollback.sql
20240829121500_add_user_roles.sql
20240829121500_add_user_roles_rollback.sql
```

## CI/CD Pipeline

### GitHub Actions

The project includes a comprehensive CI/CD pipeline in `/scripts/ci/github-actions.yml`.

**To enable:**
1. Copy the file to `.github/workflows/ci-cd.yml`
2. Configure the required secrets in GitHub:

```
# Supabase
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
SUPABASE_URL_TEST
SUPABASE_ANON_KEY_TEST
SUPABASE_SERVICE_KEY_TEST

# Application
REACT_APP_API_URL
JWT_SECRET
REDIS_PASSWORD
GRAFANA_PASSWORD

# Notifications (optional)
SLACK_WEBHOOK_URL
```

### Pipeline Stages

1. **Security Scanning**: Trivy vulnerability scanner, Semgrep SAST
2. **Testing**: Backend unit tests, Frontend tests, E2E tests
3. **Build**: Container images for backend and frontend
4. **Deploy**: Staging (develop branch) and Production (releases)

### Database Migrations in CI/CD

Migrations run automatically during deployment:
- Test migrations in CI pipeline
- Automatic rollback on failure
- Migration status reporting

## Production Deployment

### Container Orchestration

Production deployment uses Docker Compose with the configuration in `/scripts/production/docker-compose.prod.yml`.

### Prerequisites

- Docker and Docker Compose
- SSL certificates (for HTTPS)
- External Redis instance (recommended)
- Monitoring tools (Prometheus, Grafana)

### Deployment Steps

1. **Prepare Environment**
   ```bash
   # Create production environment file
   cp config/.env.production .env.production
   # Update with your production values
   ```

2. **SSL Setup**
   ```bash
   # Place SSL certificates
   mkdir -p ssl
   cp your-cert.pem ssl/
   cp your-key.pem ssl/
   ```

3. **Deploy**
   ```bash
   # Pull latest images
   docker-compose -f scripts/production/docker-compose.prod.yml pull
   
   # Deploy
   docker-compose -f scripts/production/docker-compose.prod.yml up -d
   
   # Run migrations
   docker exec sparc-backend-prod node scripts/db/migrate.js migrate
   ```

### Health Checks

All services include health checks:

- **Backend**: `GET /api/health`
- **Frontend**: `GET /health`
- **Redis**: Redis PING command

### Rolling Updates

```bash
# Update backend only
docker-compose -f scripts/production/docker-compose.prod.yml up -d --no-deps backend

# Update frontend only
docker-compose -f scripts/production/docker-compose.prod.yml up -d --no-deps frontend
```

### Resource Limits

Production containers have resource limits:

- **Backend**: 512MB limit, 256MB reservation
- **Frontend**: 128MB limit, 64MB reservation
- **Redis**: 256MB limit, 128MB reservation

## Monitoring and Logging

### Prometheus Metrics

Metrics collection is configured in `/config/prometheus/prometheus.yml`:

- Application metrics: `/api/metrics`
- Container metrics: cAdvisor
- System metrics: Node Exporter

### Grafana Dashboards

Included dashboards monitor:
- Application performance
- Database connections
- API response times
- Error rates
- Resource utilization

### Log Aggregation

Logs are collected using Docker's JSON file driver with rotation:

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Log rotation is automatic (10MB max, 3 files)
```

### Alerting

Set up alerts for:
- High error rates (>5%)
- Slow response times (>2s)
- High memory usage (>80%)
- Database connection failures
- Service downtime

## Security Considerations

### Container Security

- Non-root users in all containers
- Minimal base images (Alpine Linux)
- Security updates via automated builds
- Read-only root filesystems where possible

### Network Security

- Internal Docker network isolation
- Nginx reverse proxy with security headers
- Rate limiting on API endpoints
- CORS configuration

### Data Security

- Environment variables for secrets
- Encrypted connections to Supabase
- JWT token expiration
- Session management with Redis

### Security Headers

```
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'...
```

## Troubleshooting

### Common Issues

**1. Database Connection Errors**
```bash
# Check Supabase credentials
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# Test connection
node -e "const { createClient } = require('@supabase/supabase-js'); const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY); supabase.from('customers').select('count').then(console.log);"
```

**2. Redis Connection Issues**
```bash
# Check Redis connectivity
docker exec sparc-redis-dev redis-cli ping

# Check Redis logs
docker logs sparc-redis-dev
```

**3. Frontend Build Failures**
```bash
# Check for missing environment variables
docker exec sparc-frontend-dev env | grep REACT_APP

# Rebuild frontend
docker-compose -f scripts/dev/docker-compose.yml up --build frontend
```

**4. Migration Failures**
```bash
# Check migration status
node scripts/db/migrate.js status

# View migration logs
docker logs sparc-backend-prod | grep migration
```

### Performance Monitoring

```bash
# Check container resource usage
docker stats

# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:5000/api/health"

# Monitor database connections
# Check in Supabase dashboard
```

### Log Analysis

```bash
# Search for errors
docker-compose logs | grep -i error

# Monitor API requests
docker-compose logs backend | grep "POST\|GET\|PUT\|DELETE"

# Check authentication issues
docker-compose logs backend | grep "auth"
```

### Backup and Recovery

```bash
# Database backup (via Supabase)
# Use Supabase dashboard or CLI
supabase db dump --db-url $SUPABASE_DB_URL > backup.sql

# Redis backup
docker exec sparc-redis-prod redis-cli BGSAVE
docker cp sparc-redis-prod:/data/dump.rdb ./redis-backup.rdb

# Application state backup
cp .env.production backup/
cp -r ssl/ backup/
```

---

## Quick Reference

### Essential Commands

```bash
# Development
docker-compose -f scripts/dev/docker-compose.yml up -d
node scripts/db/migrate.js migrate
node scripts/db/seed-db.js

# Production
docker-compose -f scripts/production/docker-compose.prod.yml up -d
docker-compose logs -f
docker-compose ps

# Database
node scripts/db/migrate.js status
node scripts/db/migrate.js create migration_name
node scripts/db/migrate.js rollback

# Monitoring
docker stats
curl http://localhost:5000/api/health
curl http://localhost/health
```

### Important Ports

- **80**: Nginx (Production)
- **3000**: Frontend Dev Server
- **5000**: Backend API
- **6379**: Redis
- **9090**: Prometheus
- **3001**: Grafana

### Support

For deployment issues:
1. Check this documentation
2. Review logs with commands above
3. Check GitHub Issues
4. Contact development team
# Database Migration Guide: icrs-database → ICRS_SPARC

## Overview
Migrate database from the old `icrs-database` Supabase project to the new `ICRS_SPARC` project.

## Prerequisites

### Install PostgreSQL Client Tools
Since you're on Windows ARM64 (CLANGARM64), install PostgreSQL 15 client tools:

**Option 1: PostgreSQL Installer (Recommended)**
1. Download PostgreSQL 15 from: https://www.postgresql.org/download/windows/
2. Select "PostgreSQL 15.x" for Windows x64 (will run on ARM64 via emulation)
3. During installation, ensure "Command Line Tools" is selected
4. Add PostgreSQL bin directory to your PATH: `C:\Program Files\PostgreSQL\15\bin`

**Option 2: Using Chocolatey**
```bash
# Install Chocolatey if not already installed
choco install postgresql15 --params '/Password:yourpassword'
```

**Option 3: Portable PostgreSQL**
1. Download portable PostgreSQL from: https://get.enterprisedb.com/postgresql/
2. Extract and add bin folder to PATH

### Verify Installation
Test that pg_dump and psql are available:
```bash
pg_dump --version
psql --version
```

- Access to both source and destination Supabase projects

## Method 1: Using pg_dump/psql (Recommended)

### Step 1: Create Complete Backup
```bash
# Using your icrs-database credentials
pg_dump "postgresql://postgres.opgvskfowbodukxrosaz:i58Eh9TSfJcGyLFP@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require" --disable-triggers > database-backup-complete.sql
```

### Step 2: Restore to New Project
```bash
# Using your new ICRS_SPARC project credentials
psql "postgresql://postgres.qirnkhpytwfrrdedcdfa:rw1nkdBx07kyaiK8@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require" -f database-backup-complete.sql
```

## Method 2: Using Supabase CLI

### Step 1: Install Supabase CLI
```bash
npm install -g supabase
```

### Step 2: Link to Source Project
```bash
supabase link --project-ref opgvskfowbodukxrosaz
```

### Step 3: Dump Database
```bash
supabase db dump --file database-dump.sql
```

### Step 4: Link to New Project
```bash
supabase link --project-ref qirnkhpytwfrrdedcdfa
```

### Step 5: Restore Database
```bash
psql "postgresql://postgres.qirnkhpytwfrrdedcdfa:rw1nkdBx07kyaiK8@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require" -f database-dump.sql
```

## Method 3: Dashboard Backup (Alternative)

1. Go to your `icrs-database` project dashboard
2. Navigate to Settings → Backups
3. Download the latest backup
4. Extract and restore using psql

## Troubleshooting

### Common Issues
1. **Permission Errors**: Edit SQL file and comment out lines containing `ALTER ... OWNER TO "supabase_admin"`
2. **Schema Conflicts**: Expected with auth/storage schemas - errors can be ignored
3. **Empty Backup File**: Ensure correct credentials and network connectivity

### Verification
After restore, verify:
- Tables exist: Check dashboard Tables section
- Data integrity: Run sample queries
- Functions/triggers: Test RLS policies

## Security Notes
- Never commit database passwords to version control
- Use environment variables for production scripts
- Rotate passwords after migration

## New Project Details
- **URL**: https://qirnkhpytwfrrdedcdfa.supabase.co
- **Project Ref**: qirnkhpytwfrrdedcdfa
- **DB Password**: rw1nkdBx07kyaiK8
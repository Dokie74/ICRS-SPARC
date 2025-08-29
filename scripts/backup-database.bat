@echo off
echo Creating backup from icrs-database project...

rem Original icrs-database credentials
set ORIG_DB_PASSWORD=i58Eh9TSfJcGyLFP
set ORIG_PROJECT_REF=opgvskfowbodukxrosaz

rem Create backup using pg_dump
pg_dump "postgresql://postgres.%ORIG_PROJECT_REF%:%ORIG_DB_PASSWORD%@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require" --disable-triggers > database-backup-complete.sql

echo Backup completed: database-backup-complete.sql
pause
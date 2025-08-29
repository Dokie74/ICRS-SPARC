@echo off
echo Restoring database to new ICRS_SPARC project...

rem Your new database credentials
set NEW_DB_PASSWORD=rw1nkdBx07kyaiK8
set NEW_PROJECT_REF=qirnkhpytwfrrdedcdfa

rem Restore backup using psql
psql "postgresql://postgres.%NEW_PROJECT_REF%:%NEW_DB_PASSWORD%@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require" -f database-backup-complete.sql

echo Restore completed!
pause
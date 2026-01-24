@echo off
set SUPABASE_EXE=C:\Users\Guilherme Dias\Desktop\xismaster-pos\supabase\supabase-cli_0.1.0_windows_amd64\supabase.exe
set SQL_FILE=C:\Users\Guilherme Dias\.gemini\antigravity\brain\b1a5d85a-de53-449a-8402-9a9801e041e9\restore_local_env.sql
set DB_URL=postgresql://postgres:postgres@localhost:54322/postgres

echo Resetting Database...
"%SUPABASE_EXE%" db reset --db-url "%DB_URL%" --linked=false --debug

echo Restoring Data...
type "%SQL_FILE%" | "%SUPABASE_EXE%" db psql

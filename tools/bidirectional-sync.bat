@echo off
REM Two-Way Sync: DBF <-> PostgreSQL
REM Keeps DBF files and database in sync

cd /d "%~dp0"

REM Configuration
set DATA_DIR=C:\data
set LAST_SYNC_FILE=last_sync.txt

REM Get yesterday's date (requires PowerShell)
for /f %%i in ('powershell -Command "Get-Date (Get-Date).AddDays(-1) -Format yyyy-MM-dd"') do set YESTERDAY=%%i

REM Get last sync time (or use yesterday)
if exist %LAST_SYNC_FILE% (
    set /p LAST_SYNC=<%LAST_SYNC_FILE%
) else (
    set LAST_SYNC=%YESTERDAY%
)

echo ========================================
echo Two-Way Sync Started: %date% %time%
echo Last Sync: %LAST_SYNC%
echo ========================================

REM Step 1: Import from DBF to PostgreSQL
echo.
echo [1/2] Importing DBF to PostgreSQL...
node dbf-sync.js sync party "%DATA_DIR%\party.dbf" --strategy UPSERT
node dbf-sync.js sync exch "%DATA_DIR%\exch.dbf" --strategy UPSERT
node dbf-sync.js sync idmaster "%DATA_DIR%\idmaster.dbf" --strategy UPSERT

REM Step 2: Export PostgreSQL changes back to DBF
echo.
echo [2/2] Exporting PostgreSQL changes to DBF...
node dbf-export.js sync-back party "%DATA_DIR%\party.dbf" --mode incremental --since %LAST_SYNC%
node dbf-export.js sync-back exch "%DATA_DIR%\exch.dbf" --mode incremental --since %LAST_SYNC%
node dbf-export.js sync-back idmaster "%DATA_DIR%\idmaster.dbf" --mode incremental --since %LAST_SYNC%

REM Update last sync time
for /f %%i in ('powershell -Command "Get-Date -Format yyyy-MM-dd"') do echo %%i>%LAST_SYNC_FILE%

echo.
echo ========================================
echo Two-Way Sync Completed: %date% %time%
echo ========================================

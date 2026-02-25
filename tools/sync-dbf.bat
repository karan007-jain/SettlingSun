@echo off
REM DBF Sync Tool - Windows Batch Script
REM Usage: sync-dbf.bat <command> [options]

cd /d "%~dp0"

IF "%1"=="" (
    echo Usage: sync-dbf.bat [validate^|sync^|status] [entity] [dbfFile] [options]
    echo.
    echo Examples:
    echo   sync-dbf.bat status
    echo   sync-dbf.bat validate party C:\data\party.dbf
    echo   sync-dbf.bat sync party C:\data\party.dbf
    echo   sync-dbf.bat sync exch C:\data\exch.dbf
    exit /b 1
)

node dbf-sync.js %*

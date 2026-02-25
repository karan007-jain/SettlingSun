@echo off
REM Unified DBF Sync Tool - Windows Wrapper
REM Makes it easier to use dbf-tool.js on Windows

if "%1"=="" (
    echo Usage: dbf import^|export^|validate^|status^|sync-back^|export-changes [arguments]
    echo.
    echo Examples:
    echo   dbf status
    echo   dbf import party party_master.dbf --strategy UPSERT
    echo   dbf export party party_master.dbf
    echo   dbf sync-back party party_master.dbf --mode incremental --since 2024-01-01
    echo.
    echo For full help: dbf --help
    goto :eof
)

node --env-file=.env  "%~dp0dbf-tool.js" %*

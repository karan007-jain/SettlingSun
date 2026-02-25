@echo off
REM PostgreSQL to DBF Export Script (Windows)
REM 
REM Usage:
REM   export-dbf.bat export party party.dbf
REM   export-dbf.bat sync-back party party.dbf incremental 2024-01-01
REM   export-dbf.bat changes 2024-01-01 output/

cd /d "%~dp0"

set COMMAND=%1
set ENTITY=%2
set FILE=%3
set MODE=%4
set DATE=%5

if "%COMMAND%"=="export" (
    node dbf-export.js export %ENTITY% %FILE%
) else if "%COMMAND%"=="sync-back" (
    if "%MODE%"=="incremental" (
        node dbf-export.js sync-back %ENTITY% %FILE% --mode incremental --since %DATE%
    ) else (
        node dbf-export.js sync-back %ENTITY% %FILE% --mode full
    )
) else if "%COMMAND%"=="changes" (
    node dbf-export.js export-changes --since %ENTITY% --output %FILE%
) else (
    echo Usage:
    echo   export-dbf.bat export party party.dbf
    echo   export-dbf.bat sync-back party party.dbf incremental 2024-01-01
    echo   export-dbf.bat sync-back party party.dbf full
    echo   export-dbf.bat changes 2024-01-01 output/
)

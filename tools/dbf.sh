#!/bin/bash
# Unified DBF Sync Tool - Unix Wrapper
# Makes it easier to use dbf-tool.js on Linux/Mac

if [ -z "$1" ]; then
    echo "Usage: dbf import|export|validate|status|sync-back|export-changes [arguments]"
    echo ""
    echo "Examples:"
    echo "  dbf status"
    echo "  dbf import party party_master.dbf --strategy UPSERT"
    echo "  dbf export party party_master.dbf"
    echo "  dbf sync-back party party_master.dbf --mode incremental --since 2024-01-01"
    echo ""
    echo "For full help: dbf --help"
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Run the Node.js tool
node "$SCRIPT_DIR/dbf-tool.js" "$@"

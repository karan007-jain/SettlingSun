#!/bin/bash
# PostgreSQL to DBF Export Script (Linux/Mac)
#
# Usage:
#   ./export-dbf.sh export party party.dbf
#   ./export-dbf.sh sync-back party party.dbf incremental 2024-01-01
#   ./export-dbf.sh changes 2024-01-01 output/

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

COMMAND=$1
ENTITY=$2
FILE=$3
MODE=$4
DATE=$5

case $COMMAND in
    export)
        node dbf-export.js export "$ENTITY" "$FILE"
        ;;
    sync-back)
        if [ "$MODE" = "incremental" ]; then
            node dbf-export.js sync-back "$ENTITY" "$FILE" --mode incremental --since "$DATE"
        else
            node dbf-export.js sync-back "$ENTITY" "$FILE" --mode full
        fi
        ;;
    changes)
        node dbf-export.js export-changes --since "$ENTITY" --output "$FILE"
        ;;
    *)
        echo "Usage:"
        echo "  ./export-dbf.sh export party party.dbf"
        echo "  ./export-dbf.sh sync-back party party.dbf incremental 2024-01-01"
        echo "  ./export-dbf.sh sync-back party party.dbf full"
        echo "  ./export-dbf.sh changes 2024-01-01 output/"
        ;;
esac

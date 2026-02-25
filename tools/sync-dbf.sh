#!/bin/bash
# DBF Sync Tool - Linux/Mac Shell Script

cd "$(dirname "$0")"

if [ $# -eq 0 ]; then
    echo "Usage: ./sync-dbf.sh [validate|sync|status] [entity] [dbfFile] [options]"
    echo ""
    echo "Examples:"
    echo "  ./sync-dbf.sh status"
    echo "  ./sync-dbf.sh validate party /data/party.dbf"
    echo "  ./sync-dbf.sh sync party /data/party.dbf"
    echo "  ./sync-dbf.sh sync exch /data/exch.dbf"
    exit 1
fi

node dbf-sync.js "$@"

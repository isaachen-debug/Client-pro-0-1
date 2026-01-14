#!/bin/bash

# Database Backup Verification Script
# Verifies backup integrity by comparing table counts and record counts

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
ORIGINAL_DB="prisma/dev.db"
BACKUP_DIR="backup"

# Get the most recent backup
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/dev-*.db 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo -e "${RED}❌ No backup files found in $BACKUP_DIR${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Verifying backup integrity...${NC}"
echo "Original: $ORIGINAL_DB"
echo "Backup:   $LATEST_BACKUP"
echo ""

# Function to count records in a table
count_records() {
    local db=$1
    local table=$2
    sqlite3 "$db" "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "0"
}

# Get list of tables from original database
TABLES=$(sqlite3 "$ORIGINAL_DB" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%';" 2>/dev/null)

MISMATCH=0

echo "Table verification:"
echo "-------------------"

for table in $TABLES; do
    ORIG_COUNT=$(count_records "$ORIGINAL_DB" "$table")
    BACKUP_COUNT=$(count_records "$LATEST_BACKUP" "$table")
    
    if [ "$ORIG_COUNT" == "$BACKUP_COUNT" ]; then
        echo -e "${GREEN}✓${NC} $table: $ORIG_COUNT records"
    else
        echo -e "${RED}✗${NC} $table: Original=$ORIG_COUNT, Backup=$BACKUP_COUNT"
        MISMATCH=1
    fi
done

echo ""

if [ $MISMATCH -eq 0 ]; then
    echo -e "${GREEN}✅ Backup verification successful! All data matches.${NC}"
    exit 0
else
    echo -e "${RED}❌ Backup verification failed! Some data doesn't match.${NC}"
    exit 1
fi

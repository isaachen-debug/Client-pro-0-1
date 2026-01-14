#!/bin/bash

# Database SQL Export Script
# Exports SQLite database to SQL format for PostgreSQL migration

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DB_PATH="prisma/dev.db"
BACKUP_DIR="backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
EXPORT_FILE="${BACKUP_DIR}/export-${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}🔄 Exporting database to SQL format...${NC}"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "❌ Error: Database file not found at $DB_PATH"
    exit 1
fi

# Check if sqlite3 is installed
if ! command -v sqlite3 &> /dev/null; then
    echo -e "${YELLOW}⚠️  sqlite3 not found. Installing via Homebrew...${NC}"
    brew install sqlite3
fi

# Export database to SQL
echo "Dumping schema and data..."
sqlite3 "$DB_PATH" .dump > "$EXPORT_FILE"

# Get file size and line count
FILE_SIZE=$(du -h "$EXPORT_FILE" | cut -f1)
LINE_COUNT=$(wc -l < "$EXPORT_FILE")

echo -e "${GREEN}✅ SQL export completed successfully!${NC}"
echo "📁 Location: $EXPORT_FILE"
echo "📊 Size: $FILE_SIZE"
echo "📝 Lines: $LINE_COUNT"
echo "🕒 Timestamp: $TIMESTAMP"

# Show summary of exported tables
echo ""
echo "Exported tables:"
sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"

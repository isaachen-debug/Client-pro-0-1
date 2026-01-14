#!/bin/bash

# Database Backup Script
# Creates a timestamped copy of the SQLite database

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_PATH="prisma/dev.db"
BACKUP_DIR="backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/dev-${TIMESTAMP}.db"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}🔄 Creating database backup...${NC}"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "❌ Error: Database file not found at $DB_PATH"
    exit 1
fi

# Copy database file
cp "$DB_PATH" "$BACKUP_FILE"

# Get file size
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo -e "${GREEN}✅ Backup created successfully!${NC}"
echo "📁 Location: $BACKUP_FILE"
echo "📊 Size: $FILE_SIZE"
echo "🕒 Timestamp: $TIMESTAMP"

# List recent backups
echo ""
echo "Recent backups:"
ls -lht "$BACKUP_DIR"/*.db 2>/dev/null | head -5 || echo "No previous backups found"

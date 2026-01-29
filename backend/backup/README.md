# Backup Directory

This directory contains database backups created by the backup scripts.

## Files

- `dev-*.db` - SQLite database backups (timestamped)
- `export-*.sql` - SQL exports for PostgreSQL migration (timestamped)

## Usage

### Create a backup
```bash
cd backend
./scripts/backup-db.sh
```

### Export to SQL
```bash
cd backend
./scripts/export-to-sql.sh
```

### Verify backup
```bash
cd backend
./scripts/verify-backup.sh
```

## Retention Policy

- Keep backups for 30 days
- Delete old backups manually if needed
- Always keep at least 3 recent backups

## Important

**Do not commit backups to git!**
All files in this directory are gitignored.

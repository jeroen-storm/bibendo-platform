#!/bin/bash

# Bibendo Platform - VPS Migration Script
# Run this script ON THE VPS after pulling the code

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════╗"
echo "║  Bibendo Platform - Database Migration V2           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Check we're in the right directory
if [ ! -f "backend/database/migrate-to-timeline.js" ]; then
    echo "❌ Error: Must be run from bibendo-platform root directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

echo "✅ Running in: $(pwd)"
echo ""

# Show current branch
echo "🔍 Current branch:"
git branch --show-current
echo ""

# Show recent commits
echo "📋 Recent commits:"
git log -3 --oneline
echo ""

# Create database backup
echo "💾 Creating database backup..."
BACKUP_FILE="backend/database/bibendo.db.backup.$(date +%Y%m%d_%H%M%S)"
cp backend/database/bibendo.db "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"
echo ""

# Show current database state
echo "🔍 Current database tables:"
sqlite3 backend/database/bibendo.db "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
echo ""

echo "Current users count:"
sqlite3 backend/database/bibendo.db "SELECT COUNT(*) FROM users;"
echo ""

# Ask for confirmation
echo "⚠️  Ready to run database migration"
echo ""
echo "This will:"
echo "  ✓ Create new tables (timeline_events, content)"
echo "  ✓ Migrate existing data from old tables"
echo "  ✓ Rename old tables to *_legacy (notes_legacy, text_logs_legacy, etc)"
echo "  ✓ Keep all data (nothing is deleted)"
echo ""
echo "Database backup: $BACKUP_FILE"
echo ""
read -p "Continue with migration? (type YES to confirm): " -r
echo ""

if [[ ! $REPLY == "YES" ]]; then
    echo "❌ Migration cancelled"
    exit 1
fi

# Run migration
echo "🔄 Running database migration..."
cd backend
node database/migrate-to-timeline.js

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Migration failed!"
    echo "Database backup is available at: ../$BACKUP_FILE"
    exit 1
fi

cd ..
echo ""

# Verify migration
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Migration Verification                              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

echo "📊 New database tables:"
sqlite3 backend/database/bibendo.db "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
echo ""

echo "📈 Data counts:"
echo "Users: $(sqlite3 backend/database/bibendo.db 'SELECT COUNT(*) FROM users;')"
echo "Content: $(sqlite3 backend/database/bibendo.db 'SELECT COUNT(*) FROM content;')"
echo "Timeline Events: $(sqlite3 backend/database/bibendo.db 'SELECT COUNT(*) FROM timeline_events;')"
echo ""

echo "📋 Sample timeline events:"
sqlite3 backend/database/bibendo.db "SELECT event_type, COUNT(*) as count FROM timeline_events GROUP BY event_type;"
echo ""

# Restart PM2
echo "🔄 Restarting PM2 application..."
pm2 restart bibendo-platform
echo ""

# Wait for restart
sleep 3

# Show PM2 status
echo "📊 PM2 Status:"
pm2 list
echo ""

# Test health endpoint
echo "🏥 Testing API..."
HEALTH=$(curl -s http://localhost:3000/api/health)
echo "$HEALTH"
echo ""

if [[ $HEALTH == *"OK"* ]]; then
    echo "✅ API is healthy"
else
    echo "⚠️  API health check returned unexpected response"
fi
echo ""

# Show recent logs
echo "📋 Recent PM2 logs:"
pm2 logs bibendo-platform --lines 15 --nostream
echo ""

echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ Migration Completed Successfully!               ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Test the dashboard:"
echo "   https://onderzoek.leeschallenges.nl/admin/dashboard.html"
echo ""
echo "💾 Database backup:"
echo "   $BACKUP_FILE"
echo ""
echo "📊 Legacy data (backup):"
echo "   - notes_legacy"
echo "   - text_logs_legacy"
echo "   - sessions_legacy"
echo "   - time_logs_legacy"
echo ""
echo "Next steps:"
echo "1. Visit the admin dashboard"
echo "2. Click on a user"
echo "3. Check the new timeline interface"
echo "4. Test the Content and Timeline tabs"
echo ""

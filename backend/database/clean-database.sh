#!/bin/bash

# Bibendo Platform - Database Cleanup Script
# Clears all data from V2 tables while preserving schema

set -e

echo "╔══════════════════════════════════════════════════════╗"
echo "║  Bibendo Platform - Database Cleanup                ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Check we're in the right directory
if [ ! -f "bibendo.db" ]; then
    echo "❌ Error: Must be run from backend/database directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

echo "⚠️  WARNING: This will DELETE ALL DATA from the database!"
echo ""
echo "This includes:"
echo "  - All users"
echo "  - All content (notes, analyses, assignments)"
echo "  - All timeline events"
echo "  - All CBM results"
echo ""
echo "The database schema (tables, views, triggers) will be preserved."
echo ""

# Create backup
BACKUP_FILE="bibendo.db.backup.$(date +%Y%m%d_%H%M%S)"
echo "💾 Creating backup: $BACKUP_FILE"
cp bibendo.db "$BACKUP_FILE"
echo "✅ Backup created"
echo ""

# Show current data counts
echo "📊 Current data in database:"
echo "Users: $(sqlite3 bibendo.db 'SELECT COUNT(*) FROM users;')"
echo "Content: $(sqlite3 bibendo.db 'SELECT COUNT(*) FROM content;')"
echo "Timeline Events: $(sqlite3 bibendo.db 'SELECT COUNT(*) FROM timeline_events;')"
echo "Bibendo Tokens: $(sqlite3 bibendo.db 'SELECT COUNT(*) FROM bibendo_tokens;' 2>/dev/null || echo '0')"
echo "Bibendo Runs: $(sqlite3 bibendo.db 'SELECT COUNT(*) FROM bibendo_game_runs;' 2>/dev/null || echo '0')"
echo "Bibendo Choices: $(sqlite3 bibendo.db 'SELECT COUNT(*) FROM bibendo_game_choices;' 2>/dev/null || echo '0')"
echo ""

# Ask for confirmation
read -p "Type 'DELETE' to confirm deletion of all data: " -r
echo ""

if [[ ! $REPLY == "DELETE" ]]; then
    echo "❌ Cleanup cancelled"
    exit 1
fi

echo "🗑️  Deleting all data..."

# Delete all data from V2 tables (only tables that exist)
sqlite3 bibendo.db <<EOF
-- Delete from Bibendo tables first (due to foreign keys)
DELETE FROM bibendo_game_choices;
DELETE FROM bibendo_game_runs;
DELETE FROM bibendo_tokens;

-- Delete from main V2 tables
DELETE FROM timeline_events;
DELETE FROM content;
DELETE FROM users;

-- Reset SQLite sequence numbers
DELETE FROM sqlite_sequence WHERE name IN ('users', 'content', 'timeline_events', 'bibendo_tokens', 'bibendo_game_runs', 'bibendo_game_choices');

-- Vacuum to reclaim space
VACUUM;
EOF

echo "✅ All data deleted"
echo ""

# Verify cleanup
echo "📊 Verification - current data counts:"
echo "Users: $(sqlite3 bibendo.db 'SELECT COUNT(*) FROM users;')"
echo "Content: $(sqlite3 bibendo.db 'SELECT COUNT(*) FROM content;')"
echo "Timeline Events: $(sqlite3 bibendo.db 'SELECT COUNT(*) FROM timeline_events;')"
echo "Bibendo Tokens: $(sqlite3 bibendo.db 'SELECT COUNT(*) FROM bibendo_tokens;' 2>/dev/null || echo '0')"
echo "Bibendo Runs: $(sqlite3 bibendo.db 'SELECT COUNT(*) FROM bibendo_game_runs;' 2>/dev/null || echo '0')"
echo "Bibendo Choices: $(sqlite3 bibendo.db 'SELECT COUNT(*) FROM bibendo_game_choices;' 2>/dev/null || echo '0')"
echo ""

# Ask if user wants to create test data
read -p "Create a test user for testing? (y/n): " -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "👤 Creating test user..."

    sqlite3 bibendo.db <<EOF
INSERT INTO users (user_id, created_at, last_active)
VALUES ('test_user_001', datetime('now'), datetime('now'));
EOF

    echo "✅ Test user created: test_user_001"
    echo ""
    echo "You can test with this URL:"
    echo "http://localhost:3000/texts/level1/oefentekst_level1.html?userId=test_user_001"
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ Database Cleanup Complete                       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "💾 Backup saved as: $BACKUP_FILE"
echo ""
echo "Database is now empty and ready for fresh testing!"
echo ""

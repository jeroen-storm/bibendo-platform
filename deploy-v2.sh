#!/bin/bash

# Bibendo Platform - V2 Deployment Script
# Deploys code and runs database migration on VPS

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════╗"
echo "║  Bibendo Platform - V2 Deployment                   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# VPS connection details
VPS_USER="stormadvies"
VPS_HOST="84.247.14.172"
VPS_PATH="/home/stormadvies/bibendo-platform"
SSH_KEY="$HOME/.ssh/bibendo_vps_rsa"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📡 Connecting to VPS...${NC}"
echo ""

# Execute deployment on VPS
ssh -i ${SSH_KEY} -t ${VPS_USER}@${VPS_HOST} 'bash -s' << 'ENDSSH'
    set -e

    echo "✅ Connected to VPS"
    echo ""

    # Navigate to project directory
    echo "📍 Navigating to project directory..."
    cd /home/stormadvies/bibendo-platform

    # Show current branch
    echo "🔍 Current branch:"
    git branch --show-current
    echo ""

    # Pull latest code
    echo "🔄 Pulling latest code from GitHub..."
    git pull origin main
    echo ""

    # Show what changed
    echo "📋 Recent commits:"
    git log -3 --oneline
    echo ""

    # Create database backup
    echo "💾 Creating database backup..."
    BACKUP_FILE="backend/database/bibendo.db.backup.$(date +%Y%m%d_%H%M%S)"
    cp backend/database/bibendo.db "$BACKUP_FILE"
    echo "✅ Backup created: $BACKUP_FILE"
    echo ""

    # Check if migration script exists
    if [ ! -f "backend/database/migrate-to-timeline.js" ]; then
        echo "❌ Migration script not found!"
        exit 1
    fi

    # Check if schema V2 exists
    if [ ! -f "backend/database/schema-v2.sql" ]; then
        echo "❌ Schema V2 file not found!"
        exit 1
    fi

    echo "🔍 Checking database before migration..."
    sqlite3 backend/database/bibendo.db "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" | head -5
    echo ""

    # Ask for confirmation
    echo "⚠️  Ready to run database migration"
    echo "This will:"
    echo "  - Create new tables (timeline_events, content)"
    echo "  - Migrate existing data"
    echo "  - Rename old tables to *_legacy"
    echo ""
    read -p "Continue with migration? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
    echo ""

    # Run migration
    echo "🔄 Running database migration..."
    cd backend
    node database/migrate-to-timeline.js

    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ Migration failed!"
        echo "Database backup is available at: $BACKUP_FILE"
        exit 1
    fi

    cd ..
    echo ""

    # Verify migration
    echo "🔍 Verifying migration..."
    echo "New tables:"
    sqlite3 backend/database/bibendo.db "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
    echo ""

    echo "Content table count:"
    sqlite3 backend/database/bibendo.db "SELECT COUNT(*) FROM content;"

    echo "Timeline events count:"
    sqlite3 backend/database/bibendo.db "SELECT COUNT(*) FROM timeline_events;"
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
    echo "🏥 Testing API health..."
    HEALTH_CHECK=$(curl -s http://localhost:3000/api/health)
    echo "$HEALTH_CHECK"

    if [[ $HEALTH_CHECK == *"OK"* ]]; then
        echo "✅ API is healthy"
    else
        echo "⚠️  API health check failed"
    fi
    echo ""

    # Test new endpoints
    echo "🧪 Testing new V2 endpoints..."

    echo "Timeline endpoint:"
    curl -s http://localhost:3000/api/timeline/test_user_123 | head -c 200
    echo "..."
    echo ""

    echo "Content endpoint:"
    curl -s http://localhost:3000/api/content/test_user_123 | head -c 200
    echo "..."
    echo ""

    # Show recent logs
    echo "📋 Recent PM2 logs:"
    pm2 logs bibendo-platform --lines 10 --nostream
    echo ""

    echo "╔══════════════════════════════════════════════════════╗"
    echo "║  ✅ Deployment Completed Successfully!              ║"
    echo "╚══════════════════════════════════════════════════════╝"
    echo ""
    echo "🌐 Dashboard URL: https://onderzoek.leeschallenges.nl/admin/dashboard.html"
    echo "💾 Database backup: $BACKUP_FILE"
    echo ""
    echo "Next steps:"
    echo "1. Test the admin dashboard"
    echo "2. Check user timeline page"
    echo "3. Verify data collection is working"
    echo ""
ENDSSH

echo ""
echo -e "${GREEN}✅ Deployment script finished!${NC}"
echo ""
echo "To test:"
echo "1. Visit: https://onderzoek.leeschallenges.nl/admin/dashboard.html"
echo "2. Click on a user to see the new timeline interface"
echo "3. Check both Content and Timeline tabs"
echo ""

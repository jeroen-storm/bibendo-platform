#!/bin/bash

# Bibendo Platform - Quick VPS Restart & Verification
# Run this on VPS after pulling new code

set -e

echo "╔══════════════════════════════════════════════════════╗"
echo "║  Bibendo Platform - Restart & Verify                ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Check we're in the right directory
if [ ! -f "backend/server.js" ]; then
    echo "❌ Error: Must be run from bibendo-platform root directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

echo "✅ Running in: $(pwd)"
echo ""

# Show current commit
echo "📍 Current code version:"
git log -1 --oneline
echo ""

# Pull latest code
echo "🔄 Pulling latest code..."
git pull origin main
echo ""

# Restart PM2
echo "🔄 Restarting PM2 application..."
pm2 restart bibendo-platform
echo ""

# Wait for restart
echo "⏳ Waiting for application to start..."
sleep 3
echo ""

# Show PM2 status
echo "📊 PM2 Status:"
pm2 list
echo ""

# Test health endpoint
echo "🏥 Testing API health..."
HEALTH=$(curl -s http://localhost:3000/api/health)
echo "$HEALTH"
echo ""

if [[ $HEALTH == *"OK"* ]]; then
    echo "✅ API is healthy"
else
    echo "⚠️  API health check failed"
    echo ""
    echo "📋 Recent PM2 logs:"
    pm2 logs bibendo-platform --lines 20 --nostream
    exit 1
fi
echo ""

# Test V2 endpoints
echo "🧪 Testing new V2 endpoints..."
echo ""

echo "1. Content endpoint for test user:"
CONTENT_TEST=$(curl -s http://localhost:3000/api/admin/user/test_user_123/content)
if [[ $CONTENT_TEST == *"["* ]]; then
    echo "✅ Content endpoint working"
else
    echo "❌ Content endpoint failed:"
    echo "$CONTENT_TEST"
fi
echo ""

echo "2. Timeline endpoint for test user:"
TIMELINE_TEST=$(curl -s http://localhost:3000/api/admin/user/test_user_123/timeline)
if [[ $TIMELINE_TEST == *"["* ]]; then
    echo "✅ Timeline endpoint working"
else
    echo "❌ Timeline endpoint failed:"
    echo "$TIMELINE_TEST"
fi
echo ""

# Check database
echo "💾 Database verification:"
echo "Content count: $(sqlite3 backend/database/bibendo.db 'SELECT COUNT(*) FROM content;')"
echo "Timeline events count: $(sqlite3 backend/database/bibendo.db 'SELECT COUNT(*) FROM timeline_events;')"
echo "Users count: $(sqlite3 backend/database/bibendo.db 'SELECT COUNT(*) FROM users;')"
echo ""

# Show recent logs
echo "📋 Recent PM2 logs:"
pm2 logs bibendo-platform --lines 15 --nostream
echo ""

echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ Verification Complete                           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Test the dashboard:"
echo "   https://onderzoek.leeschallenges.nl/admin/dashboard.html"
echo ""
echo "If issues persist, check full logs with:"
echo "   pm2 logs bibendo-platform"
echo ""

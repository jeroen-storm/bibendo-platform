#!/bin/bash

# Deploy SneakSpot test to VPS
# Usage: ./deploy-to-vps.sh

echo "🚀 Deploying SneakSpot test to VPS..."

# VPS connection details
VPS_USER="stormadvies"
VPS_HOST="84.247.14.172"
VPS_PATH="/home/stormadvies/bibendo-platform"

echo "📡 Connecting to VPS and updating code..."

ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
    echo "📍 Current directory: $(pwd)"
    
    # Navigate to project directory
    cd /home/stormadvies/bibendo-platform
    
    echo "🔄 Pulling latest changes from git..."
    git pull origin main
    
    echo "📊 Checking new files..."
    ls -la frontend/test/ 2>/dev/null || echo "frontend/test/ not found - checking docs..."
    ls -la docs/ 2>/dev/null || echo "docs/ not found"
    
    # Check if SSL setup is needed
    if [ ! -f /etc/letsencrypt/live/onderzoek.leeschallenges.nl/fullchain.pem ]; then
        echo "🔒 SSL certificaat niet gevonden - SSL setup uitvoeren..."
        if [ -f setup-ssl.sh ]; then
            sudo ./setup-ssl.sh
        else
            echo "⚠️ setup-ssl.sh niet gevonden - handmatige SSL setup vereist"
        fi
    else
        echo "✅ SSL certificaat gevonden"
    fi
    
    echo "🔄 Restarting PM2 application..."
    pm2 restart bibendo-platform
    
    echo "📋 PM2 status:"
    pm2 list
    
    echo "🏥 Health check:"
    sleep 2
    # Test both HTTP and HTTPS endpoints
    echo "HTTP: $(curl -s http://localhost:3000/api/health | head -1)"
    echo "HTTPS: $(curl -s -k https://onderzoek.leeschallenges.nl/api/health | head -1 || echo 'HTTPS not accessible')"
    
    echo "✅ Deployment completed!"
EOF

echo "🎯 Testing SneakSpot test page..."
echo "Visit: https://onderzoek.leeschallenges.nl/test/three-questions.html"

echo "✅ Deployment script finished!"
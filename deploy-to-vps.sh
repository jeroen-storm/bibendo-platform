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
    ls -la frontend/sneakspot/ 2>/dev/null || echo "frontend/sneakspot/ not found"
    ls -la nginx/ 2>/dev/null || echo "nginx/ not found"
    
    # Update Nginx configuration
    echo "🔧 Updating Nginx configuration..."
    if [ -f nginx/onderzoek.leeschallenges.nl ]; then
        sudo cp nginx/onderzoek.leeschallenges.nl /etc/nginx/sites-available/
        sudo ln -sf /etc/nginx/sites-available/onderzoek.leeschallenges.nl /etc/nginx/sites-enabled/
        
        # Test nginx configuration
        echo "🧪 Testing Nginx configuration..."
        if sudo nginx -t; then
            echo "✅ Nginx configuration valid - reloading..."
            sudo systemctl reload nginx
        else
            echo "❌ Nginx configuration invalid - check manually"
        fi
    else
        echo "⚠️ Nginx configuration file not found"
    fi
    
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
    sleep 3
    # Test both HTTP and HTTPS endpoints
    echo "HTTP: $(curl -s http://localhost:3000/api/health | head -1)"
    echo "HTTPS: $(curl -s -k https://onderzoek.leeschallenges.nl/api/health | head -1 || echo 'HTTPS not accessible')"
    
    # Test SneakSpot game page
    echo "SneakSpot Game: $(curl -s -I https://onderzoek.leeschallenges.nl/sneakspot/game.html | head -1 || echo 'SneakSpot not accessible')"
    
    echo "✅ Deployment completed!"
EOF

echo "🎯 Testing SneakSpot test page..."
echo "Visit: https://onderzoek.leeschallenges.nl/test/three-questions.html"

echo "✅ Deployment script finished!"
#!/bin/bash

# SSL Setup Script voor onderzoek.leeschallenges.nl
# Dit script installeert Let's Encrypt SSL certificaat en configureert Nginx

set -e  # Stop script bij error

echo "🔒 SSL Setup voor onderzoek.leeschallenges.nl"

# Controleer of script als root wordt uitgevoerd
if [ "$EUID" -ne 0 ]; then
    echo "❌ Dit script moet als root uitgevoerd worden (sudo)"
    exit 1
fi

# Domain configuratie
DOMAIN="onderzoek.leeschallenges.nl"
EMAIL="jeroen@stormadvies.nl"  # Voor Let's Encrypt notificaties

echo "📍 Domain: $DOMAIN"
echo "📧 Email: $EMAIL"

# 1. Update systeem en installeer dependencies
echo "🔄 Systeem updaten en dependencies installeren..."
apt update
apt install -y nginx certbot python3-certbot-nginx

# 2. Stop Nginx tijdelijk voor certificate generatie
echo "⏸️ Nginx stoppen voor certificate setup..."
systemctl stop nginx

# 3. Genereer Let's Encrypt certificaat
echo "🔐 Let's Encrypt certificaat genereren..."
certbot certonly --standalone --agree-tos --no-eff-email --email $EMAIL -d $DOMAIN

# 4. Maak Nginx configuratie voor HTTPS
echo "⚙️ Nginx configureren voor HTTPS..."
cat > /etc/nginx/sites-available/$DOMAIN << 'EOF'
server {
    listen 80;
    server_name onderzoek.leeschallenges.nl;
    
    # Redirect all HTTP traffic to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name onderzoek.leeschallenges.nl;
    
    # SSL certificaten
    ssl_certificate /etc/letsencrypt/live/onderzoek.leeschallenges.nl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/onderzoek.leeschallenges.nl/privkey.pem;
    
    # SSL security configuratie
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Root directory
    root /home/stormadvies/bibendo-platform/frontend;
    index index.html;
    
    # API proxy naar Node.js backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files
    location / {
        try_files $uri $uri/ =404;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
    
    # Handle .html files zonder extensie
    location ~ ^/([^/]+)/([^/]+)$ {
        try_files $uri $uri/ /$1/$2.html =404;
    }
    
    # Specific routes voor application
    location ~ ^/(notepad|texts|cbm|admin|test)/ {
        try_files $uri $uri/ =404;
    }
    
    # Security: blokkeer toegang tot sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ \.(sql|db|log)$ {
        deny all;
    }
}
EOF

echo "✅ Nginx configuratie aangemaakt"

# 5. Activeer site configuratie
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 6. Test Nginx configuratie
echo "🧪 Nginx configuratie testen..."
nginx -t

# 7. Start Nginx
echo "▶️ Nginx starten..."
systemctl start nginx
systemctl enable nginx

# 8. Setup automatische certificaat vernieuwing
echo "🔄 Automatische certificaat vernieuwing instellen..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

# 9. Test SSL certificaat
echo "🧪 SSL certificaat testen..."
sleep 5
curl -I https://$DOMAIN/api/health || echo "⚠️ API test gefaald - controleer backend service"

echo ""
echo "✅ SSL Setup voltooid!"
echo ""
echo "🔗 Website: https://$DOMAIN"
echo "🔐 SSL Status: $(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/api/health 2>/dev/null || echo 'Test failed')"
echo ""
echo "📋 Volgende stappen:"
echo "1. Controleer of PM2 backend service draait: pm2 list"
echo "2. Test website toegankelijkheid"
echo "3. Voor FortiGuard blokkering: wacht 24-48 uur of neem contact op met netwerkbeheerder"
echo ""
echo "🔧 Troubleshooting:"
echo "- Nginx status: systemctl status nginx" 
echo "- SSL certificaat check: certbot certificates"
echo "- Nginx logs: tail -f /var/log/nginx/error.log"
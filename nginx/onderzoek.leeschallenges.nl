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
    
    # API proxy naar Node.js backend - MOET EERST STAAN!
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
    
    # Specific routes voor application
    location ~ ^/(notepad|texts|cbm|admin|test|sneakspot)/ {
        try_files $uri $uri/ =404;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
    
    # Handle .html files zonder extensie
    location ~ ^/([^/]+)/([^/]+)$ {
        try_files $uri $uri/ /$1/$2.html =404;
    }
    
    # Static files - KOMT NA API EN SPECIFIEKE ROUTES
    location / {
        try_files $uri $uri/ =404;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
    
    # Security: blokkeer toegang tot sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ \.(sql|db|log)$ {
        deny all;
    }
}
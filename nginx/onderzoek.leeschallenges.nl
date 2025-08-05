# HTTP redirect naar HTTPS  
server {
    listen 80;
    server_name onderzoek.leeschallenges.nl;
    return 301 https://$server_name$request_uri;
}

# HTTPS server - gebaseerd op werkende HTTP config
server {
    listen 443 ssl http2;
    server_name onderzoek.leeschallenges.nl;
    
    # SSL certificaten
    ssl_certificate /etc/letsencrypt/live/onderzoek.leeschallenges.nl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/onderzoek.leeschallenges.nl/privkey.pem;
    
    # SSL security configuratie
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Main application proxy - EXACTLY like working HTTP config
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for classroom use
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Static file optimization
        location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
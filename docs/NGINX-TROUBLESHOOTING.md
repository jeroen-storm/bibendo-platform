# Nginx Troubleshooting Guide

## Common Issues and Solutions

### Issue: Iframe Loading Blocked (X-Frame-Options)

**Symptoms:**
- Browser error: "Refused to display in a frame because it set 'X-Frame-Options' to 'SAMEORIGIN'"
- External iframes (like bibendo.nl games) don't load
- Pages can't be embedded in Bibendo Game Editor

**Root Cause:**
Nginx adds `X-Frame-Options: SAMEORIGIN` header which blocks iframe embedding from external domains.

**Solution:**
Remove the X-Frame-Options header from nginx configuration:

```nginx
# Security headers (no X-Frame-Options - all pages load in Bibendo iframes)
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
# Note: X-Frame-Options removed for iframe compatibility
```

**Result:** All pages can now be embedded in Bibendo Game Editor iframes.

### Issue: API Returns 404 After Config Changes

**Symptoms:**
- `curl https://onderzoek.leeschallenges.nl/api/health` returns HTML 404 page
- Backend works fine: `curl http://localhost:3000/api/health` returns `{"status":"OK",...}`
- Nginx error logs show: `stat() "/path/to/frontend/api/health" failed (13: Permission denied)`

**Root Cause:**
Nginx is trying to serve API routes as static files instead of proxying them to Node.js backend.

**Solution Steps:**

1. **Check for conflicting configs:**
   ```bash
   # Find all configs with same server_name
   sudo grep -r "server_name.*onderzoek" /etc/nginx/
   
   # Check what's actually enabled
   ls -la /etc/nginx/sites-enabled/
   ```

2. **Remove conflicting configs:**
   ```bash
   # Backup and remove old configs
   sudo mv /etc/nginx/sites-available/old-config /etc/nginx/sites-available/old-config.backup
   sudo rm /etc/nginx/sites-enabled/old-config
   ```

3. **Use the working config template:**
   The key is to proxy ALL requests to the Node.js backend, not separate API and static routing:
   
   ```nginx
   server {
       listen 443 ssl http2;
       server_name onderzoek.leeschallenges.nl;
       
       # SSL setup...
       
       # Proxy EVERYTHING to Node.js - this works!
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
           
           # Timeouts
           proxy_connect_timeout 60s;
           proxy_send_timeout 60s;
           proxy_read_timeout 60s;
       }
   }
   ```

4. **Test and reload:**
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   curl https://onderzoek.leeschallenges.nl/api/health
   ```

### Working Configuration (2025-08-05)

The current working nginx configuration is in `/nginx/onderzoek.leeschallenges.nl`:

**Key principles:**
- **Simple proxy setup**: All requests go to `localhost:3000`
- **No complex routing**: Let the Node.js app handle all routing (API, static files, etc.)
- **HTTP redirect**: All HTTP traffic redirects to HTTPS
- **SSL configuration**: Uses Let's Encrypt certificates

**DO NOT:**
- ❌ Separate location blocks for `/api/` and static files
- ❌ Complex try_files directives with static file serving
- ❌ Multiple server configs for the same domain

**DO:**
- ✅ Single location `/` that proxies everything to Node.js
- ✅ Let the Express app handle routing
- ✅ Use simple proxy configuration that works

### Emergency Recovery

If nginx breaks again:

1. **Restore working HTTP config:**
   ```bash
   sudo cp /etc/nginx/sites-available/bibendo-platform.backup /etc/nginx/sites-available/onderzoek.leeschallenges.nl
   sudo systemctl restart nginx
   # This gives you HTTP access back
   ```

2. **Add SSL to working config:**
   - Change `listen 80` to `listen 443 ssl http2`
   - Add SSL certificate paths
   - Add HTTP redirect server block

3. **Test step by step:**
   ```bash
   # Test HTTP first
   curl http://onderzoek.leeschallenges.nl/api/health
   
   # Then add SSL and test HTTPS
   curl https://onderzoek.leeschallenges.nl/api/health
   ```

### Debugging Commands

```bash
# Check nginx config syntax
sudo nginx -t

# See complete active configuration
sudo nginx -T | grep -A 10 -B 10 "location"

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Check access logs
sudo tail -f /var/log/nginx/access.log

# Check which configs are enabled
ls -la /etc/nginx/sites-enabled/

# Check for conflicting server names
sudo nginx -T | grep "server_name"

# Test backend directly
curl http://localhost:3000/api/health

# Check PM2 status
pm2 list
pm2 logs bibendo-platform --lines 20
```

### Key Lesson Learned

The Node.js Express app is designed to handle ALL routing internally, including:
- API endpoints (`/api/*`)
- Static files (`/frontend/*`)
- Application routes (`/notepad/*`, `/sneakspot/*`, etc.)

Therefore, nginx should simply proxy everything to the Express app, not try to handle routing itself.

**Working philosophy**: Keep nginx simple, let Express do the work.
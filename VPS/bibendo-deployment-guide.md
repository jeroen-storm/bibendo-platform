# 🚀 Bibendo Educational Platform - VPS Deployment Guide

**Comprehensive deployment guide for the Bibendo Game Editor Extension on TransIP VPS**

---

## 📋 Server Information
- **VPS Provider**: TransIP  
- **OS**: Ubuntu 24.04 LTS
- **User**: stormadvies
- **IP**: 84.247.14.172
- **Domain**: onderzoek.leeschallenges.nl
- **Project**: Bibendo Educational Platform (Game Editor Extension)

---

## 🔧 Step 1: Initial Server Connection & Updates

```bash
# Connect to server
ssh stormadvies@84.247.14.172

# Update system packages
sudo apt update && sudo apt upgrade -y
```

---

## 📦 Step 2: Install Required Software Stack

```bash
# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install system dependencies
sudo apt install -y git nginx certbot python3-certbot-nginx sqlite3 htop unzip

# Install PM2 process manager globally
sudo npm install -g pm2

# Verify installations
node --version
npm --version
nginx -v
sqlite3 --version
```

---

## 🔒 Step 3: Configure Server Security

```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw status

# Verify firewall status
sudo ufw status verbose
```

---

## 📁 Step 4: Setup Project Environment

```bash
# Create project directory
mkdir -p /home/stormadvies/bibendo-platform
cd /home/stormadvies/bibendo-platform

# Clone from GitHub (or upload files)
git clone https://github.com/jeroen-storm/bibendo-platform.git .

# Set correct permissions
chown -R stormadvies:stormadvies /home/stormadvies/bibendo-platform
```

---

## 🗄️ Step 5: Configure Database & Dependencies

```bash
# Navigate to backend directory
cd /home/stormadvies/bibendo-platform/backend

# Install Node.js dependencies
npm install --production

# Initialize SQLite database
node -e "
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ensure database directory exists
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new sqlite3.Database(path.join(dbDir, 'bibendo.db'));
const schema = fs.readFileSync(path.join(dbDir, 'init.sql'), 'utf8');

db.exec(schema, (err) => {
  if (err) {
    console.error('Database initialization error:', err);
  } else {
    console.log('✅ Bibendo database initialized successfully');
    
    // Enable WAL mode for production
    db.run('PRAGMA journal_mode = WAL;');
    db.run('PRAGMA synchronous = NORMAL;');
    db.run('PRAGMA cache_size = 1000;');
    db.run('PRAGMA temp_store = memory;');
    console.log('✅ Database optimized for production');
  }
  db.close();
});
"

# Verify database creation
ls -la database/
sqlite3 database/bibendo.db ".tables"
```

---

## 🌐 Step 6: Configure Nginx Reverse Proxy

```bash
# Create Nginx site configuration
sudo bash -c 'cat > /etc/nginx/sites-available/bibendo-platform << EOF
server {
    listen 80;
    server_name onderzoek.leeschallenges.nl;
    
    # Security headers
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Main application proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
        proxy_http_version 1.1;
        
        # Timeouts for classroom use
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://localhost:3000/health;
    }
    
    # Static file optimization
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Rate limiting for API endpoints
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# Rate limiting zone configuration
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
EOF'

# Enable site and test configuration
sudo ln -s /etc/nginx/sites-available/bibendo-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔐 Step 7: SSL Certificate Setup

```bash
# Install SSL certificate with Let's Encrypt
sudo certbot --nginx -d onderzoek.leeschallenges.nl

# Follow prompts:
# - Email: jeroenstorm@gmail.com
# - Agree to terms: Y  
# - Share email with EFF: Y (optional)

# Verify SSL configuration
sudo nginx -t
curl -I https://onderzoek.leeschallenges.nl
```

---

## 🚀 Step 8: Production Deployment with PM2

```bash
# Navigate to backend directory
cd /home/stormadvies/bibendo-platform/backend

# Create PM2 ecosystem configuration
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'bibendo-platform',
    script: 'server.js',
    cwd: '/home/stormadvies/bibendo-platform/backend',
    instances: 1,
    exec_mode: 'fork',
    
    // Environment configuration
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Logging
    log_file: '/home/stormadvies/bibendo-platform/logs/combined.log',
    out_file: '/home/stormadvies/bibendo-platform/logs/out.log',
    error_file: '/home/stormadvies/bibendo-platform/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Process management
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
EOF

# Create logs directory
mkdir -p /home/stormadvies/bibendo-platform/logs

# Start application with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Run the startup command that PM2 outputs
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u stormadvies --hp /home/stormadvies
```

---

## ✅ Step 9: Production Testing & Verification

```bash
# Test health endpoint
curl https://onderzoek.leeschallenges.nl/health

# Test main components
curl -I https://onderzoek.leeschallenges.nl/notepad/level1/note1.html
curl -I https://onderzoek.leeschallenges.nl/cbm/selection.html
curl -I https://onderzoek.leeschallenges.nl/admin/dashboard.html

# Check PM2 status
pm2 status
pm2 logs bibendo-platform --lines 50

# Check system resources
htop
df -h
free -m

# Verify database
sqlite3 /home/stormadvies/bibendo-platform/backend/database/bibendo.db ".tables"
```

---

## 📊 Step 10: Monitoring & Backup Setup

```bash
# Create comprehensive backup script
cat > /home/stormadvies/backup-bibendo.sh << 'EOF'
#!/bin/bash
# Bibendo Platform Backup Script
set -e

BACKUP_DIR="/home/stormadvies/backups/bibendo"
DB_PATH="/home/stormadvies/bibendo-platform/backend/database/bibendo.db"
LOGS_PATH="/home/stormadvies/bibendo-platform/logs"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
echo "🗄️  Backing up database..."
cp $DB_PATH "$BACKUP_DIR/bibendo_db_backup_$DATE.db"

# Backup logs
echo "📋 Backing up logs..."
tar -czf "$BACKUP_DIR/bibendo_logs_backup_$DATE.tar.gz" -C "$LOGS_PATH" .

# Backup configuration files
echo "⚙️  Backing up configuration..."
cp /etc/nginx/sites-available/bibendo-platform "$BACKUP_DIR/nginx_config_$DATE.conf"
cp /home/stormadvies/bibendo-platform/backend/ecosystem.config.js "$BACKUP_DIR/pm2_config_$DATE.js"

# Clean old backups (keep last 14 days)
find $BACKUP_DIR -name "bibendo_*_backup_*.db" -mtime +14 -delete
find $BACKUP_DIR -name "bibendo_*_backup_*.tar.gz" -mtime +14 -delete
find $BACKUP_DIR -name "*_config_*.conf" -mtime +14 -delete
find $BACKUP_DIR -name "*_config_*.js" -mtime +14 -delete

echo "✅ Backup completed: bibendo_db_backup_$DATE.db"
echo "📁 Backup location: $BACKUP_DIR"

# Send backup status to logs  
echo "$(date): Bibendo backup completed successfully" >> /home/stormadvies/bibendo-platform/logs/backup.log
EOF

# Make backup script executable
chmod +x /home/stormadvies/backup-bibendo.sh

# Test backup script
/home/stormadvies/backup-bibendo.sh

# Add to crontab for daily backups at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /home/stormadvies/backup-bibendo.sh >/dev/null 2>&1") | crontab -

# Verify crontab
crontab -l
```

---

## 🔧 Step 11: Production Optimization

```bash
# Optimize Node.js for production
echo 'export NODE_ENV=production' >> ~/.bashrc
echo 'export NODE_OPTIONS="--max-old-space-size=512"' >> ~/.bashrc
source ~/.bashrc

# Configure system for educational workload
echo '# Bibendo Platform Optimizations' | sudo tee -a /etc/sysctl.conf
echo 'net.core.somaxconn = 1024' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv4.tcp_max_syn_backlog = 1024' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Set up log rotation
sudo bash -c 'cat > /etc/logrotate.d/bibendo-platform << EOF
/home/stormadvies/bibendo-platform/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 stormadvies stormadvies
    postrotate
        pm2 reloadLogs
    endscript
}
EOF'
```

---

## 🎯 Game Editor Integration URLs

Once deployed, these URLs can be embedded in **Bibendo Game Editor** projects:

```javascript
// Production URLs for Flutter WebView integration
const baseUrl = 'https://onderzoek.leeschallenges.nl';

const bibendoExtensionUrls = {
  // Smart Notepad System
  notepad: {
    level1: `${baseUrl}/notepad/level1/note1.html?userId=\${gameUserId}`,
    level2: `${baseUrl}/notepad/level2/message_level2.html?userId=\${gameUserId}`,
    level3: `${baseUrl}/notepad/level3/plan_level3.html?userId=\${gameUserId}`
  },
  
  // Text Analysis Pages
  texts: {
    level1: `${baseUrl}/texts/level1/tekst1.html?userId=\${gameUserId}`,
    level2: `${baseUrl}/texts/level2/tekst2.html?userId=\${gameUserId}`,
    level3: `${baseUrl}/texts/level3/tekst3.html?userId=\${gameUserId}`
  },
  
  // CBM Assessment Tool
  cbm: {
    selection: `${baseUrl}/cbm/selection.html?userId=\${gameUserId}`,
    practice: `${baseUrl}/cbm/index.html?userId=\${gameUserId}&textId=0`,
    assessment: `${baseUrl}/cbm/index.html?userId=\${gameUserId}&textId=1`
  },
  
  // Admin Dashboard (for educators)
  admin: {
    dashboard: `${baseUrl}/admin/dashboard.html`,
    userDetail: `${baseUrl}/admin/user-detail.html?userId=\${gameUserId}`
  }
};
```

---

## 📊 System Monitoring Commands

```bash
# Check all services status
systemctl status nginx
pm2 status
sudo ufw status
certbot certificates

# Monitor system resources
htop
df -h
free -m
iotop

# Check application logs
pm2 logs bibendo-platform
tail -f /home/stormadvies/bibendo-platform/logs/combined.log

# Monitor web server
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Database monitoring
sqlite3 /home/stormadvies/bibendo-platform/backend/database/bibendo.db "
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM notes) as total_notes,
  (SELECT COUNT(*) FROM cbm_results) as total_cbm_results,
  (SELECT COUNT(*) FROM text_logs) as total_interactions;
"
```

---

## 🚨 Troubleshooting Guide

### Application Won't Start
```bash
cd /home/stormadvies/bibendo-platform/backend
npm install --production
node server.js  # Test manually

# Check for port conflicts
sudo netstat -tulpn | grep :3000
```

### Database Issues
```bash
# Check database file permissions
ls -la /home/stormadvies/bibendo-platform/backend/database/

# Test database connectivity
sqlite3 /home/stormadvies/bibendo-platform/backend/database/bibendo.db ".tables"

# Check database integrity
sqlite3 /home/stormadvies/bibendo-platform/backend/database/bibendo.db "PRAGMA integrity_check;"
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates
sudo certbot renew --dry-run

# Force certificate renewal
sudo certbot certonly --force-renewal -d onderzoek.leeschallenges.nl
```

### High Memory Usage
```bash
# Restart PM2 applications
pm2 restart bibendo-platform

# Check memory usage by process
ps aux --sort=-%mem | head

# Monitor real-time usage
watch 'free -m && echo "---" && ps aux --sort=-%mem | head -10'
```

---

## ⚡ Maintenance Commands

```bash
# Update application (deployment)
cd /home/stormadvies/bibendo-platform
git pull origin main
cd backend && npm install --production
pm2 restart bibendo-platform

# System updates
sudo apt update && sudo apt upgrade -y
sudo reboot  # if kernel updates

# Log management
pm2 flush  # Clear PM2 logs
sudo logrotate -f /etc/logrotate.d/bibendo-platform

# Database maintenance
sqlite3 /home/stormadvies/bibendo-platform/backend/database/bibendo.db "VACUUM;"
```

---

## 🎓 Educational Environment Optimization

**Optimized for classroom use with 30-50 concurrent students:**

- ✅ **Rate Limiting**: 500 requests/15min with API burst handling
- ✅ **Database**: WAL mode for concurrent read/write operations  
- ✅ **Caching**: Static file optimization with 1-year expiry
- ✅ **Memory**: Optimized Node.js heap size for VPS constraints
- ✅ **Monitoring**: Comprehensive logging and backup procedures
- ✅ **Security**: Firewall, SSL, security headers, input sanitization

---

## ✅ Deployment Checklist

- [ ] Server connected and updated
- [ ] Software stack installed (Node.js, Nginx, PM2, SQLite)
- [ ] Firewall configured (UFW)
- [ ] Project files deployed from GitHub
- [ ] Database initialized with schema
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed and verified
- [ ] PM2 application started and saved
- [ ] Backup script created and scheduled
- [ ] System optimization applied
- [ ] All URLs tested and functional
- [ ] Monitoring and logging configured

---

**🚀 The Bibendo Educational Platform extension is now ready for production use!**

Access at: **https://onderzoek.leeschallenges.nl**
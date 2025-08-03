# VPS Server Setup Guide for Research System

This guide will help Claude Code set up a fresh VPS server with the research system.

## Server Information
- **VPS Provider**: TransIP
- **OS**: Ubuntu 24.04 LTS
- **User**: stormadvies
- **IP**: 84.247.14.172
- **Domain**: onderzoek.leeschallenges.nl

## Step 1: Initial SSH Connection
```bash
ssh stormadvies@84.247.14.172
```

## Step 2: System Update
```bash
sudo apt update && sudo apt upgrade -y
```

## Step 3: Install Required Software
```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install additional tools
sudo apt install -y git nginx certbot python3-certbot-nginx sqlite3 htop

# Install PM2 globally
sudo npm install -g pm2
```

## Step 4: Configure Firewall
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw status
```

## Step 5: Create Project Directory
```bash
mkdir -p /home/stormadvies/research-system
cd /home/stormadvies/research-system
```

## Step 6: Create Project Files

### package.json
```bash
cat > package.json << 'EOF'
{
  "name": "research-system",
  "version": "1.0.0",
  "description": "Secure research system with 4-page survey and comprehensive logging",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "init-db": "node -e \"const fs = require('fs'); const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('./research.db'); const schema = fs.readFileSync('./schema.sql', 'utf8'); db.exec(schema, () => { console.log('Database initialized'); db.close(); });\""
  },
  "dependencies": {
    "express": "^4.18.2",
    "sqlite3": "^5.1.6",
    "express-rate-limit": "^6.10.0",
    "helmet": "^7.0.0",
    "cors": "^2.8.5",
    "express-validator": "^7.0.1"
  }
}
EOF
```

### Install Dependencies
```bash
npm install
```

### schema.sql
```bash
cat > schema.sql << 'EOF'
-- Database setup voor onderzoekssysteem
-- SQLite database schema

CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    page_number INTEGER NOT NULL CHECK (page_number BETWEEN 1 AND 4),
    content TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    char_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    UNIQUE(user_id, page_number)
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    page_number INTEGER,
    action TEXT NOT NULL,
    duration_seconds INTEGER,
    metadata TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX idx_responses_user_page ON responses(user_id, page_number);
CREATE INDEX idx_logs_user_time ON activity_logs(user_id, timestamp);
CREATE INDEX idx_users_activity ON users(last_activity);
EOF
```

### Initialize Database
```bash
npm run init-db
```

### server.js
Create the main server file (this is a large file - Claude Code should copy from the project files).

### Create Public Directory
```bash
mkdir public
```

### Create HTML Pages
Create the following HTML files in the public directory:
- page1.html
- page2.html  
- page3.html
- page4.html

(Claude Code should copy these from the project files)

## Step 7: Configure Nginx

### Create Nginx Configuration
```bash
sudo bash -c 'cat > /etc/nginx/sites-available/research-system << EOF
server {
    listen 80;
    server_name onderzoek.leeschallenges.nl;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    location /health {
        access_log off;
        proxy_pass http://localhost:3000/health;
    }
}
EOF'
```

### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/research-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 8: SSL Certificate
```bash
sudo certbot --nginx -d onderzoek.leeschallenges.nl
```

When prompted:
- Enter email: jeroenstorm@gmail.com (or your email)
- Agree to terms: Y
- Share email with EFF: Y (optional)

## Step 9: Start Application with PM2
```bash
cd /home/stormadvies/research-system
pm2 start server.js --name research-system
pm2 save
pm2 startup
```

Run the command that PM2 outputs for startup configuration:
```bash
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u stormadvies --hp /home/stormadvies
```

## Step 10: Test Everything
```bash
# Test health endpoint
curl https://onderzoek.leeschallenges.nl/health

# Check PM2 status
pm2 status

# Check logs
pm2 logs research-system
```

## Step 11: Create Backup Script (Optional)
```bash
cat > /home/stormadvies/backup-research.sh << 'EOF'
#!/bin/bash
# Backup script voor research database
BACKUP_DIR="/home/stormadvies/backups"
DB_PATH="/home/stormadvies/research-system/research.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp $DB_PATH "$BACKUP_DIR/research_backup_$DATE.db"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "research_backup_*.db" -mtime +7 -delete
echo "Backup completed: research_backup_$DATE.db"
EOF

chmod +x /home/stormadvies/backup-research.sh

# Add to crontab for daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /home/stormadvies/backup-research.sh") | crontab -
```

## DNS Configuration
Make sure the following DNS record is configured in TransIP:
- **Type**: A
- **Name**: onderzoek
- **Value**: 84.247.14.172
- **TTL**: 1 Day

## Important Notes

1. **File Updates**: The database and configuration files should be replaced with the new versions that Claude knows about.

2. **User Permission**: Make sure all files are owned by the stormadvies user:
   ```bash
   chown -R stormadvies:stormadvies /home/stormadvies/research-system
   ```

3. **Monitoring**: 
   - PM2 logs: `pm2 logs research-system`
   - Nginx logs: `sudo tail -f /var/log/nginx/access.log`
   - System logs: `sudo journalctl -f`

4. **Maintenance Commands**:
   - Restart app: `pm2 restart research-system`
   - Stop app: `pm2 stop research-system`
   - Update system: `sudo apt update && sudo apt upgrade`
   
5. **Security**: The firewall is configured to only allow SSH (22), HTTP (80), and HTTPS (443).

## System Status Checks
```bash
# Check all services
systemctl status nginx
pm2 status
sudo ufw status

# Check disk space
df -h

# Check memory
free -m
```

## Troubleshooting

### If Node.js app won't start:
```bash
cd /home/stormadvies/research-system
npm install
node server.js  # Test manually first
```

### If Nginx shows 404:
```bash
# Check if Node.js is running
ps aux | grep node
curl http://localhost:3000/health
```

### Database issues:
```bash
ls -la research.db
sqlite3 research.db ".tables"
```

The system should now be fully operational at https://onderzoek.leeschallenges.nl
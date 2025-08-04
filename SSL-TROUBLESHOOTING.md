# SSL en Toegankelijkheid Troubleshooting - onderzoek.leeschallenges.nl

## 🚨 Probleem Samenvatting

Dit document behandelt de oplossingen voor twee hoofdproblemen met toegang tot onderzoek.leeschallenges.nl:

1. **SSL Certificate Error**: "This Connection Is Not Private"
2. **FortiGuard Blokkering**: "Access Blocked - Newly Registered Domain"

## 🔒 SSL Certificate Probleem

### Symptomen
- Safari toont "This Connection Is Not Private" 
- Website certificaat is niet geldig
- Gebruikers kunnen website niet veilig bezoeken

### Oorzaak
- Ontbrekende of verlopen SSL certificaat
- Nginx niet geconfigureerd voor HTTPS
- Let's Encrypt certificaat niet geïnstalleerd

### ✅ Oplossing

#### 1. Automatische SSL Setup
```bash
# Op de VPS uitvoeren als root:
sudo ./setup-ssl.sh
```

Dit script:
- Installeert Let's Encrypt certificaat
- Configureert Nginx voor HTTPS
- Zet automatische certificaat vernieuwing op
- Test de SSL configuratie

#### 2. Handmatige SSL Setup (fallback)
```bash
# 1. Installeer certbot
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# 2. Stop nginx tijdelijk
sudo systemctl stop nginx

# 3. Genereer certificaat
sudo certbot certonly --standalone --agree-tos --email jeroen@stormadvies.nl -d onderzoek.leeschallenges.nl

# 4. Configureer nginx (zie setup-ssl.sh voor complete config)
sudo nano /etc/nginx/sites-available/onderzoek.leeschallenges.nl

# 5. Activeer configuratie
sudo ln -sf /etc/nginx/sites-available/onderzoek.leeschallenges.nl /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl start nginx
```

#### 3. Certificaat Vernieuwing
```bash
# Automatisch via cron (al ingesteld door script):
0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'

# Handmatig testen:
sudo certbot renew --dry-run
```

### Verificatie
```bash
# SSL status controleren:
curl -I https://onderzoek.leeschallenges.nl/api/health

# Certificaat details:
sudo certbot certificates

# Nginx status:
sudo systemctl status nginx
```

## 🛡️ FortiGuard Blokkering

### Symptomen
- "FortiGuard Intrusion Prevention - Access Blocked"
- Categorisatie: "Newly Registered Domain"
- URL geblokkeerd door bedrijfs-/school netwerk

### Oorzaak
FortiGuard (Fortinet firewall) blokkeert automatisch nieuwe domeinen ter bescherming tegen:
- Phishing websites
- Malware distributie
- Ongecontroleerde content

### ✅ Oplossingen

#### 1. Directe Oplossingen voor Gebruikers

**Option A: Alternatieve Netwerk Verbinding**
```bash
# Gebruik mobiele hotspot of ander netwerk
# Test: https://onderzoek.leeschallenges.nl/test/three-questions.html
```

**Option B: Vraag Netwerkbeheerder om Whitelist**
```
Domein: onderzoek.leeschallenges.nl
Reden: Educatief platform voor leesonderzoek
Contact: jeroen@stormadvies.nl
```

#### 2. Preventieve Maatregelen

**Domain Reputation Verbetering:**
- Wacht 2-4 weken voor automatische deblokering
- Zorg voor consistente SSL certificaat status
- Vermijd verdachte content patronen
- Zorg voor correcte DNS configuratie

**Alternatieve Domeinen (future):**
```bash
# Overweeg subdomain op gevestigd domein:
platform.leeschallenges.nl  # i.p.v. onderzoek.leeschallenges.nl
bibendo.leeschallenges.nl
```

#### 3. Rapportage aan FortiGuard
```bash
# FortiGuard URL Categorisatie Verzoek:
# https://www.fortiguard.com/webfilter/
# Request: Herclassificatie naar "Education" categorie
```

### 🔧 Technische Workarounds

#### IP-Based Access (tijdelijk)
```bash
# Directe IP toegang (als DNS geblokkeerd):
# Note: SSL certificaat werkt alleen met domain naam
http://84.247.14.172:3000/test/three-questions.html
```

#### Proxy Setup (geavanceerd)
```nginx
# Reverse proxy via ander domein:
server {
    server_name alternatief.domein.nl;
    location /onderzoek/ {
        proxy_pass https://onderzoek.leeschallenges.nl/;
    }
}
```

## 📊 Monitoring en Alerting

### SSL Monitoring
```bash
# Certificaat expiry check:
echo | openssl s_client -servername onderzoek.leeschallenges.nl -connect onderzoek.leeschallenges.nl:443 2>/dev/null | openssl x509 -noout -dates

# Automated monitoring script:
#!/bin/bash
EXPIRY=$(echo | openssl s_client -servername onderzoek.leeschallenges.nl -connect onderzoek.leeschallenges.nl:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
    echo "WARNING: SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
fi
```

### Toegankelijkheid Testing
```bash
# Test script voor verschillende netwerken:
#!/bin/bash
echo "Testing onderzoek.leeschallenges.nl accessibility..."
curl -I https://onderzoek.leeschallenges.nl/api/health
echo "Status: $?"

# Via externe service:
curl -I "https://httpstatus.io/onderzoek.leeschallenges.nl"
```

## 🎯 Preventieve Maatregelen

### 1. SSL Certificate Management
- **Automatische vernieuwing** via certbot cron job
- **Monitoring** van expiry dates (30 dagen van tevoren waarschuwen)
- **Backup certificaten** opslaan in secure location
- **Testomgeving** met identieke SSL setup

### 2. Domain Reputation Management
- **Consistent uptime** behouden
- **Geen verdachte traffic patterns**
- **Correcte DNS/SPF/DKIM records**
- **Transparante contact informatie**

### 3. Alternative Access Methods
```bash
# Meerdere toegangsmethoden voorbereiden:
1. Hoofddomein: onderzoek.leeschallenges.nl
2. Alternatief: platform.leeschallenges.nl  
3. IP backup: http://84.247.14.172:3000 (development only)
4. CDN/Proxy: via cloudflare of andere service
```

## 🆘 Emergency Procedures

### Immediate SSL Fix
```bash
# Quick SSL restoration:
sudo systemctl stop nginx
sudo certbot certonly --standalone -d onderzoek.leeschallenges.nl --force-renewal
sudo systemctl start nginx
```

### FortiGuard Emergency Access
```bash
# Voor kritieke situaties:
1. Gebruik mobiele hotspot
2. Contact netwerkbeheerder
3. Test via alternatieve locatie
4. Gebruik development server (http://84.247.14.172:3000)
```

### Contact Information
```
Primary: jeroen@stormadvies.nl
VPS Provider: TransIP Support
Domain Registrar: Check whois onderzoek.leeschallenges.nl
```

## 📋 Checklist voor Deployment

### Pre-Deployment
- [ ] DNS records correct geconfigureerd
- [ ] VPS firewall ports 80/443 open
- [ ] Nginx geïnstalleerd en geconfigureerd
- [ ] Email voor Let's Encrypt notifications klaar

### During Deployment  
- [ ] SSL script uitgevoerd (`./setup-ssl.sh`)
- [ ] Certificaat gegenereerd en getest
- [ ] Nginx configuratie geactiveerd
- [ ] HTTPS redirect werkend
- [ ] PM2 backend service actief

### Post-Deployment
- [ ] HTTPS toegang getest
- [ ] SSL certificaat geldig (A+ rating via SSL Labs)
- [ ] Automatische renewal ingesteld
- [ ] FortiGuard status gecontroleerd
- [ ] Monitoring alerts geconfigureerd

## 🔄 Maintenance Schedule

### Weekly
- [ ] SSL certificaat status check
- [ ] Website accessibility test
- [ ] Nginx/PM2 health check

### Monthly  
- [ ] Certificate renewal test (dry-run)
- [ ] FortiGuard categorisatie check
- [ ] Backup certificaten update

### Quarterly
- [ ] SSL configuratie security review
- [ ] Alternative access methods test
- [ ] Documentation update

---

**Last Updated**: 2025-08-04  
**Version**: 1.0  
**Author**: Claude Code Assistant
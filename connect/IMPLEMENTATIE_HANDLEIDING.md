# 🎮 Bibendo Game Data Integratie - Implementatie Handleiding

## Overzicht
Deze integratie voegt Bibendo game keuzes toe aan je bestaande onderzoeksapplicatie timeline.

## 📦 Geleverde Bestanden

### 1. **bibendo-token-manager.js**
   - Beheert Bearer tokens veilig server-side
   - Automatische token expiratie check
   - Validatie bij Bibendo API

### 2. **bibendo-sync.js**
   - Synchroniseert game data van Bibendo naar lokale database
   - Haalt game runs en player choices op
   - Integreert met bestaande timeline events

### 3. **bibendo-schema.sql**
   - Database uitbreiding voor Bibendo data
   - Nieuwe tabellen: `bibendo_tokens`, `bibendo_game_runs`, `bibendo_game_choices`
   - Gecombineerde timeline view

### 4. **bibendo-endpoints.js**
   - Nieuwe API endpoints voor je server.js
   - Auth, sync, timeline, en test endpoints
   - Klaar om te integreren

### 5. **bibendo-timeline-frontend.js**
   - Frontend JavaScript voor timeline visualisatie
   - Toont game keuzes met vragen en antwoorden
   - Mooie styling met paarse accenten voor game events

### 6. **test-bibendo-api.js**
   - Test script om Bibendo API endpoints te verkennen
   - Helpt bij het vinden van de juiste endpoints

### 7. **test-bibendo-integration.html**
   - Complete test interface
   - Stap-voor-stap testen van de integratie

## 🚀 Implementatie Stappen

### Stap 1: Database Setup
```bash
# Voeg de nieuwe tabellen toe aan je database
sqlite3 database/bibendo.db < bibendo-schema.sql
```

### Stap 2: Backend Integratie
1. Kopieer `bibendo-token-manager.js` en `bibendo-sync.js` naar je backend folder
2. Installeer dependencies (indien nodig):
   ```bash
   npm install node-fetch
   ```
3. Voeg de code uit `bibendo-endpoints.js` toe aan je `server.js`:
   ```javascript
   // Bovenaan server.js toevoegen:
   const BibendoTokenManager = require('./bibendo-token-manager');
   const BibendoDataSync = require('./bibendo-sync');
   
   const tokenManager = new BibendoTokenManager();
   const bibendoSync = new BibendoDataSync('./database/bibendo.db', tokenManager);
   
   // Kopieer dan alle endpoints uit bibendo-endpoints.js
   ```

### Stap 3: Frontend Integratie
1. Kopieer `bibendo-timeline-frontend.js` naar je frontend assets folder
2. Voeg het script toe aan je `user-timeline.html`:
   ```html
   <script src="/assets/js/bibendo-timeline-frontend.js"></script>
   ```

### Stap 4: Testen
1. Open `test-bibendo-integration.html` in je browser
2. Volg de 4 stappen:
   - Authenticeer met je Bibendo token
   - Test de connectie
   - Synchroniseer data
   - Bekijk de timeline

## 🔧 Configuratie

### Bearer Token Verkrijgen
1. Log in op Bibendo (www.bibendo.nl)
2. Open Developer Tools (F12)
3. Ga naar Network tab
4. Doe een actie in Bibendo
5. Zoek een API call en kopieer de Bearer token uit de Authorization header

### API Endpoints Aanpassen
De exacte Bibendo API endpoints kunnen afwijken. Gebruik `test-bibendo-api.js` om te ontdekken:
```javascript
node test-bibendo-api.js
```

Pas dan de endpoints aan in `bibendo-sync.js`:
```javascript
// Bijvoorbeeld:
const runs = await this.fetchFromBibendo(`/games/${gameId}/runs`, token);
// of
const runs = await this.fetchFromBibendo(`/account/games/${gameId}/sessions`, token);
```

## 📊 Timeline Visualisatie

De timeline toont nu:
- 📝 **App Events** (bestaande): Pagina opens, notities, etc.
- 🎮 **Game Events** (nieuw): Vragen, antwoorden, punten

Voorbeeld timeline item:
```
🎮 Game Keuze - 26-10-2024 14:30
Vraag: Wat is de hoofdstad van Nederland?
Antwoord: Amsterdam ✅
+10 punten
```

## 🔄 Synchronisatie Opties

### Optie 1: Manual Sync (Aanbevolen voor testen)
- Gebruik de sync button in de interface
- Of call `/api/bibendo/sync` endpoint

### Optie 2: Periodieke Sync
Uncomment deze code in server.js:
```javascript
setInterval(async () => {
  // Auto-sync elke 5 minuten
  const users = await db.all('SELECT DISTINCT user_id FROM bibendo_tokens');
  for (const user of users) {
    await bibendoSync.fullSync(user.user_id);
  }
}, 5 * 60 * 1000);
```

## ❓ Volgende Stappen

1. **Test met echte Bearer token**
   - Verkrijg token uit Bibendo developer tools
   - Test welke endpoints werken

2. **Pas endpoints aan**
   - Gebruik test resultaten om correcte endpoints te vinden
   - Update `bibendo-sync.js` met werkende endpoints

3. **Verfijn data mapping**
   - Bekijk JSON responses van Bibendo
   - Pas veld mappings aan in sync module

4. **Voeg features toe**
   - Filter per game level
   - Score overzichten
   - Export functionaliteit

## 🐛 Troubleshooting

### Token errors
- Check of token niet expired is (min. 30 min geldig)
- Valideer token met test endpoint

### Geen data
- Check of de API endpoints correct zijn
- Gebruik test-bibendo-api.js om endpoints te verifiëren
- Controleer console voor errors

### Timeline toont geen game events
- Check database of bibendo_game_choices gevuld is
- Verifieer dat combined_timeline view werkt
- Check browser console voor JavaScript errors

## 📝 Notities

- User ID mapping: Bibendo userId wordt direct gebruikt (bijv. SUi0jz4F9lOhzWTLLkMxCZRz3Ix2)
- Tokens worden server-side opgeslagen voor veiligheid
- Alle game events krijgen paarse styling voor onderscheid

## 🎯 Resultaat

Na succesvolle implementatie heb je:
✅ Bibendo game keuzes in je timeline
✅ Vragen en antwoorden zichtbaar per gebruiker
✅ Gecombineerde weergave van app en game events
✅ Veilige server-side token opslag
✅ Flexibele sync opties

Veel succes met de implementatie! 🚀

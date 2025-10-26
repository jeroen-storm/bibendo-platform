// Bibendo Token Manager
// Beheert Bearer tokens voor Bibendo API toegang

const fs = require('fs');
const path = require('path');

class BibendoTokenManager {
  constructor() {
    // Opslag in een lokaal bestand (later vervangen door database)
    this.tokenFile = path.join(__dirname, 'database', '.bibendo_tokens.json');
    this.tokens = this.loadTokens();
  }

  loadTokens() {
    try {
      if (fs.existsSync(this.tokenFile)) {
        return JSON.parse(fs.readFileSync(this.tokenFile, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
    return {};
  }

  saveTokens() {
    try {
      const dir = path.dirname(this.tokenFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.tokenFile, JSON.stringify(this.tokens, null, 2));
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  // Sla een bearer token op voor een gebruiker
  setToken(userId, token, expiresAt = null) {
    this.tokens[userId] = {
      token: token,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString() // Default 30 min
    };
    this.saveTokens();
  }

  // Haal token op voor gebruiker
  getToken(userId) {
    const tokenData = this.tokens[userId];
    if (!tokenData) return null;

    // Check of token verlopen is
    if (tokenData.expiresAt && new Date(tokenData.expiresAt) < new Date()) {
      delete this.tokens[userId];
      this.saveTokens();
      return null;
    }

    return tokenData.token;
  }

  // Test functie om token te valideren bij Bibendo
  async validateToken(token) {
    try {
      const response = await fetch('https://serious-gaming-platform.appspot.com/api/account/accountDetails', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }
}

module.exports = BibendoTokenManager;

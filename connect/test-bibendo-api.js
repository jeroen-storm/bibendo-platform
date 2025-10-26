// Bibendo API Test Script
// Test verschillende endpoints om de data structuur te begrijpen

const fetch = require('node-fetch');

class BibendoAPITester {
  constructor(bearerToken) {
    this.token = bearerToken;
    this.baseUrl = 'https://api.bibendo.nl';
  }

  // Helper voor API calls
  async makeRequest(endpoint, method = 'GET', body = null) {
    const options = {
      method: method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      const data = await response.json();
      
      console.log(`\n=== ${endpoint} ===`);
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(data, null, 2));
      
      return { status: response.status, data };
    } catch (error) {
      console.error(`Error calling ${endpoint}:`, error);
      return null;
    }
  }

  // Test 1: Account Details
  async testAccountDetails() {
    console.log('\n🔍 TEST 1: Account Details');
    return await this.makeRequest('/account/accountdetails');
  }

  // Test 2: Games List (probeer verschillende endpoints)
  async testGames() {
    console.log('\n🔍 TEST 2: Games');
    
    // Probeer verschillende mogelijke endpoints
    const endpoints = [
      '/games',
      '/game/list',
      '/games/list',
      '/account/games'
    ];

    for (const endpoint of endpoints) {
      await this.makeRequest(endpoint);
    }
  }

  // Test 3: Game Runs / Sessions
  async testGameRuns(gameId) {
    console.log('\n🔍 TEST 3: Game Runs');
    
    // Probeer verschillende mogelijke endpoints
    const endpoints = [
      `/games/${gameId}/runs`,
      `/game/${gameId}/runs`,
      `/games/${gameId}/sessions`,
      `/runs?gameId=${gameId}`
    ];

    for (const endpoint of endpoints) {
      await this.makeRequest(endpoint);
    }
  }

  // Test 4: Player Choices/Answers
  async testPlayerChoices(gameId, runId) {
    console.log('\n🔍 TEST 4: Player Choices');
    
    const endpoints = [
      `/games/${gameId}/runs/${runId}`,
      `/games/${gameId}/runs/${runId}/choices`,
      `/games/${gameId}/runs/${runId}/answers`,
      `/runs/${runId}/responses`
    ];

    for (const endpoint of endpoints) {
      await this.makeRequest(endpoint);
    }
  }

  // Run alle tests
  async runAllTests(gameId = null, runId = null) {
    console.log('🚀 Starting Bibendo API Tests\n');
    console.log('Token:', this.token.substring(0, 10) + '...');
    
    await this.testAccountDetails();
    await this.testGames();
    
    if (gameId) {
      await this.testGameRuns(gameId);
      
      if (runId) {
        await this.testPlayerChoices(gameId, runId);
      }
    }
    
    console.log('\n✅ Tests completed!');
  }
}

// Gebruik het script
async function main() {
  // TODO: Vervang dit met je echte bearer token
  const BEARER_TOKEN = 'YOUR_BEARER_TOKEN_HERE';
  
  // TODO: Als je een game ID en run ID hebt, vul ze hier in
  const GAME_ID = null;  // bijv. '123456'
  const RUN_ID = null;   // bijv. '789012'
  
  const tester = new BibendoAPITester(BEARER_TOKEN);
  await tester.runAllTests(GAME_ID, RUN_ID);
}

// Alleen uitvoeren als direct aangeroepen
if (require.main === module) {
  main().catch(console.error);
}

module.exports = BibendoAPITester;

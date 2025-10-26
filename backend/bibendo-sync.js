// Bibendo Data Sync Module
// Synchroniseert game data van Bibendo API naar lokale database

const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');

class BibendoDataSync {
  constructor(dbPath, tokenManager) {
    this.db = new sqlite3.Database(dbPath);
    this.tokenManager = tokenManager;
    this.baseUrl = 'https://serious-gaming-platform.appspot.com/api';
  }

  // Helper voor API calls
  async fetchFromBibendo(endpoint, token) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      return null;
    }
  }

  // Haal alle games op voor een gebruiker
  async syncAllGames(userId) {
    console.log(`🔄 Syncing all games for user ${userId}`);

    const token = this.tokenManager.getToken(userId);
    if (!token) {
      console.error('No valid token for user');
      return null;
    }

    // Haal alle games op
    const gamesData = await this.fetchFromBibendo(`/game/list`, token);

    if (!gamesData || !gamesData.games) {
      console.error('Failed to fetch games');
      return null;
    }

    return gamesData.games;
  }

  // Synchroniseer game runs voor een specifieke game
  async syncGameRuns(userId, gameId) {
    console.log(`🔄 Syncing game runs for user ${userId}, game ${gameId}`);

    const token = this.tokenManager.getToken(userId);
    if (!token) {
      console.error('No valid token for user');
      return false;
    }

    // Use correct Bibendo API endpoint (tested and working!)
    const runsData = await this.fetchFromBibendo(`/runs/${gameId}/list`, token);

    if (!runsData || !runsData.items) {
      console.error('Failed to fetch runs');
      return false;
    }

    // Sla runs op in database
    for (const run of runsData.items) {
      await this.saveGameRun(userId, run);
    }

    console.log(`✅ Saved ${runsData.items.length} runs for game ${gameId}`);
    return true;
  }

  // Sla een game run op
  saveGameRun(userId, runData) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO bibendo_game_runs 
        (user_id, game_id, run_id, started_at, completed_at, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        userId,
        runData.gameId || runData.game_id,
        runData.runId || runData.run_id || runData.id,
        runData.startedAt || runData.started_at,
        runData.completedAt || runData.completed_at,
        runData.status || 'active'
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Synchroniseer keuzes/antwoorden voor een run
  async syncGameChoices(userId, gameId, runId) {
    console.log(`🔄 Syncing choices for run ${runId} (game ${gameId})`);

    const token = this.tokenManager.getToken(userId);
    if (!token) {
      console.error('No valid token for user');
      return false;
    }

    // Step 1: Haal eerst alle items (vragen) van de game op
    const itemsData = await this.fetchFromBibendo(`/generalItems/gameId/${gameId}`, token);

    if (!itemsData || !itemsData.generalItems) {
      console.error('Failed to fetch game items');
      return false;
    }

    const items = itemsData.generalItems;
    console.log(`   Found ${items.length} items in game`);

    let totalResponses = 0;

    // Step 2: Voor elk item, haal responses op
    for (const item of items) {
      const responsesData = await this.fetchFromBibendo(
        `/run/response/runId/${runId}/item/${item.id}/me`,
        token
      );

      if (responsesData && responsesData.responses) {
        const responses = responsesData.responses;

        // Sla elke response op met volledige item data
        for (const response of responses) {
          await this.saveGameChoice(userId, runId, response, item);
          totalResponses++;
        }
      }
    }

    console.log(`   ✅ Saved ${totalResponses} responses for run ${runId}`);

    // Voeg timeline event toe
    if (totalResponses > 0) {
      await this.addTimelineEvent(userId, 'bibendo_sync', {
        run_id: runId,
        game_id: gameId,
        choices_count: totalResponses
      });
    }

    return true;
  }

  // Sla een game keuze/antwoord op
  saveGameChoice(userId, runId, response, item) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO bibendo_game_choices
        (user_id, run_id, question_id, question_text, answer_text,
         answer_value, is_correct, points, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Extract question text from item
      const questionId = response.generalItemId || item.id;
      const questionText = item.text || item.name || item.title || '';

      // Match responseValue with item.answers to get answer text and isCorrect
      let answerText = response.responseValue || '';
      let isCorrect = null;
      let points = 0;

      if (item.answers && Array.isArray(item.answers)) {
        const matchedAnswer = item.answers.find(a => a.id === response.responseValue);
        if (matchedAnswer) {
          answerText = matchedAnswer.answer;
          isCorrect = matchedAnswer.isCorrect;
          points = matchedAnswer.points || 0;
        }
      }

      const answerValue = response.responseValue;
      const timestamp = response.timestamp || new Date().toISOString();

      // Metadata with item and response info
      const metadata = {
        itemType: item.type,
        itemId: item.id,
        itemName: item.name,
        responseId: response.responseId,
        rawResponseValue: response.responseValue
      };

      this.db.run(sql, [
        userId,
        runId,
        questionId,
        questionText,
        answerText,
        answerValue,
        isCorrect,
        points,
        timestamp,
        JSON.stringify(metadata)
      ], (err) => {
        if (err) {
          console.error('Error saving choice:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Voeg timeline event toe
  addTimelineEvent(userId, eventType, eventData, pageId = 'bibendo_sync') {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO timeline_events (user_id, page_id, event_type, event_data, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [
        userId,
        pageId,
        eventType,
        JSON.stringify(eventData),
        new Date().toISOString()
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Haal gecombineerde timeline op
  getCombinedTimeline(userId, limit = 50) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM combined_timeline 
        WHERE user_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `;
      
      this.db.all(sql, [userId, limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Full sync voor een gebruiker
  async fullSync(userId) {
    console.log(`🚀 Starting full sync for user ${userId}`);

    try {
      // 1. Haal alle games op
      const games = await this.syncAllGames(userId);

      if (!games || games.length === 0) {
        console.log('⚠️  No games found for user');
        return true;
      }

      console.log(`📊 Found ${games.length} games`);

      // 2. Voor elke game, haal runs op
      for (const game of games) {
        console.log(`\n🎮 Processing game: ${game.title} (${game.gameId})`);
        await this.syncGameRuns(userId, game.gameId);
      }

      // 3. Haal alle runs op en sync responses/choices
      console.log(`\n📥 Syncing responses for all runs...`);
      const runs = await this.getUserRuns(userId);
      console.log(`   Found ${runs.length} total runs`);

      for (const run of runs) {
        console.log(`\n   📝 Syncing responses for run ${run.run_id} (game ${run.game_id})...`);
        await this.syncGameChoices(userId, run.game_id, run.run_id);
      }

      console.log(`\n✅ Full sync completed for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Full sync error:', error);
      return false;
    }
  }

  // Helper: Haal user runs op uit lokale database
  getUserRuns(userId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM bibendo_game_runs WHERE user_id = ?`;
      this.db.all(sql, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
}

module.exports = BibendoDataSync;

// Bibendo Data Sync Module
// Synchroniseert game data van Bibendo API naar lokale database

const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');

class BibendoDataSync {
  constructor(dbPath, tokenManager) {
    this.db = new sqlite3.Database(dbPath);
    this.tokenManager = tokenManager;
    this.baseUrl = 'https://api.bibendo.nl';
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

  // Synchroniseer game runs voor een gebruiker
  async syncGameRuns(userId) {
    console.log(`🔄 Syncing game runs for user ${userId}`);
    
    const token = this.tokenManager.getToken(userId);
    if (!token) {
      console.error('No valid token for user');
      return false;
    }

    // TODO: Pas dit endpoint aan naar wat werkelijk werkt
    const runs = await this.fetchFromBibendo(`/games/runs?userId=${userId}`, token);
    
    if (!runs) return false;

    // Sla runs op in database
    for (const run of runs) {
      await this.saveGameRun(userId, run);
    }
    
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
  async syncGameChoices(userId, runId) {
    console.log(`🔄 Syncing choices for run ${runId}`);
    
    const token = this.tokenManager.getToken(userId);
    if (!token) {
      console.error('No valid token for user');
      return false;
    }

    // TODO: Pas dit endpoint aan naar wat werkelijk werkt
    const choices = await this.fetchFromBibendo(`/runs/${runId}/choices`, token);
    
    if (!choices) return false;

    // Sla keuzes op in database
    for (const choice of choices) {
      await this.saveGameChoice(userId, runId, choice);
    }
    
    // Voeg een timeline event toe voor deze sync
    await this.addTimelineEvent(userId, 'bibendo_sync', {
      run_id: runId,
      choices_count: choices.length
    });
    
    return true;
  }

  // Sla een game keuze/antwoord op
  saveGameChoice(userId, runId, choiceData) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO bibendo_game_choices 
        (user_id, run_id, question_id, question_text, answer_text, 
         answer_value, is_correct, points, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        userId,
        runId,
        choiceData.questionId || choiceData.question_id,
        choiceData.questionText || choiceData.question,
        choiceData.answerText || choiceData.answer,
        choiceData.answerValue || choiceData.value,
        choiceData.isCorrect || choiceData.correct || false,
        choiceData.points || 0,
        choiceData.timestamp || new Date().toISOString(),
        JSON.stringify(choiceData.metadata || {})
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Voeg timeline event toe
  addTimelineEvent(userId, eventType, eventData) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO timeline_events (user_id, event_type, event_data, timestamp)
        VALUES (?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        userId,
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
      // 1. Sync game runs
      await this.syncGameRuns(userId);
      
      // 2. Haal alle runs op en sync choices voor elke run
      const runs = await this.getUserRuns(userId);
      for (const run of runs) {
        await this.syncGameChoices(userId, run.run_id);
      }
      
      console.log(`✅ Full sync completed for user ${userId}`);
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

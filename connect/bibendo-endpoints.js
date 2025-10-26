// Bibendo Integration Endpoints
// Voeg deze code toe aan je bestaande server.js

// ============= IMPORTS TOEVOEGEN =============
// Voeg deze imports toe bovenaan je server.js:
/*
const BibendoTokenManager = require('./bibendo-token-manager');
const BibendoDataSync = require('./bibendo-sync');

// Initialiseer Bibendo modules
const tokenManager = new BibendoTokenManager();
const bibendoSync = new BibendoDataSync('./database/bibendo.db', tokenManager);
*/

// ============= ENDPOINTS =============

// Endpoint 1: Set Bearer Token
// POST /api/bibendo/auth
app.post('/api/bibendo/auth', async (req, res) => {
  const { userId, bearerToken } = req.body;
  
  if (!userId || !bearerToken) {
    return res.status(400).json({ 
      error: 'userId and bearerToken are required' 
    });
  }

  try {
    // Valideer token bij Bibendo
    const isValid = await tokenManager.validateToken(bearerToken);
    
    if (!isValid) {
      return res.status(401).json({ 
        error: 'Invalid bearer token' 
      });
    }
    
    // Sla token op
    tokenManager.setToken(userId, bearerToken);
    
    res.json({ 
      success: true, 
      message: 'Token stored successfully',
      userId: userId 
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Endpoint 2: Manual Sync Trigger
// POST /api/bibendo/sync
app.post('/api/bibendo/sync', async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ 
      error: 'userId is required' 
    });
  }

  try {
    const success = await bibendoSync.fullSync(userId);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Sync completed successfully' 
      });
    } else {
      res.status(500).json({ 
        error: 'Sync failed' 
      });
    }
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Endpoint 3: Get Combined Timeline
// GET /api/bibendo/timeline/:userId
app.get('/api/bibendo/timeline/:userId', async (req, res) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  
  try {
    const timeline = await bibendoSync.getCombinedTimeline(userId, limit);
    res.json(timeline);
  } catch (error) {
    console.error('Timeline error:', error);
    res.status(500).json({ error: 'Failed to get timeline' });
  }
});

// Endpoint 4: Get Game Choices
// GET /api/bibendo/choices/:userId/:runId?
app.get('/api/bibendo/choices/:userId/:runId?', async (req, res) => {
  const { userId, runId } = req.params;
  
  try {
    let sql, params;
    
    if (runId) {
      sql = `
        SELECT * FROM bibendo_game_choices 
        WHERE user_id = ? AND run_id = ?
        ORDER BY timestamp DESC
      `;
      params = [userId, runId];
    } else {
      sql = `
        SELECT * FROM bibendo_game_choices 
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT 100
      `;
      params = [userId];
    }
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
      } else {
        res.json(rows || []);
      }
    });
  } catch (error) {
    console.error('Choices error:', error);
    res.status(500).json({ error: 'Failed to get choices' });
  }
});

// Endpoint 5: Test Bibendo Connection
// GET /api/bibendo/test/:userId
app.get('/api/bibendo/test/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const token = tokenManager.getToken(userId);
    
    if (!token) {
      return res.status(401).json({ 
        error: 'No token found for user' 
      });
    }
    
    const isValid = await tokenManager.validateToken(token);
    
    res.json({ 
      success: isValid,
      hasToken: true,
      message: isValid ? 'Token is valid' : 'Token is expired or invalid'
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: 'Test failed' });
  }
});

// ============= SCHEDULED SYNC (OPTIONEEL) =============
// Voor automatische periodieke sync (elke 5 minuten)
/*
setInterval(async () => {
  console.log('⏰ Running scheduled Bibendo sync...');
  
  // Haal alle users op met tokens
  const users = await db.all('SELECT DISTINCT user_id FROM bibendo_tokens');
  
  for (const user of users) {
    await bibendoSync.fullSync(user.user_id);
  }
}, 5 * 60 * 1000); // 5 minuten
*/

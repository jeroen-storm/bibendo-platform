const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');
require('dotenv').config();

// Bibendo integration modules
const BibendoTokenManager = require('./bibendo-token-manager');
const BibendoDataSync = require('./bibendo-sync');

// Setup DOMPurify for server-side HTML sanitization
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup - optimized for concurrent access
const dbPath = path.join(__dirname, 'database', 'bibendo.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        // Enable WAL mode for better concurrent access
        db.run('PRAGMA journal_mode = WAL;');
        db.run('PRAGMA synchronous = NORMAL;');
        db.run('PRAGMA cache_size = 1000;');
        db.run('PRAGMA temp_store = memory;');
    }
});

// Initialize database with V2 schema
const schemaV2 = fs.readFileSync(path.join(__dirname, 'database', 'schema-v2.sql'), 'utf8');
db.exec(schemaV2, (err) => {
    if (err) {
        console.error('Error initializing database:', err);
    } else {
        console.log('Database initialized successfully with schema V2');
    }
});

// Initialize Bibendo modules
const tokenManager = new BibendoTokenManager();
const bibendoSync = new BibendoDataSync(dbPath, tokenManager);

// Middleware - disable helmet for development
// app.use(helmet());
app.use(cors({
    origin: true, // Allow all origins for development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting: Optimized for classroom use (30-50 concurrent users)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Increased from 100 to 500 for classroom use
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Skip rate limiting for static files
    skip: (req) => req.url.startsWith('/assets/') || req.url.includes('.css') || req.url.includes('.js') || req.url.includes('.json')
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Helper function to ensure user exists
const ensureUser = (userId, callback) => {
    db.run(
        'INSERT OR IGNORE INTO users (user_id) VALUES (?)',
        [userId],
        function(err) {
            if (err) {
                console.error('Error creating user:', err);
                return callback(err);
            }
            
            // Update last_active
            db.run(
                'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE user_id = ?',
                [userId],
                callback
            );
        }
    );
};

// Helper function to extract level from page_id
const extractLevel = (pageId) => {
    if (pageId.includes('level1')) return 1;
    if (pageId.includes('level2')) return 2;
    if (pageId.includes('level3')) return 3;
    if (pageId === 'final_assignment') return 4;
    return 1;
};

// Content sanitization functions
const sanitizeContent = (content) => {
    if (!content || typeof content !== 'string') return '';
    
    // Remove dangerous HTML/JS while keeping basic formatting
    const cleaned = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [],  // No HTML tags allowed
        ALLOWED_ATTR: [],  // No attributes allowed
        KEEP_CONTENT: true // Keep text content
    });
    
    // Additional safety: limit content size
    return cleaned.substring(0, 10000);
};

const sanitizeUserId = (userId) => {
    if (!userId || typeof userId !== 'string') return 'anonymous';
    
    // Allow only alphanumeric, underscore, hyphen
    return userId.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 100) || 'anonymous';
};

const sanitizePageId = (pageId) => {
    if (!pageId || typeof pageId !== 'string') return 'unknown';
    
    // Allow only alphanumeric, underscore, hyphen
    return pageId.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 100) || 'unknown';
};

// API Routes

// ============================================
// NEW V2 API ENDPOINTS (Timeline-based)
// ============================================

// Save content with versioning
app.post('/api/content/save', (req, res) => {
    const { userId, pageId, content, contentType, fieldNumber } = req.body;

    if (!userId || !pageId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const sanitizedUserId = sanitizeUserId(userId);
    const sanitizedPageId = sanitizePageId(pageId);
    const sanitizedContent = sanitizeContent(content);
    const sanitizedContentType = contentType || 'note';
    const sanitizedFieldNumber = fieldNumber ? parseInt(fieldNumber) : null;

    console.log('Saving content:', { userId: sanitizedUserId, pageId: sanitizedPageId, contentType: sanitizedContentType });

    ensureUser(sanitizedUserId, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        // Get current version
        db.get(
            `SELECT MAX(version) as max_version FROM content
             WHERE user_id = ? AND page_id = ? AND (field_number = ? OR (field_number IS NULL AND ? IS NULL))`,
            [sanitizedUserId, sanitizedPageId, sanitizedFieldNumber, sanitizedFieldNumber],
            (err, row) => {
                if (err) {
                    console.error('Error getting version:', err);
                    return res.status(500).json({ error: 'Failed to get version' });
                }

                const newVersion = (row?.max_version || 0) + 1;

                // Insert new version
                db.run(
                    `INSERT INTO content
                     (user_id, page_id, content_type, content, field_number, version, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [sanitizedUserId, sanitizedPageId, sanitizedContentType, sanitizedContent, sanitizedFieldNumber, newVersion],
                    function(err) {
                        if (err) {
                            console.error('Error saving content:', err);
                            return res.status(500).json({ error: 'Failed to save content' });
                        }

                        res.json({
                            success: true,
                            id: this.lastID,
                            version: newVersion,
                            message: 'Content saved successfully'
                        });
                    }
                );
            }
        );
    });
});

// Get latest content for a page
app.get('/api/content/:userId/:pageId', (req, res) => {
    const { userId, pageId } = req.params;
    const { fieldNumber } = req.query;

    const sanitizedUserId = sanitizeUserId(userId);
    const sanitizedPageId = sanitizePageId(pageId);

    let query = `SELECT * FROM latest_content WHERE user_id = ? AND page_id = ?`;
    let params = [sanitizedUserId, sanitizedPageId];

    if (fieldNumber !== undefined) {
        query += ` AND field_number = ?`;
        params.push(parseInt(fieldNumber));
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching content:', err);
            return res.status(500).json({ error: 'Failed to fetch content' });
        }

        res.json(rows || []);
    });
});

// Get all content for a user
app.get('/api/content/:userId', (req, res) => {
    const { userId } = req.params;
    const sanitizedUserId = sanitizeUserId(userId);

    db.all(
        `SELECT * FROM latest_content WHERE user_id = ? ORDER BY updated_at DESC`,
        [sanitizedUserId],
        (err, rows) => {
            if (err) {
                console.error('Error fetching user content:', err);
                return res.status(500).json({ error: 'Failed to fetch content' });
            }

            res.json(rows || []);
        }
    );
});

// Get content version history
app.get('/api/content/:userId/:pageId/history', (req, res) => {
    const { userId, pageId } = req.params;
    const { fieldNumber } = req.query;

    const sanitizedUserId = sanitizeUserId(userId);
    const sanitizedPageId = sanitizePageId(pageId);

    let query = `SELECT * FROM content WHERE user_id = ? AND page_id = ?`;
    let params = [sanitizedUserId, sanitizedPageId];

    if (fieldNumber !== undefined) {
        query += ` AND field_number = ?`;
        params.push(parseInt(fieldNumber));
    }

    query += ` ORDER BY version DESC`;

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching content history:', err);
            return res.status(500).json({ error: 'Failed to fetch history' });
        }

        res.json(rows || []);
    });
});

// Log timeline event
app.post('/api/timeline/event', (req, res) => {
    const { userId, pageId, eventType, duration, eventData } = req.body;

    if (!userId || !pageId || !eventType) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const sanitizedUserId = sanitizeUserId(userId);
    const sanitizedPageId = sanitizePageId(pageId);
    const sanitizedDuration = duration ? parseInt(duration) : null;
    const sanitizedEventData = eventData ? JSON.stringify(eventData) : null;

    ensureUser(sanitizedUserId, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        db.run(
            `INSERT INTO timeline_events (user_id, page_id, event_type, duration, event_data)
             VALUES (?, ?, ?, ?, ?)`,
            [sanitizedUserId, sanitizedPageId, eventType, sanitizedDuration, sanitizedEventData],
            function(err) {
                if (err) {
                    console.error('Error logging timeline event:', err);
                    return res.status(500).json({ error: 'Failed to log event' });
                }

                res.json({ success: true, id: this.lastID });
            }
        );
    });
});

// Get timeline for a user
app.get('/api/timeline/:userId', (req, res) => {
    const { userId } = req.params;
    const { limit } = req.query;

    const sanitizedUserId = sanitizeUserId(userId);
    const sanitizedLimit = limit ? parseInt(limit) : 1000;

    db.all(
        `SELECT * FROM timeline_events
         WHERE user_id = ?
         ORDER BY timestamp DESC
         LIMIT ?`,
        [sanitizedUserId, sanitizedLimit],
        (err, rows) => {
            if (err) {
                console.error('Error fetching timeline:', err);
                return res.status(500).json({ error: 'Failed to fetch timeline' });
            }

            res.json(rows || []);
        }
    );
});

// Get admin user timeline (with all details)
app.get('/api/admin/user/:userId/timeline', (req, res) => {
    const { userId } = req.params;

    db.all(
        `SELECT * FROM timeline_events
         WHERE user_id = ?
         ORDER BY timestamp ASC`,
        [userId],
        (err, rows) => {
            if (err) {
                console.error('Error fetching user timeline:', err);
                return res.status(500).json({ error: 'Failed to fetch timeline' });
            }

            res.json(rows || []);
        }
    );
});

// Get admin user content
app.get('/api/admin/user/:userId/content', (req, res) => {
    const { userId } = req.params;

    db.all(
        `SELECT * FROM latest_content WHERE user_id = ? ORDER BY page_id, field_number`,
        [userId],
        (err, rows) => {
            if (err) {
                console.error('Error fetching user content:', err);
                return res.status(500).json({ error: 'Failed to fetch content' });
            }

            res.json(rows || []);
        }
    );
});

// ============================================
// LEGACY V1 API ENDPOINTS (backwards compatible)
// ============================================

// Save note (legacy - redirects to new content API)
app.post('/api/notes/save', (req, res) => {
    const { userId, pageId, content, editCount, timeSpent } = req.body;

    if (!userId || !pageId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Sanitize all input
    const sanitizedUserId = sanitizeUserId(userId);
    const sanitizedPageId = sanitizePageId(pageId);
    const sanitizedContent = sanitizeContent(content);

    // Determine content type
    let contentType = 'note';
    if (sanitizedPageId.includes('analysis')) {
        contentType = 'analysis';
    } else if (sanitizedPageId.includes('message')) {
        contentType = 'message';
    } else if (sanitizedPageId.includes('final_assignment')) {
        contentType = 'assignment_field';
    }

    console.log('[LEGACY] Saving note:', { userId: sanitizedUserId, pageId: sanitizedPageId });

    // Forward to new content API
    ensureUser(sanitizedUserId, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        // Get current version
        db.get(
            `SELECT MAX(version) as max_version FROM content
             WHERE user_id = ? AND page_id = ? AND field_number IS NULL`,
            [sanitizedUserId, sanitizedPageId],
            (err, row) => {
                if (err) {
                    console.error('Error getting version:', err);
                    return res.status(500).json({ error: 'Failed to get version' });
                }

                const newVersion = (row?.max_version || 0) + 1;

                // Insert new version
                db.run(
                    `INSERT INTO content
                     (user_id, page_id, content_type, content, field_number, version, created_at, updated_at)
                     VALUES (?, ?, ?, ?, NULL, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [sanitizedUserId, sanitizedPageId, contentType, sanitizedContent, newVersion],
                    function(err) {
                        if (err) {
                            console.error('Error saving content:', err);
                            return res.status(500).json({ error: 'Failed to save note' });
                        }

                        res.json({
                            success: true,
                            id: this.lastID,
                            message: 'Note saved successfully'
                        });
                    }
                );
            }
        );
    });
});

// Get note (legacy - reads from new content table)
app.get('/api/notes/:userId/:pageId', (req, res) => {
    const { userId, pageId } = req.params;

    const sanitizedUserId = sanitizeUserId(userId);
    const sanitizedPageId = sanitizePageId(pageId);

    db.get(
        `SELECT * FROM latest_content
         WHERE user_id = ? AND page_id = ? AND field_number IS NULL`,
        [sanitizedUserId, sanitizedPageId],
        (err, row) => {
            if (err) {
                console.error('Error fetching note:', err);
                return res.status(500).json({ error: 'Failed to fetch note' });
            }

            // Return in old format for backwards compatibility
            res.json(row || { content: '' });
        }
    );
});

// Get notes by level for aggregation (legacy)
app.get('/api/notes/:userId/level/:level', (req, res) => {
    const { userId, level } = req.params;

    const sanitizedUserId = sanitizeUserId(userId);
    const sanitizedLevel = parseInt(level) || 1;

    db.all(
        `SELECT * FROM latest_content
         WHERE user_id = ? AND page_id LIKE ?
         AND page_id NOT LIKE '%analysis%'
         AND page_id NOT LIKE '%message%'
         AND page_id NOT LIKE '%plan%'
         AND page_id NOT LIKE '%final_assignment%'
         ORDER BY created_at`,
        [sanitizedUserId, `%level${sanitizedLevel}%`],
        (err, rows) => {
            if (err) {
                console.error('Error fetching notes by level:', err);
                return res.status(500).json({ error: 'Failed to fetch notes' });
            }

            res.json(rows || []);
        }
    );
});

// Log time spent (legacy - deprecated, use timeline events instead)
app.post('/api/logs/time', (req, res) => {
    // This endpoint is deprecated but kept for backwards compatibility
    // Time is now tracked via page_close events in timeline
    console.log('[LEGACY] /api/logs/time is deprecated - use /api/timeline/event with page_close instead');
    res.json({ success: true, message: 'Endpoint deprecated, use timeline events' });
});

// Log text interactions (legacy - redirects to timeline events)
app.post('/api/logs/text', (req, res) => {
    const { userId, pageId, actionType, data } = req.body;

    if (!userId || !pageId || !actionType) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const sanitizedUserId = sanitizeUserId(userId);
    const sanitizedPageId = sanitizePageId(pageId);

    console.log('[LEGACY] /api/logs/text redirecting to timeline events');

    ensureUser(sanitizedUserId, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        db.run(
            `INSERT INTO timeline_events (user_id, page_id, event_type, event_data)
             VALUES (?, ?, ?, ?)`,
            [sanitizedUserId, sanitizedPageId, actionType, JSON.stringify(data || {})],
            function(err) {
                if (err) {
                    console.error('Error logging timeline event:', err);
                    return res.status(500).json({ error: 'Failed to log interaction' });
                }

                res.json({ success: true });
            }
        );
    });
});

// Admin: Get all users
app.get('/api/admin/users', (req, res) => {
    db.all(
        'SELECT user_id, created_at, last_active FROM users ORDER BY last_active DESC',
        [],
        (err, rows) => {
            if (err) {
                console.error('Error fetching users:', err);
                return res.status(500).json({ error: 'Failed to fetch users' });
            }
            
            res.json(rows || []);
        }
    );
});

// Admin: Get user data (legacy - returns both old and new data)
app.get('/api/admin/user/:userId', (req, res) => {
    const { userId } = req.params;

    const queries = {
        user: 'SELECT * FROM users WHERE user_id = ?',
        content: 'SELECT * FROM latest_content WHERE user_id = ? ORDER BY updated_at DESC',
        timeline: 'SELECT * FROM timeline_events WHERE user_id = ? ORDER BY timestamp DESC LIMIT 200',
        // Keep old data for reference
        notes_legacy: 'SELECT * FROM notes_legacy WHERE user_id = ? ORDER BY updated_at DESC',
        textLogs_legacy: 'SELECT * FROM text_logs_legacy WHERE user_id = ? ORDER BY timestamp DESC LIMIT 100',
        timeLogs_legacy: 'SELECT * FROM time_logs_legacy WHERE user_id = ? ORDER BY timestamp DESC'
    };

    const userData = {};
    let completed = 0;
    const total = Object.keys(queries).length;

    Object.entries(queries).forEach(([key, query]) => {
        db.all(query, [userId], (err, rows) => {
            if (err) {
                console.error(`Error fetching ${key}:`, err);
                userData[key] = [];
            } else {
                userData[key] = rows || [];
            }

            completed++;
            if (completed === total) {
                res.json(userData);
            }
        });
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Dashboard statistics endpoint
app.get('/api/admin/stats', (req, res) => {
    try {
        const stats = {
            totalUsers: 0,
            activeUsers: 0,
            totalContent: 0,
            totalEvents: 0,
            finalAssignments: 0
        };

        // Total users
        const usersResult = db.prepare('SELECT COUNT(*) as count FROM users').get();
        stats.totalUsers = usersResult.count;

        // Active users (last 24 hours)
        const activeResult = db.prepare(`
            SELECT COUNT(DISTINCT user_id) as count
            FROM timeline_events
            WHERE timestamp >= datetime('now', '-1 day')
        `).get();
        stats.activeUsers = activeResult.count;

        // Total content items
        const contentResult = db.prepare('SELECT COUNT(*) as count FROM content').get();
        stats.totalContent = contentResult.count;

        // Total timeline events
        const eventsResult = db.prepare('SELECT COUNT(*) as count FROM timeline_events').get();
        stats.totalEvents = eventsResult.count;

        // Final assignments (users with assignment_field content)
        const assignmentsResult = db.prepare(`
            SELECT COUNT(DISTINCT user_id) as count
            FROM content
            WHERE content_type = 'assignment_field'
        `).get();
        stats.finalAssignments = assignmentsResult.count;

        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// ============================================
// BIBENDO INTEGRATION ENDPOINTS
// ============================================

// Endpoint 1: Set Bearer Token
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

// NEW ENDPOINT: One-step Bibendo Import
// Accepts only bearer token, extracts userId, and performs full sync
app.post('/api/bibendo/import', async (req, res) => {
    const { bearerToken } = req.body;

    if (!bearerToken) {
        return res.status(400).json({ error: 'Bearer token is required' });
    }

    try {
        // Step 1: Get userId from Bibendo API using the token
        console.log('🔍 Validating token and fetching user ID...');
        const fetch = require('node-fetch');
        const accountResponse = await fetch('https://serious-gaming-platform.appspot.com/api/account/accountDetails', {
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!accountResponse.ok) {
            return res.status(401).json({ error: 'Invalid bearer token' });
        }

        const accountData = await accountResponse.json();
        console.log('📋 Account data received:', JSON.stringify(accountData, null, 2));

        // Bibendo API uses firebaseId or localId as the user identifier
        const userId = accountData.firebaseId || accountData.localId || accountData.fullId || accountData.userId;

        if (!userId) {
            console.log('❌ Could not find userId. Available fields:', Object.keys(accountData));
            return res.status(400).json({
                error: 'Could not extract userId from token',
                availableFields: Object.keys(accountData)
            });
        }

        console.log(`✅ User ID: ${userId}`);

        // Step 2: Save token
        console.log('💾 Saving token...');
        tokenManager.setToken(userId, bearerToken);

        // Step 3: Perform full sync
        console.log('🔄 Starting full sync...');
        const syncSuccess = await bibendoSync.fullSync(userId);

        if (!syncSuccess) {
            return res.status(500).json({ error: 'Sync failed' });
        }

        // Step 4: Get sync statistics
        console.log('📊 Gathering statistics...');

        // Get games count
        const gamesCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(DISTINCT game_id) as count FROM bibendo_game_runs WHERE user_id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.count : 0);
                }
            );
        });

        // Get runs count
        const runsCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM bibendo_game_runs WHERE user_id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.count : 0);
                }
            );
        });

        // Get choices count
        const choicesCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM bibendo_game_choices WHERE user_id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.count : 0);
                }
            );
        });

        // Get time range
        const timeRange = await new Promise((resolve, reject) => {
            db.get(`
                SELECT
                    MIN(timestamp) as oldest,
                    MAX(timestamp) as newest
                FROM bibendo_game_choices
                WHERE user_id = ?
            `,
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        console.log('✅ Import completed successfully!');

        res.json({
            success: true,
            userId,
            gamesCount,
            runsCount,
            choicesCount,
            timeRange: timeRange ? {
                oldest: timeRange.oldest ? new Date(timeRange.oldest).toLocaleDateString('nl-NL') : 'N/A',
                newest: timeRange.newest ? new Date(timeRange.newest).toLocaleDateString('nl-NL') : 'N/A'
            } : null
        });

    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: error.message || 'Import failed' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Bibendo Platform API running on port ${PORT}`);
    console.log(`Access frontend at: http://localhost:${PORT}`);
});

module.exports = app;
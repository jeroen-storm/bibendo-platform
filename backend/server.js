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

// Initialize database
const initSQL = fs.readFileSync(path.join(__dirname, 'database', 'init.sql'), 'utf8');
db.exec(initSQL, (err) => {
    if (err) {
        console.error('Error initializing database:', err);
    } else {
        console.log('Database initialized successfully');
    }
});

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

// Save note
app.post('/api/notes/save', (req, res) => {
    const { userId, pageId, content, editCount, timeSpent } = req.body;
    
    if (!userId || !pageId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Sanitize all input to prevent XSS and injection attacks
    const sanitizedUserId = sanitizeUserId(userId);
    const sanitizedPageId = sanitizePageId(pageId);
    const sanitizedContent = sanitizeContent(content);
    const level = extractLevel(sanitizedPageId);
    
    console.log('Saving note:', { 
        originalUserId: userId, sanitizedUserId,
        originalPageId: pageId, sanitizedPageId,
        contentLength: content?.length || 0,
        sanitizedContentLength: sanitizedContent.length
    });
    
    ensureUser(sanitizedUserId, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        db.run(
            `INSERT OR REPLACE INTO notes 
             (user_id, page_id, level, content, edit_count, time_spent, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [sanitizedUserId, sanitizedPageId, level, sanitizedContent, editCount || 0, timeSpent || 0],
            function(err) {
                if (err) {
                    console.error('Error saving note:', err);
                    return res.status(500).json({ error: 'Failed to save note' });
                }
                
                res.json({ 
                    success: true, 
                    id: this.lastID,
                    message: 'Note saved successfully' 
                });
            }
        );
    });
});

// Get note
app.get('/api/notes/:userId/:pageId', (req, res) => {
    const { userId, pageId } = req.params;
    
    // Sanitize parameters
    const sanitizedUserId = sanitizeUserId(userId);
    const sanitizedPageId = sanitizePageId(pageId);
    
    db.get(
        'SELECT * FROM notes WHERE user_id = ? AND page_id = ?',
        [sanitizedUserId, sanitizedPageId],
        (err, row) => {
            if (err) {
                console.error('Error fetching note:', err);
                return res.status(500).json({ error: 'Failed to fetch note' });
            }
            
            res.json(row || { content: '' });
        }
    );
});

// Get notes by level for aggregation
app.get('/api/notes/:userId/level/:level', (req, res) => {
    const { userId, level } = req.params;
    
    // Sanitize parameters
    const sanitizedUserId = sanitizeUserId(userId);
    const sanitizedLevel = parseInt(level) || 1;
    
    db.all(
        'SELECT * FROM notes WHERE user_id = ? AND level = ? AND page_id NOT LIKE "%analysis%" AND page_id NOT LIKE "%message%" AND page_id NOT LIKE "%plan%" ORDER BY created_at',
        [sanitizedUserId, sanitizedLevel],
        (err, rows) => {
            if (err) {
                console.error('Error fetching notes by level:', err);
                return res.status(500).json({ error: 'Failed to fetch notes' });
            }
            
            res.json(rows || []);
        }
    );
});

// Log time spent
app.post('/api/logs/time', (req, res) => {
    const { userId, pageId, timeSpent, timestamp } = req.body;
    
    if (!userId || !pageId || !timeSpent) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Sanitize input
    const sanitizedUserId = sanitizeUserId(userId);
    const sanitizedPageId = sanitizePageId(pageId);
    const sanitizedTimeSpent = parseInt(timeSpent) || 0;
    const sanitizedTimestamp = timestamp || new Date().toISOString();
    
    ensureUser(sanitizedUserId, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        db.run(
            'INSERT INTO time_logs (user_id, page_id, time_spent, timestamp) VALUES (?, ?, ?, ?)',
            [sanitizedUserId, sanitizedPageId, sanitizedTimeSpent, sanitizedTimestamp],
            function(err) {
                if (err) {
                    console.error('Error logging time:', err);
                    return res.status(500).json({ error: 'Failed to log time' });
                }
                
                res.json({ success: true });
            }
        );
    });
});

// Log text interactions
app.post('/api/logs/text', (req, res) => {
    const { userId, pageId, actionType, data } = req.body;
    
    if (!userId || !pageId || !actionType) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    ensureUser(userId, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        db.run(
            'INSERT INTO text_logs (user_id, page_id, action_type, data) VALUES (?, ?, ?, ?)',
            [userId, pageId, actionType, JSON.stringify(data || {})],
            function(err) {
                if (err) {
                    console.error('Error logging text interaction:', err);
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

// Admin: Get user data
app.get('/api/admin/user/:userId', (req, res) => {
    const { userId } = req.params;
    
    const queries = {
        user: 'SELECT * FROM users WHERE user_id = ?',
        notes: 'SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC',
        textLogs: 'SELECT * FROM text_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 100',
        timeLogs: 'SELECT * FROM time_logs WHERE user_id = ? ORDER BY timestamp DESC'
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
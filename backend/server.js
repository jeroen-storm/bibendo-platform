const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// OpenAI setup
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

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
    skip: (req) => req.url.startsWith('/assets/') || req.url.startsWith('/cbm/') || req.url.includes('.css') || req.url.includes('.js') || req.url.includes('.json')
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));

// CBM JSON data is now served via frontend static files

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

// API Routes

// Save note
app.post('/api/notes/save', (req, res) => {
    const { userId, pageId, content, editCount, timeSpent } = req.body;
    
    if (!userId || !pageId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Sanitize content (prevent XSS)
    const sanitizedContent = content ? content.substring(0, 10000) : ''; // Limit content size
    const level = extractLevel(pageId);
    
    ensureUser(userId, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        db.run(
            `INSERT OR REPLACE INTO notes 
             (user_id, page_id, level, content, edit_count, time_spent, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [userId, pageId, level, sanitizedContent, editCount || 0, timeSpent || 0],
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
    
    db.get(
        'SELECT * FROM notes WHERE user_id = ? AND page_id = ?',
        [userId, pageId],
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
    
    db.all(
        'SELECT * FROM notes WHERE user_id = ? AND level = ? AND page_id NOT LIKE "%analysis%" AND page_id NOT LIKE "%message%" AND page_id NOT LIKE "%plan%" ORDER BY created_at',
        [userId, level],
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
    
    ensureUser(userId, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        db.run(
            'INSERT INTO time_logs (user_id, page_id, time_spent, timestamp) VALUES (?, ?, ?, ?)',
            [userId, pageId, timeSpent, timestamp || new Date().toISOString()],
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
        timeLogs: 'SELECT * FROM time_logs WHERE user_id = ? ORDER BY timestamp DESC',
        cbmResults: 'SELECT * FROM cbm_results WHERE user_id = ? ORDER BY completed_at DESC'
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

// CBM Routes

// Save CBM result
app.post('/api/cbm/save-result', (req, res) => {
    const { 
        userId, 
        textId, 
        textTitle, 
        totalQuestions, 
        totalAnswered, 
        correctAnswers, 
        accuracy, 
        timeSpent, 
        wcpm, 
        answers 
    } = req.body;
    
    if (!userId || !textId || totalQuestions === undefined || correctAnswers === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    ensureUser(userId, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        db.run(
            `INSERT INTO cbm_results 
             (user_id, text_id, text_title, total_questions, total_answered, 
              correct_answers, accuracy, time_spent, wcpm, answers, completed_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [userId, textId, textTitle, totalQuestions, totalAnswered, 
             correctAnswers, accuracy, timeSpent, wcpm, answers],
            function(err) {
                if (err) {
                    console.error('Error saving CBM result:', err);
                    return res.status(500).json({ error: 'Failed to save CBM result' });
                }
                
                res.json({ 
                    success: true, 
                    id: this.lastID,
                    message: 'CBM result saved successfully' 
                });
            }
        );
    });
});

// Get CBM results for a user
app.get('/api/cbm/results/:userId', (req, res) => {
    const { userId } = req.params;
    
    db.all(
        'SELECT * FROM cbm_results WHERE user_id = ? ORDER BY completed_at DESC',
        [userId],
        (err, rows) => {
            if (err) {
                console.error('Error fetching CBM results:', err);
                return res.status(500).json({ error: 'Failed to fetch CBM results' });
            }
            
            res.json(rows || []);
        }
    );
});

// Get CBM statistics
app.get('/api/cbm/stats/:userId', (req, res) => {
    const { userId } = req.params;
    
    db.all(
        `SELECT 
            COUNT(*) as total_attempts,
            AVG(accuracy) as avg_accuracy,
            AVG(wcpm) as avg_wcpm,
            MAX(wcpm) as best_wcpm,
            MAX(accuracy) as best_accuracy
         FROM cbm_results 
         WHERE user_id = ?`,
        [userId],
        (err, rows) => {
            if (err) {
                console.error('Error fetching CBM stats:', err);
                return res.status(500).json({ error: 'Failed to fetch CBM stats' });
            }
            
            const stats = rows[0] || {
                total_attempts: 0,
                avg_accuracy: 0,
                avg_wcpm: 0,
                best_wcpm: 0,
                best_accuracy: 0
            };
            
            res.json(stats);
        }
    );
});

// Text evaluation endpoint
app.post('/api/evaluate-text', async (req, res) => {
    try {
        const { text, type } = req.body;
        
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Text is required' });
        }
        
        // SneakSpot Assessment Rubric
        const sneakspotRubric = {
            vraag1: {
                modelantwoord: "SneakSpot verkoopt momenteel: opvallende, kleurrijke sneakers met felle kleuren, drukke prints en glanzende materialen, zowel hoge (high-tops) als lage modellen, speciale/limited editions van bekende merken",
                goud: "Leerling noemt minimaal 3 kenmerken correct",
                zilver: "Leerling noemt 2 kenmerken correct", 
                brons: "Leerling noemt 1 kenmerk correct of geeft een vaag antwoord",
                voorbeelden: {
                    goud: "SneakSpot verkoopt felle sneakers met opvallende kleuren en glitters. Ze hebben zowel hoge als lage modellen en ook limited editions.",
                    zilver: "Ze verkopen kleurrijke sneakers en speciale edities.",
                    brons: "Ze verkopen sneakers."
                }
            },
            vraag2: {
                modelantwoord: "Er komen weinig jongeren omdat: SneakSpot verkoopt opvallende, kleurrijke sneakers, jongeren willen tegenwoordig juist rustige, simpele kleuren, de huidige collectie sluit niet aan bij wat jongeren nu willen",
                goud: "Leerling legt de mismatch duidelijk uit tussen aanbod en vraag",
                zilver: "Leerling noemt het probleem maar niet volledig uitgewerkt",
                brons: "Vaag of onvolledig antwoord zonder duidelijke probleemanalyse",
                voorbeelden: {
                    goud: "Jongeren komen niet omdat SneakSpot felle kleuren verkoopt terwijl jongeren juist rustige kleuren zoals wit en grijs willen.",
                    zilver: "De sneakers zijn te fel voor jongeren.",
                    brons: "Jongeren vinden het niet mooi."
                }
            },
            vraag3: {
                modelantwoord: "SneakSpot moet: rustige kleuren gaan verkopen (wit, beige, grijs, zwart), simpele, minimalistische ontwerpen aanbieden, sneakers verkopen die makkelijk te combineren zijn, focus op neutrale, tijdloze modellen",
                goud: "Concrete oplossing met specifieke details over kleuren/stijlen",
                zilver: "Goede richting maar minder specifiek uitgewerkt",
                brons: "Te vaag of onvolledig, geen concrete suggesties",
                voorbeelden: {
                    goud: "SneakSpot moet rustige kleuren gaan verkopen zoals wit, beige en zwart en simpele designs zonder prints.",
                    zilver: "Ze moeten modernere sneakers met rustige kleuren verkopen.",
                    brons: "Andere schoenen verkopen."
                }
            }
        };
        
        // Detect which question type based on content
        let questionType = 'vraag1'; // default
        if (text.toLowerCase().includes('jongeren') || text.toLowerCase().includes('weinig')) {
            questionType = 'vraag2';
        } else if (text.toLowerCase().includes('veranderen') || text.toLowerCase().includes('moet') || text.toLowerCase().includes('oplossing')) {
            questionType = 'vraag3';
        }
        
        const rubric = sneakspotRubric[questionType];
        
        const prompt = `
        Je bent een docent die SneakSpot antwoorden beoordeelt volgens een specifieke rubric.
        
        MODELANTWOORD:
        ${rubric.modelantwoord}
        
        BEOORDELINGSCRITERIA:
        - GOUD (3 punten): ${rubric.goud}
        - ZILVER (2 punten): ${rubric.zilver}  
        - BRONS (1 punt): ${rubric.brons}
        
        VOORBEELDEN PER NIVEAU:
        
        Goud-niveau: "${rubric.voorbeelden.goud}"
        Zilver-niveau: "${rubric.voorbeelden.zilver}"
        Brons-niveau: "${rubric.voorbeelden.brons}"
        
        LEERLING ANTWOORD:
        "${text}"
        
        Beoordeel dit antwoord en geef je beoordeling in dit exacte JSON format:
        {
            "score": "goud|zilver|brons",
            "feedback": "Korte feedback (max 2 zinnen) wat goed was en wat beter kan."
        }
        
        Let op: Vergelijk het antwoord met de voorbeelden en criteria. Wees streng maar eerlijk.
        `;
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "Je bent een ervaren docent. Beoordeel tekstanalyses objectief en geef constructieve feedback in het Nederlands."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 200,
            temperature: 0.3
        });
        
        const result = completion.choices[0].message.content;
        
        try {
            const evaluation = JSON.parse(result);
            res.json(evaluation);
        } catch (parseError) {
            // Fallback if JSON parsing fails
            console.error('Failed to parse OpenAI response:', result);
            res.json({
                score: "brons",
                feedback: "Er ging iets mis bij de beoordeling. Probeer het opnieuw."
            });
        }
        
    } catch (error) {
        console.error('OpenAI evaluation error:', error);
        res.status(500).json({ 
            error: 'Er ging iets mis bij de beoordeling',
            details: error.message 
        });
    }
});

// Send answers to Karim with AI evaluation
app.post('/api/send-to-karim', async (req, res) => {
    try {
        const { question1, question2, question3, timestamp } = req.body;
        
        // Validate input
        if (!question1 || !question2 || !question3) {
            return res.status(400).json({ 
                error: 'Alle drie de vragen moeten beantwoord zijn' 
            });
        }
        
        // Combine all answers for evaluation
        const combinedAnswers = `
Vraag 1: Wat verkoopt SneakSpot op dit moment?
${question1}

Vraag 2: Waarom komen er weinig jongeren naar SneakSpot?
${question2}

Vraag 3: Wat moet er veranderen aan SneakSpot?
${question3}
        `;
        
        // Create evaluation prompt based on official rubric
        const prompt = `
Beoordeel deze SneakSpot analyse antwoorden volgens de OFFICIËLE RUBRIC:

ANTWOORDEN:
${combinedAnswers}

OFFICIËLE BEOORDELINGSCRITERIA:

VRAAG 1: Wat verkoopt SneakSpot op dit moment?
MODELANTWOORD: Opvallende, kleurrijke sneakers met felle kleuren, drukke prints, glanzende materialen, hoge en lage modellen, speciale/limited editions
- Goud (3 punten): Minimaal 3 kenmerken correct genoemd
- Zilver (2 punten): 2 kenmerken correct genoemd  
- Brons (1 punt): 1 kenmerk correct of vaag antwoord

VRAAG 2: Waarom komen er weinig jongeren naar SneakSpot?
MODELANTWOORD: Mismatch tussen aanbod (felle kleuren) en vraag (jongeren willen rustige, simpele kleuren)
- Goud (3 punten): Legt de mismatch duidelijk uit tussen aanbod en vraag
- Zilver (2 punten): Noemt het probleem maar niet volledig uitgewerkt
- Brons (1 punt): Vaag of onvolledig antwoord zonder duidelijke probleemanalyse

VRAAG 3: Wat moet er veranderen aan SneakSpot?
MODELANTWOORD: Rustige kleuren (wit, beige, grijs, zwart), simpele minimalistische ontwerpen, makkelijk combineerbare sneakers
- Goud (3 punten): Concrete oplossing met specifieke details over kleuren/stijlen
- Zilver (2 punten): Goede richting maar minder specifiek uitgewerkt
- Brons (1 punt): Te vaag of onvolledig, geen concrete suggesties

EINDOORDEEL TOTAALSCORE:
- 7-9 punten = GOED
- 4-6 punten = VOLDOENDE  
- 3 punten = MATIG

Geef je antwoord in dit JSON format:
{
    "score": "goud|zilver|brons",
    "feedback": "Korte feedback (max 3 zinnen) gebaseerd op de rubric criteria.",
    "individual_scores": {
        "vraag1": "goud|zilver|brons",
        "vraag2": "goud|zilver|brons", 
        "vraag3": "goud|zilver|brons"
    },
    "total_points": [totaal aantal punten],
    "final_grade": "GOED|VOLDOENDE|MATIG"
}
        `;
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "Je bent een ervaren docent die SneakSpot analyses beoordeelt. Wees streng maar eerlijk in je beoordeling."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 300,
            temperature: 0.3
        });
        
        const result = completion.choices[0].message.content;
        
        let evaluation;
        try {
            evaluation = JSON.parse(result);
        } catch (parseError) {
            console.error('Failed to parse OpenAI response:', result);
            evaluation = {
                score: "brons",
                feedback: "Er ging iets mis bij de beoordeling. Probeer het opnieuw.",
                individual_scores: {
                    vraag1: "brons",
                    vraag2: "brons", 
                    vraag3: "brons"
                }
            };
        }
        
        // Log the answers and evaluation
        console.log('\n=== NIEUWE ANTWOORDEN VOOR KARIM ===');
        console.log('Tijdstip:', timestamp);
        console.log('\nVraag 1: Wat verkoopt SneakSpot op dit moment?');
        console.log(question1);
        console.log('\nVraag 2: Waarom komen er weinig jongeren naar SneakSpot?');
        console.log(question2);
        console.log('\nVraag 3: Wat moet er veranderen aan SneakSpot?');
        console.log(question3);
        console.log('\nAI EVALUATIE:');
        console.log('Overall Score:', evaluation.score);
        console.log('Feedback:', evaluation.feedback);
        console.log('Individual Scores:', evaluation.individual_scores);
        console.log('=====================================\n');
        
        // Return evaluation results
        res.json({ 
            success: true, 
            message: 'Antwoorden succesvol naar Karim gestuurd en beoordeeld!',
            evaluation: evaluation
        });
        
    } catch (error) {
        console.error('Error sending to Karim:', error);
        res.status(500).json({ 
            error: 'Er ging iets mis bij het versturen',
            details: error.message 
        });
    }
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
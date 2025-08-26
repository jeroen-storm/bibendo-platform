-- Bibendo Platform Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notes table  
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    level INTEGER NOT NULL,
    content TEXT,
    edit_count INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (user_id),
    UNIQUE(user_id, page_id)
);

-- Text interaction logs
CREATE TABLE IF NOT EXISTS text_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    action_type TEXT NOT NULL, -- 'scroll', 'open', 'close', 'click'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    data TEXT, -- JSON data for action details
    FOREIGN KEY (user_id) REFERENCES users (user_id)
);

-- Sessions tracking
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    duration INTEGER, -- in seconds
    FOREIGN KEY (user_id) REFERENCES users (user_id)
);

-- Time tracking logs
CREATE TABLE IF NOT EXISTS time_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    time_spent INTEGER NOT NULL, -- in seconds
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (user_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notes_user_page ON notes(user_id, page_id);
CREATE INDEX IF NOT EXISTS idx_text_logs_user ON text_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_text_logs_timestamp ON text_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_user ON time_logs(user_id);
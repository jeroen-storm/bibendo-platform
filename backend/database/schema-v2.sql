-- Bibendo Platform Database Schema V2
-- Simplified schema with timeline-based tracking
-- Created: 2025-10-22

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table (unchanged)
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Timeline events - consolidates text_logs, sessions, and time_logs
CREATE TABLE IF NOT EXISTS timeline_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    event_type TEXT NOT NULL,  -- 'page_open', 'page_close', 'click', 'link_click', 'note_save', 'assignment_save'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER,  -- seconds (only for page_close events)
    event_data TEXT,   -- JSON: {target, href, from_page, link_text, version, etc}
    FOREIGN KEY (user_id) REFERENCES users (user_id)
);

-- Content table - replaces notes table with versioning
CREATE TABLE IF NOT EXISTS content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    content_type TEXT NOT NULL,  -- 'note', 'assignment_field', 'analysis', 'message'
    content TEXT,
    field_number INTEGER,  -- NULL for notes, 1-9 for assignment fields
    version INTEGER DEFAULT 1,  -- version tracking for edits
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (user_id),
    UNIQUE(user_id, page_id, field_number, version)
);

-- ============================================
-- LEGACY TABLES (kept for reference/backup)
-- ============================================

-- Old notes table (will be renamed to notes_legacy)
-- Old text_logs table (will be renamed to text_logs_legacy)
-- Old sessions table (will be renamed to sessions_legacy)
-- Old time_logs table (will be renamed to time_logs_legacy)

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Timeline events indexes
CREATE INDEX IF NOT EXISTS idx_timeline_user ON timeline_events(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_timestamp ON timeline_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_timeline_user_timestamp ON timeline_events(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_timeline_event_type ON timeline_events(event_type);

-- Content indexes
CREATE INDEX IF NOT EXISTS idx_content_user ON content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_user_page ON content(user_id, page_id);
CREATE INDEX IF NOT EXISTS idx_content_page_version ON content(page_id, version);
CREATE INDEX IF NOT EXISTS idx_content_updated ON content(updated_at);

-- Users index
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);

-- ============================================
-- VIEWS FOR CONVENIENCE
-- ============================================

-- Latest content version per page
CREATE VIEW IF NOT EXISTS latest_content AS
SELECT c.*
FROM content c
INNER JOIN (
    SELECT user_id, page_id, field_number, MAX(version) as max_version
    FROM content
    GROUP BY user_id, page_id, field_number
) latest ON c.user_id = latest.user_id
    AND c.page_id = latest.page_id
    AND (c.field_number = latest.field_number OR (c.field_number IS NULL AND latest.field_number IS NULL))
    AND c.version = latest.max_version;

-- Timeline with duration calculated for page sessions
CREATE VIEW IF NOT EXISTS page_sessions AS
SELECT
    open.user_id,
    open.page_id,
    open.timestamp as start_time,
    close.timestamp as end_time,
    close.duration
FROM timeline_events open
LEFT JOIN timeline_events close
    ON open.user_id = close.user_id
    AND open.page_id = close.page_id
    AND close.event_type = 'page_close'
    AND close.timestamp > open.timestamp
WHERE open.event_type = 'page_open';

-- ============================================
-- TRIGGERS
-- ============================================

-- Update last_active timestamp when user creates events
CREATE TRIGGER IF NOT EXISTS update_user_last_active
AFTER INSERT ON timeline_events
BEGIN
    UPDATE users
    SET last_active = NEW.timestamp
    WHERE user_id = NEW.user_id;
END;

-- Update updated_at timestamp on content changes
CREATE TRIGGER IF NOT EXISTS update_content_timestamp
AFTER UPDATE ON content
BEGIN
    UPDATE content
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- ============================================
-- BIBENDO INTEGRATION TABLES
-- ============================================

-- Tabel voor Bibendo authenticatie tokens
CREATE TABLE IF NOT EXISTS bibendo_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  bearer_token TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  last_used DATETIME
);

-- Tabel voor game runs/sessies
CREATE TABLE IF NOT EXISTS bibendo_game_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  run_id TEXT NOT NULL UNIQUE,
  started_at DATETIME,
  completed_at DATETIME,
  status TEXT, -- 'active', 'completed', 'abandoned'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Tabel voor spelerskeuzes/antwoorden
CREATE TABLE IF NOT EXISTS bibendo_game_choices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  question_id TEXT,
  question_text TEXT,
  answer_text TEXT,
  answer_value TEXT,
  is_correct BOOLEAN,
  points INTEGER DEFAULT 0,
  timestamp DATETIME,
  metadata TEXT, -- JSON voor extra data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (run_id) REFERENCES bibendo_game_runs(run_id)
);

-- Index voor snelle queries
CREATE INDEX IF NOT EXISTS idx_bibendo_choices_user ON bibendo_game_choices(user_id);
CREATE INDEX IF NOT EXISTS idx_bibendo_choices_run ON bibendo_game_choices(run_id);
CREATE INDEX IF NOT EXISTS idx_bibendo_choices_timestamp ON bibendo_game_choices(timestamp);

-- View voor gecombineerde timeline events
-- Dit combineert bestaande timeline_events met Bibendo game choices
CREATE VIEW IF NOT EXISTS combined_timeline AS
SELECT
  user_id,
  'app_event' as source,
  event_type,
  event_data,
  timestamp,
  NULL as question_text,
  NULL as answer_text
FROM timeline_events

UNION ALL

SELECT
  user_id,
  'bibendo_game' as source,
  'game_choice' as event_type,
  json_object(
    'run_id', run_id,
    'question_id', question_id,
    'answer_value', answer_value,
    'is_correct', is_correct,
    'points', points
  ) as event_data,
  timestamp,
  question_text,
  answer_text
FROM bibendo_game_choices

ORDER BY timestamp DESC;

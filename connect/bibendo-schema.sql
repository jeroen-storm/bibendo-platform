-- Bibendo Game Data Integration Schema
-- Voeg deze tabellen toe aan je bestaande database

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
  FOREIGN KEY (user_id) REFERENCES users(id)
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
  FOREIGN KEY (user_id) REFERENCES users(id),
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

#!/usr/bin/env node

/**
 * Bibendo Platform - Database Migration Script
 * Migrates from old schema (notes, text_logs, sessions, time_logs)
 * to new simplified schema (content, timeline_events)
 *
 * Usage: node migrate-to-timeline.js [--dry-run]
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'bibendo.db');
const BACKUP_PATH = path.join(__dirname, `bibendo.db.backup.${Date.now()}`);
const DRY_RUN = process.argv.includes('--dry-run');

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Bibendo Platform - Database Migration to V2        ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
}

// Migration statistics
const stats = {
    users: 0,
    notes_migrated: 0,
    text_logs_migrated: 0,
    sessions_migrated: 0,
    time_logs_migrated: 0,
    timeline_events_created: 0,
    content_records_created: 0,
    errors: []
};

async function runMigration() {
    // Check if database exists
    if (!fs.existsSync(DB_PATH)) {
        console.error('❌ Database not found:', DB_PATH);
        process.exit(1);
    }

    // Create backup
    if (!DRY_RUN) {
        console.log('📦 Creating backup...');
        fs.copyFileSync(DB_PATH, BACKUP_PATH);
        console.log('✅ Backup created:', BACKUP_PATH, '\n');
    }

    const db = new sqlite3.Database(DB_PATH);

    try {
        await migrate(db);
        console.log('\n✅ Migration completed successfully!');
        printStats();
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        stats.errors.push(error.message);
        printStats();
        process.exit(1);
    } finally {
        db.close();
    }
}

async function migrate(db) {
    // Step 1: Create new tables
    console.log('📋 Step 1: Creating new tables...');
    await createNewTables(db);

    // Step 2: Migrate notes to content
    console.log('📋 Step 2: Migrating notes to content...');
    await migrateNotes(db);

    // Step 3: Migrate text_logs to timeline_events
    console.log('📋 Step 3: Migrating text_logs to timeline_events...');
    await migrateTextLogs(db);

    // Step 4: Migrate sessions to timeline_events
    console.log('📋 Step 4: Migrating sessions to timeline_events...');
    await migrateSessions(db);

    // Step 5: Migrate time_logs (merge with page_close events)
    console.log('📋 Step 5: Processing time_logs...');
    await migrateTimeLogs(db);

    // Step 6: Rename old tables to _legacy
    if (!DRY_RUN) {
        console.log('📋 Step 6: Renaming old tables...');
        await renameLegacyTables(db);
    }

    // Step 7: Verify migration
    console.log('📋 Step 7: Verifying migration...');
    await verifyMigration(db);
}

function createNewTables(db) {
    return new Promise((resolve, reject) => {
        const schema = fs.readFileSync(path.join(__dirname, 'schema-v2.sql'), 'utf8');

        if (DRY_RUN) {
            console.log('   [DRY RUN] Would create new tables');
            resolve();
            return;
        }

        db.exec(schema, (err) => {
            if (err) {
                reject(err);
            } else {
                console.log('   ✅ New tables created');
                resolve();
            }
        });
    });
}

function migrateNotes(db) {
    return new Promise((resolve, reject) => {
        // Get all notes from old table
        db.all('SELECT * FROM notes ORDER BY created_at', [], async (err, notes) => {
            if (err) {
                reject(err);
                return;
            }

            stats.notes_migrated = notes.length;
            console.log(`   Found ${notes.length} notes to migrate`);

            if (DRY_RUN) {
                console.log('   [DRY RUN] Would migrate notes');
                resolve();
                return;
            }

            // Insert into content table
            const stmt = db.prepare(`
                INSERT INTO content (user_id, page_id, content_type, content, field_number, version, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const note of notes) {
                // Determine content_type based on page_id
                let contentType = 'note';
                if (note.page_id.includes('analysis')) {
                    contentType = 'analysis';
                } else if (note.page_id.includes('message')) {
                    contentType = 'message';
                } else if (note.page_id.includes('final_assignment')) {
                    contentType = 'assignment_field';
                }

                stmt.run(
                    note.user_id,
                    note.page_id,
                    contentType,
                    note.content,
                    null, // field_number (NULL for now, will be parsed later for assignments)
                    1, // version (initial)
                    note.created_at,
                    note.updated_at,
                    (err) => {
                        if (err) stats.errors.push(`Note ${note.id}: ${err.message}`);
                        else stats.content_records_created++;
                    }
                );
            }

            stmt.finalize((err) => {
                if (err) reject(err);
                else {
                    console.log(`   ✅ Migrated ${stats.content_records_created} notes to content table`);
                    resolve();
                }
            });
        });
    });
}

function migrateTextLogs(db) {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM text_logs ORDER BY timestamp', [], async (err, logs) => {
            if (err) {
                reject(err);
                return;
            }

            stats.text_logs_migrated = logs.length;
            console.log(`   Found ${logs.length} text logs to migrate`);

            if (DRY_RUN) {
                console.log('   [DRY RUN] Would migrate text logs');
                resolve();
                return;
            }

            const stmt = db.prepare(`
                INSERT INTO timeline_events (user_id, page_id, event_type, timestamp, duration, event_data)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            for (const log of logs) {
                let eventType = log.action_type;

                // Map old action types to new event types
                if (eventType === 'hyperlink_click') {
                    eventType = 'link_click';
                } else if (eventType === 'scroll') {
                    // Skip scroll events in new system
                    continue;
                } else if (eventType === 'section_view') {
                    // Skip section_view events
                    continue;
                }

                stmt.run(
                    log.user_id,
                    log.page_id,
                    eventType,
                    log.timestamp,
                    null, // duration (will be filled from sessions/time_logs)
                    log.data,
                    (err) => {
                        if (err) stats.errors.push(`TextLog ${log.id}: ${err.message}`);
                        else stats.timeline_events_created++;
                    }
                );
            }

            stmt.finalize((err) => {
                if (err) reject(err);
                else {
                    console.log(`   ✅ Migrated ${stats.timeline_events_created} events (filtered out scroll events)`);
                    resolve();
                }
            });
        });
    });
}

function migrateSessions(db) {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM sessions ORDER BY start_time', [], async (err, sessions) => {
            if (err) {
                reject(err);
                return;
            }

            stats.sessions_migrated = sessions.length;
            console.log(`   Found ${sessions.length} sessions to migrate`);

            if (DRY_RUN) {
                console.log('   [DRY RUN] Would migrate sessions');
                resolve();
                return;
            }

            const stmt = db.prepare(`
                INSERT INTO timeline_events (user_id, page_id, event_type, timestamp, duration, event_data)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            let pageOpenCount = 0;
            let pageCloseCount = 0;

            for (const session of sessions) {
                // Create page_open event
                stmt.run(
                    session.user_id,
                    session.page_id,
                    'page_open',
                    session.start_time,
                    null,
                    null,
                    (err) => {
                        if (err) stats.errors.push(`Session open ${session.id}: ${err.message}`);
                        else {
                            pageOpenCount++;
                            stats.timeline_events_created++;
                        }
                    }
                );

                // Create page_close event if end_time exists
                if (session.end_time) {
                    stmt.run(
                        session.user_id,
                        session.page_id,
                        'page_close',
                        session.end_time,
                        session.duration,
                        null,
                        (err) => {
                            if (err) stats.errors.push(`Session close ${session.id}: ${err.message}`);
                            else {
                                pageCloseCount++;
                                stats.timeline_events_created++;
                            }
                        }
                    );
                }
            }

            stmt.finalize((err) => {
                if (err) reject(err);
                else {
                    console.log(`   ✅ Created ${pageOpenCount} page_open and ${pageCloseCount} page_close events`);
                    resolve();
                }
            });
        });
    });
}

function migrateTimeLogs(db) {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM time_logs ORDER BY timestamp', [], async (err, logs) => {
            if (err) {
                reject(err);
                return;
            }

            stats.time_logs_migrated = logs.length;
            console.log(`   Found ${logs.length} time logs`);
            console.log('   ℹ️  Time log data is already captured in sessions (page_close duration)');

            resolve();
        });
    });
}

function renameLegacyTables(db) {
    return new Promise((resolve, reject) => {
        const renameSql = `
            ALTER TABLE notes RENAME TO notes_legacy;
            ALTER TABLE text_logs RENAME TO text_logs_legacy;
            ALTER TABLE sessions RENAME TO sessions_legacy;
            ALTER TABLE time_logs RENAME TO time_logs_legacy;
        `;

        db.exec(renameSql, (err) => {
            if (err) {
                reject(err);
            } else {
                console.log('   ✅ Renamed old tables to *_legacy');
                resolve();
            }
        });
    });
}

function verifyMigration(db) {
    return new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            stats.users = row.count;

            if (DRY_RUN) {
                console.log(`   ✅ Verification (dry-run):`);
                console.log(`      - Users: ${stats.users}`);
                console.log(`      - Notes to migrate: ${stats.notes_migrated}`);
                console.log(`      - Text logs to migrate: ${stats.text_logs_migrated}`);
                console.log(`      - Sessions to migrate: ${stats.sessions_migrated}`);
                resolve();
                return;
            }

            db.get('SELECT COUNT(*) as count FROM content', [], (err, contentRow) => {
                if (err) {
                    reject(err);
                    return;
                }

                db.get('SELECT COUNT(*) as count FROM timeline_events', [], (err, timelineRow) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    console.log(`   ✅ Verification complete:`);
                    console.log(`      - Users: ${stats.users}`);
                    console.log(`      - Content records: ${contentRow.count}`);
                    console.log(`      - Timeline events: ${timelineRow.count}`);

                    resolve();
                });
            });
        });
    });
}

function printStats() {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║  Migration Statistics                                ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log(`Users:                    ${stats.users}`);
    console.log(`Notes migrated:           ${stats.notes_migrated} → ${stats.content_records_created} content records`);
    console.log(`Text logs migrated:       ${stats.text_logs_migrated} (scroll events filtered)`);
    console.log(`Sessions migrated:        ${stats.sessions_migrated}`);
    console.log(`Time logs processed:      ${stats.time_logs_migrated}`);
    console.log(`Total timeline events:    ${stats.timeline_events_created}`);

    if (stats.errors.length > 0) {
        console.log(`\n⚠️  Errors encountered:     ${stats.errors.length}`);
        stats.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
        if (stats.errors.length > 10) {
            console.log(`   ... and ${stats.errors.length - 10} more`);
        }
    }

    if (!DRY_RUN) {
        console.log(`\n💾 Backup location:        ${BACKUP_PATH}`);
    }
}

// Run migration
runMigration().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

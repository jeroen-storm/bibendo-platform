#!/usr/bin/env node

// Database cleanup script for Bibendo Platform
// This script completely resets the database to a clean state

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'bibendo.db');
const initSqlPath = path.join(__dirname, 'database', 'init.sql');

console.log('🗑️  Starting database cleanup...');

// Delete existing database file
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('✅ Deleted existing database file');
}

// Recreate database from schema
const db = new sqlite3.Database(dbPath);
const initSql = fs.readFileSync(initSqlPath, 'utf8');

// Split SQL statements and execute each one
const statements = initSql.split(';').filter(statement => statement.trim());

let completed = 0;
const total = statements.length;

statements.forEach((statement, index) => {
    if (statement.trim()) {
        db.run(statement, function(err) {
            if (err) {
                console.error(`❌ Error executing statement ${index + 1}:`, err.message);
                console.error('Statement:', statement);
            } else {
                completed++;
                if (completed === total) {
                    console.log('✅ Database recreated with fresh schema');
                    console.log('🚀 Database cleanup completed successfully!');
                    db.close();
                    process.exit(0);
                }
            }
        });
    }
});
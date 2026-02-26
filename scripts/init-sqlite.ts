#!/usr/bin/env tsx

/**
 * Initialize SQLite database with schema
 */

import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { config } from 'dotenv'

config()

const DB_PATH = process.env.DB_PATH || './data/assistant.db'

function initDatabase() {
  console.log('🗄️  Initializing SQLite database...')

  // Ensure data directory exists
  const dir = dirname(DB_PATH)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
    console.log(`✅ Created directory: ${dir}`)
  }

  const db = new Database(DB_PATH)

  // Enable foreign keys
  db.pragma('foreign_keys = ON')

  console.log('📝 Creating tables...')

  // Conversations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      telegram_chat_id TEXT NOT NULL,
      telegram_message_id TEXT,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      intent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_id ON conversations(telegram_chat_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_created_at ON conversations(created_at)`)
  console.log('  ✓ conversations')

  // Reminders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      notion_page_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      remind_at DATETIME NOT NULL,
      repeat_rule TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'cancelled')),
      telegram_chat_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_remind_at ON reminders(remind_at)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_status ON reminders(status)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_id_reminders ON reminders(telegram_chat_id)`)
  console.log('  ✓ reminders')

  // Notion cache table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notion_cache (
      page_id TEXT PRIMARY KEY,
      database_id TEXT NOT NULL,
      title TEXT,
      content_json TEXT,
      last_synced DATETIME,
      etag TEXT
    )
  `)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_database_id ON notion_cache(database_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_last_synced_notion ON notion_cache(last_synced)`)
  console.log('  ✓ notion_cache')

  // Calendar cache table
  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_cache (
      event_id TEXT PRIMARY KEY,
      title TEXT,
      start_time DATETIME,
      end_time DATETIME,
      location TEXT,
      description TEXT,
      last_synced DATETIME
    )
  `)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_start_time ON calendar_cache(start_time)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_last_synced_calendar ON calendar_cache(last_synced)`)
  console.log('  ✓ calendar_cache')

  // User preferences table
  db.exec(`
    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log('  ✓ preferences')

  // Insert default preferences
  const insertPref = db.prepare(`
    INSERT OR IGNORE INTO preferences (key, value) VALUES (?, ?)
  `)

  insertPref.run('language', 'ru')
  insertPref.run('timezone', 'Europe/Moscow')
  insertPref.run('digest_morning_time', '08:00')
  insertPref.run('digest_evening_time', '21:00')

  console.log('  ✓ default preferences')

  db.close()

  console.log(`\n✅ Database initialized successfully at: ${DB_PATH}`)
  console.log('📊 Tables created:')
  console.log('   - conversations (chat history)')
  console.log('   - reminders (scheduled reminders)')
  console.log('   - notion_cache (Notion page cache)')
  console.log('   - calendar_cache (calendar events cache)')
  console.log('   - preferences (user settings)')
}

// Run initialization
try {
  initDatabase()
} catch (error) {
  console.error('❌ Failed to initialize database:', error)
  process.exit(1)
}

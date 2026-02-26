#!/usr/bin/env ts-node

/**
 * Initialize dialogue analysis tables in SQLite database
 *
 * Creates two tables:
 * - telegram_dialogues: Cache for chat history
 * - dialogue_analyses: Saved analysis results
 */

import Database from 'better-sqlite3'
import { join } from 'path'
import dotenv from 'dotenv'

dotenv.config()

const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'data', 'assistant.db')

console.log(`📂 Opening database at: ${DB_PATH}`)

const db = new Database(DB_PATH)

try {
  console.log('\n🔧 Creating telegram_dialogues table...')

  db.exec(`
    CREATE TABLE IF NOT EXISTS telegram_dialogues (
      id TEXT PRIMARY KEY,
      chat_username TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT,
      sender_username TEXT,
      content TEXT NOT NULL,
      timestamp DATETIME NOT NULL,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create indexes for efficient querying
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_chat_username ON telegram_dialogues(chat_username);
    CREATE INDEX IF NOT EXISTS idx_timestamp ON telegram_dialogues(timestamp);
    CREATE INDEX IF NOT EXISTS idx_fetched_at ON telegram_dialogues(fetched_at);
  `)

  console.log('✅ telegram_dialogues table created')

  console.log('\n🔧 Creating dialogue_analyses table...')

  db.exec(`
    CREATE TABLE IF NOT EXISTS dialogue_analyses (
      id TEXT PRIMARY KEY,
      chat_username TEXT NOT NULL,
      analysis_type TEXT NOT NULL,
      time_range TEXT NOT NULL,
      summary TEXT,
      analysis_json TEXT NOT NULL,
      notion_page_id TEXT,
      telegram_chat_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_chat_username_analyses ON dialogue_analyses(chat_username);
    CREATE INDEX IF NOT EXISTS idx_created_at_analyses ON dialogue_analyses(created_at);
  `)

  console.log('✅ dialogue_analyses table created')

  console.log('\n✨ All dialogue tables initialized successfully!')
  console.log('\nTables created:')
  console.log('  - telegram_dialogues (chat history cache)')
  console.log('  - dialogue_analyses (saved analysis results)')

} catch (error) {
  console.error('❌ Error creating tables:', error)
  process.exit(1)
} finally {
  db.close()
}

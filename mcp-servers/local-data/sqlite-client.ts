/**
 * SQLite client wrapper
 */

import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

export class SqliteClient {
  private db: Database.Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.db.pragma('foreign_keys = ON')
  }

  query(sql: string, params: any[] = []) {
    return this.db.prepare(sql).all(...params)
  }

  execute(sql: string, params: any[] = []) {
    return this.db.prepare(sql).run(...params)
  }

  saveConversation(data: {
    telegram_chat_id: string
    telegram_message_id?: string
    role: string
    content: string
    intent?: string
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO conversations (id, telegram_chat_id, telegram_message_id, role, content, intent)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    return stmt.run(
      randomUUID(),
      data.telegram_chat_id,
      data.telegram_message_id || null,
      data.role,
      data.content,
      data.intent || null
    )
  }

  getContext(telegram_chat_id: string, limit: number = 10) {
    const stmt = this.db.prepare(`
      SELECT role, content, intent, created_at
      FROM conversations
      WHERE telegram_chat_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `)

    return stmt.all(telegram_chat_id, limit)
  }

  saveReminder(data: {
    telegram_chat_id: string
    title: string
    description?: string
    remind_at: string
    repeat_rule?: string
    notion_page_id?: string
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO reminders (id, telegram_chat_id, title, description, remind_at, repeat_rule, notion_page_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    return stmt.run(
      randomUUID(),
      data.telegram_chat_id,
      data.title,
      data.description || null,
      data.remind_at,
      data.repeat_rule || null,
      data.notion_page_id || null
    )
  }

  getPreference(key: string) {
    const stmt = this.db.prepare(`
      SELECT key, value
      FROM preferences
      WHERE key = ?
    `)

    return stmt.get(key)
  }

  close() {
    this.db.close()
  }
}

/**
 * Database type definitions for SQLite
 */

export interface ConversationRow {
  id: string
  telegram_chat_id: string
  telegram_message_id: string | null
  role: 'user' | 'assistant' | 'system'
  content: string
  intent: string | null
  created_at: string
}

export interface ReminderRow {
  id: string
  notion_page_id: string | null
  title: string
  description: string | null
  remind_at: string
  repeat_rule: string | null
  status: 'pending' | 'sent' | 'cancelled'
  telegram_chat_id: string
  created_at: string
}

export interface NotionCacheRow {
  page_id: string
  database_id: string
  title: string | null
  content_json: string
  last_synced: string
  etag: string | null
}

export interface CalendarCacheRow {
  event_id: string
  title: string | null
  start_time: string
  end_time: string
  location: string | null
  description: string | null
  last_synced: string
}

export interface PreferenceRow {
  key: string
  value: string
  updated_at: string
}

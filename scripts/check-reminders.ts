#!/usr/bin/env tsx
/**
 * Check Reminders
 * Called by n8n Reminder Checker workflow every 5 minutes
 */

import Database from 'better-sqlite3'
import { join } from 'path'

async function main() {
  const db = new Database(join(process.cwd(), 'data', 'assistant.db'))

  try {
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

    // Find reminders due in the next 5 minutes
    const reminders = db
      .prepare(
        `SELECT * FROM reminders
         WHERE remind_at BETWEEN ? AND ?
         AND status = 'pending'
         ORDER BY remind_at`
      )
      .all(fiveMinutesAgo.toISOString(), fiveMinutesFromNow.toISOString())

    // Output reminders as JSON array
    console.log(JSON.stringify(reminders))
  } catch (error: any) {
    console.error(JSON.stringify({ error: error.message }))
    process.exit(1)
  } finally {
    db.close()
  }
}

main()

#!/usr/bin/env tsx
/**
 * Mark Reminder as Sent
 * Called by n8n after sending a reminder
 */

import Database from 'better-sqlite3'
import { join } from 'path'

const REMINDER_ID = process.argv[2]

if (!REMINDER_ID) {
  console.error('Usage: mark-reminder-sent.ts <reminder_id>')
  process.exit(1)
}

async function main() {
  const db = new Database(join(process.cwd(), 'data', 'assistant.db'))

  try {
    db.prepare(
      `UPDATE reminders
       SET status = 'sent'
       WHERE id = ?`
    ).run(REMINDER_ID)

    console.log(JSON.stringify({ success: true, reminder_id: REMINDER_ID }))
  } catch (error: any) {
    console.error(JSON.stringify({ error: error.message }))
    process.exit(1)
  } finally {
    db.close()
  }
}

main()

#!/usr/bin/env tsx
/**
 * Sync Notion to SQLite Cache
 * Called by n8n every 30 minutes to keep local cache updated
 */

import Database from 'better-sqlite3'
import { Client } from '@notionhq/client'
import { join } from 'path'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
  const db = new Database(join(process.cwd(), 'data', 'assistant.db'))
  const notion = new Client({ auth: process.env.NOTION_API_KEY })

  try {
    let syncedPages = 0

    // Sync Knowledge Base
    const knowledgePages = await notion.databases.query({
      database_id: process.env.NOTION_KNOWLEDGE_DB_ID!
    })

    for (const page of knowledgePages.results) {
      const pageId = page.id
      const title = (page as any).properties.Title?.title?.[0]?.plain_text || ''
      const category = (page as any).properties.Category?.select?.name || ''
      const updatedAt = (page as any).last_edited_time

      // Get page content
      const blocks = await notion.blocks.children.list({ block_id: pageId })
      const content = blocks.results
        .map((block: any) => {
          if (block.type === 'paragraph') {
            return block.paragraph.rich_text
              .map((text: any) => text.plain_text)
              .join('')
          }
          return ''
        })
        .join('\n')

      // Upsert to cache
      db.prepare(
        `INSERT OR REPLACE INTO notion_cache
         (page_id, database_type, title, content, category, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(pageId, 'knowledge', title, content, category, updatedAt)

      syncedPages++
    }

    // Sync Tasks
    const taskPages = await notion.databases.query({
      database_id: process.env.NOTION_TASKS_DB_ID!
    })

    for (const page of taskPages.results) {
      const pageId = page.id
      const title = (page as any).properties.Title?.title?.[0]?.plain_text || ''
      const status = (page as any).properties.Status?.select?.name || ''
      const updatedAt = (page as any).last_edited_time

      db.prepare(
        `INSERT OR REPLACE INTO notion_cache
         (page_id, database_type, title, content, category, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(pageId, 'tasks', title, '', status, updatedAt)

      syncedPages++
    }

    // Sync Daily Log
    const dailyLogPages = await notion.databases.query({
      database_id: process.env.NOTION_DAILY_LOG_DB_ID!
    })

    for (const page of dailyLogPages.results) {
      const pageId = page.id
      const title = (page as any).properties.Title?.title?.[0]?.plain_text || ''
      const updatedAt = (page as any).last_edited_time

      db.prepare(
        `INSERT OR REPLACE INTO notion_cache
         (page_id, database_type, title, content, category, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(pageId, 'daily_log', title, '', '', updatedAt)

      syncedPages++
    }

    console.log(JSON.stringify({ success: true, synced_pages: syncedPages }))
  } catch (error: any) {
    console.error(JSON.stringify({ success: false, error: error.message }))
    process.exit(1)
  } finally {
    db.close()
  }
}

main()

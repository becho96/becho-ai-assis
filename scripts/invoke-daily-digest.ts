#!/usr/bin/env tsx
/**
 * Invoke Daily Digest Agent
 * Called by n8n Morning/Evening Digest workflows
 */

import Database from 'better-sqlite3'
import { Client } from '@notionhq/client'
import { join } from 'path'
import dotenv from 'dotenv'

dotenv.config()

const DIGEST_TYPE = process.argv[2] || 'morning' // morning | evening | weekly

async function main() {
  const db = new Database(join(process.cwd(), 'data', 'assistant.db'))
  const notion = new Client({ auth: process.env.NOTION_API_KEY })

  try {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    let digest = ''

    if (DIGEST_TYPE === 'morning') {
      digest = await generateMorningDigest(db, notion, todayStr)
    } else if (DIGEST_TYPE === 'evening') {
      digest = await generateEveningDigest(db, notion, todayStr)
    } else if (DIGEST_TYPE === 'weekly') {
      digest = await generateWeeklyDigest(db, notion)
    }

    // Save digest to Daily Log
    await saveDailyLog(notion, todayStr, DIGEST_TYPE, digest)

    console.log(JSON.stringify({ digest, timestamp: new Date().toISOString() }))
  } catch (error: any) {
    console.error(JSON.stringify({ error: error.message }))
    process.exit(1)
  } finally {
    db.close()
  }
}

async function generateMorningDigest(
  db: Database.Database,
  notion: Client,
  date: string
): Promise<string> {
  // Get tasks for today
  const tasks = await notion.databases.query({
    database_id: process.env.NOTION_TASKS_DB_ID!,
    filter: {
      and: [
        {
          property: 'Status',
          select: {
            equals: 'todo'
          }
        },
        {
          property: 'Due Date',
          date: {
            on_or_before: date
          }
        }
      ]
    }
  })

  // Get reminders for today
  const reminders = db
    .prepare(
      `SELECT * FROM reminders
       WHERE date(remind_at) = date(?)
       AND status = 'pending'
       ORDER BY remind_at`
    )
    .all(date)

  // Build morning digest
  let digest = `☀️ **Доброе утро!**\n\n`
  digest += `📅 Сегодня: ${new Date(date).toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n`

  digest += `📋 **Задачи на сегодня:** ${tasks.results.length}\n`
  if (tasks.results.length > 0) {
    tasks.results.slice(0, 5).forEach((task: any) => {
      const title = task.properties.Title?.title?.[0]?.plain_text || 'Без названия'
      const priority = task.properties.Priority?.select?.name || 'medium'
      const emoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢'
      digest += `${emoji} ${title}\n`
    })
  }

  digest += `\n⏰ **Напоминания:** ${reminders.length}\n`
  if (reminders.length > 0) {
    reminders.slice(0, 3).forEach((reminder: any) => {
      const time = new Date(reminder.remind_at).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      })
      digest += `• ${time} - ${reminder.message}\n`
    })
  }

  digest += `\n✨ Удачного дня!`

  return digest
}

async function generateEveningDigest(
  _db: Database.Database,
  notion: Client,
  date: string
): Promise<string> {
  // Get completed tasks today
  const completedTasks = await notion.databases.query({
    database_id: process.env.NOTION_TASKS_DB_ID!,
    filter: {
      property: 'Status',
      select: {
        equals: 'done'
      }
    }
  })

  // Get tomorrow's tasks
  const tomorrow = new Date(date)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const tomorrowTasks = await notion.databases.query({
    database_id: process.env.NOTION_TASKS_DB_ID!,
    filter: {
      and: [
        {
          property: 'Status',
          select: {
            equals: 'todo'
          }
        },
        {
          property: 'Due Date',
          date: {
            equals: tomorrowStr
          }
        }
      ]
    }
  })

  let digest = `🌙 **Добрый вечер!**\n\n`
  digest += `📊 **Итоги дня:**\n`
  digest += `✅ Выполнено задач: ${completedTasks.results.length}\n\n`

  digest += `📅 **План на завтра:**\n`
  if (tomorrowTasks.results.length > 0) {
    tomorrowTasks.results.slice(0, 5).forEach((task: any) => {
      const title = task.properties.Title?.title?.[0]?.plain_text || 'Без названия'
      digest += `• ${title}\n`
    })
  } else {
    digest += `Нет запланированных задач\n`
  }

  digest += `\n💤 Спокойной ночи!`

  return digest
}

async function generateWeeklyDigest(
  _db: Database.Database,
  notion: Client
): Promise<string> {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  void weekAgo.toISOString().split('T')[0]

  // Get stats for the week
  const completedTasks = await notion.databases.query({
    database_id: process.env.NOTION_TASKS_DB_ID!,
    filter: {
      property: 'Status',
      select: {
        equals: 'done'
      }
    }
  })

  let digest = `📊 **Недельный обзор**\n\n`
  digest += `✅ Выполнено задач: ${completedTasks.results.length}\n`
  digest += `\n🎯 Отличная работа!\n`
  digest += `🚀 Продолжай в том же духе!`

  return digest
}

async function saveDailyLog(
  notion: Client,
  date: string,
  type: string,
  content: string
) {
  await notion.pages.create({
    parent: { database_id: process.env.NOTION_DAILY_LOG_DB_ID! },
    properties: {
      Title: {
        title: [
          {
            text: {
              content: `${type === 'morning' ? 'Утренний' : 'Вечерний'} дайджест - ${date}`
            }
          }
        ]
      },
      Date: {
        date: {
          start: date
        }
      },
      Type: {
        select: {
          name: type === 'morning' ? 'morning' : 'evening'
        }
      }
    },
    children: [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content
              }
            }
          ]
        }
      }
    ]
  })
}

main()

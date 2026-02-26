/**
 * Dialogue Tools for MCP Server
 *
 * Provides tools for working with Telegram chat history.
 */

import { TelegramUserClient, ChatMessage } from './telegram-user-client.js'
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { join } from 'path'
import dotenv from 'dotenv'

dotenv.config()

const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'data', 'assistant.db')

/**
 * Get chat history with caching
 */
export async function getChatHistoryTool(
  userClient: TelegramUserClient,
  args: any
) {
  const { username, limit = 100, days_back = 7 } = args

  try {
    // Check cache first
    const cachedMessages = getCachedMessages(username, days_back)

    if (cachedMessages.length > 0) {
      console.log(`Using cached messages for ${username} (${cachedMessages.length} messages)`)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              username,
              messages_count: cachedMessages.length,
              messages: cachedMessages.slice(0, limit),
              cached: true,
            }),
          },
        ],
      }
    }

    // Fetch from Telegram API
    console.log(`Fetching messages from Telegram API for ${username}...`)
    const messages = await userClient.getChatHistory(username, limit, days_back)

    // Save to cache
    saveToCache(username, messages)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            username,
            messages_count: messages.length,
            messages,
            cached: false,
          }),
        },
      ],
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
          }),
        },
      ],
      isError: true,
    }
  }
}

/**
 * Search for a user
 */
export async function searchUserTool(userClient: TelegramUserClient, args: any) {
  const { username } = args

  try {
    const chatInfo = await userClient.searchUser(username)

    if (!chatInfo) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `User @${username} not found`,
            }),
          },
        ],
        isError: true,
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            chat_info: chatInfo,
          }),
        },
      ],
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
          }),
        },
      ],
      isError: true,
    }
  }
}

/**
 * Get chat info
 */
export async function getChatInfoTool(userClient: TelegramUserClient, args: any) {
  return searchUserTool(userClient, args)
}

/**
 * Get cached messages from database
 */
function getCachedMessages(username: string, daysBack: number): ChatMessage[] {
  try {
    const db = new Database(DB_PATH)

    const offsetDate = new Date()
    offsetDate.setDate(offsetDate.getDate() - daysBack)

    // Check if cache is fresh (< 24 hours old)
    const cacheThreshold = new Date()
    cacheThreshold.setHours(cacheThreshold.getHours() - 24)

    const messages = db
      .prepare(
        `SELECT sender_id, sender_name, sender_username, content, timestamp
         FROM telegram_dialogues
         WHERE chat_username = ?
         AND timestamp >= ?
         AND fetched_at >= ?
         ORDER BY timestamp ASC`
      )
      .all(username, offsetDate.toISOString(), cacheThreshold.toISOString()) as any[]

    db.close()

    return messages.map((msg) => ({
      id: randomUUID(),
      sender_id: msg.sender_id,
      sender_name: msg.sender_name,
      sender_username: msg.sender_username,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
    }))
  } catch (error) {
    console.error('Error reading cache:', error)
    return []
  }
}

/**
 * Save messages to cache
 */
function saveToCache(username: string, messages: ChatMessage[]): void {
  try {
    const db = new Database(DB_PATH)

    const stmt = db.prepare(
      `INSERT OR REPLACE INTO telegram_dialogues
       (id, chat_username, chat_id, message_id, sender_id, sender_name, sender_username, content, timestamp, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )

    const now = new Date().toISOString()

    for (const message of messages) {
      stmt.run(
        message.id,
        username,
        'unknown', // We don't have chat_id from API easily
        message.id,
        message.sender_id,
        message.sender_name,
        message.sender_username || null,
        message.content,
        message.timestamp.toISOString(),
        now
      )
    }

    db.close()
    console.log(`Saved ${messages.length} messages to cache`)
  } catch (error) {
    console.error('Error saving to cache:', error)
  }
}

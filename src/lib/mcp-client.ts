/**
 * MCP Client - Direct wrapper for MCP tools
 *
 * Provides simplified access to MCP tools without spawning processes.
 * Instead, imports and calls tool functions directly.
 */

import { Client as NotionClient } from '@notionhq/client'
import Database from 'better-sqlite3'
import { Bot } from 'grammy'
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { join } from 'path'
import dotenv from 'dotenv'

dotenv.config()

export interface MCPToolResult {
  success: boolean
  data?: any
  error?: string
}

/**
 * MCP Client for direct tool invocation
 */
export class MCPClient {
  private notion: NotionClient
  private db: Database.Database
  private telegram: Bot
  private telegramUserClient: TelegramClient | null = null

  constructor() {
    this.notion = new NotionClient({ auth: process.env.NOTION_API_KEY })
    this.db = new Database(process.env.DB_PATH || join(process.cwd(), 'data', 'assistant.db'))
    this.telegram = new Bot(process.env.TELEGRAM_BOT_TOKEN!)

    // Initialize Telegram User Client if credentials are available
    if (process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH && process.env.TELEGRAM_SESSION_STRING) {
      const session = new StringSession(process.env.TELEGRAM_SESSION_STRING)
      this.telegramUserClient = new TelegramClient(
        session,
        parseInt(process.env.TELEGRAM_API_ID),
        process.env.TELEGRAM_API_HASH,
        {
          connectionRetries: 5,
        }
      )

      // Connect in background
      this.telegramUserClient.connect().catch((err) => {
        console.error('Warning: Failed to connect Telegram User Client:', err.message)
        this.telegramUserClient = null
      })
    }
  }

  /**
   * Notion Tools
   */

  async notionSearch(query: string): Promise<MCPToolResult> {
    try {
      const response = await this.notion.search({
        query,
        filter: { property: 'object', value: 'page' }
      })

      return {
        success: true,
        data: response.results
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async notionCreatePage(args: {
    database: 'knowledge' | 'tasks' | 'daily_log'
    title: string
    properties?: Record<string, any>
    content?: string
  }): Promise<MCPToolResult> {
    try {
      const databaseId = this.getDatabaseId(args.database)

      const pageProperties: any = {
        Title: {
          title: [{ text: { content: args.title } }]
        }
      }

      // Merge additional properties (convert to Notion format)
      if (args.properties) {
        const convertedProperties = this.convertToNotionProperties(args.properties)
        Object.assign(pageProperties, convertedProperties)
      }

      // Split content into chunks of 2000 characters (Notion limit)
      let children: any[] | undefined = undefined

      if (args.content) {
        const MAX_CHUNK_SIZE = 2000
        const chunks: string[] = []

        for (let i = 0; i < args.content.length; i += MAX_CHUNK_SIZE) {
          chunks.push(args.content.slice(i, i + MAX_CHUNK_SIZE))
        }

        children = chunks.map((chunk) => ({
          object: 'block' as const,
          type: 'paragraph' as const,
          paragraph: {
            rich_text: [
              {
                type: 'text' as const,
                text: { content: chunk }
              }
            ]
          }
        }))
      }

      const page = await this.notion.pages.create({
        parent: { database_id: databaseId },
        properties: pageProperties,
        children
      })

      return {
        success: true,
        data: {
          page_id: page.id,
          url: (page as any).url
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async notionQueryDatabase(args: {
    database: 'knowledge' | 'tasks' | 'daily_log'
    filter?: Record<string, any>
  }): Promise<MCPToolResult> {
    try {
      const databaseId = this.getDatabaseId(args.database)

      const response = await this.notion.databases.query({
        database_id: databaseId,
        filter: args.filter as any
      })

      return {
        success: true,
        data: response.results
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async notionUpdatePage(args: {
    page_id: string
    properties?: Record<string, any>
  }): Promise<MCPToolResult> {
    try {
      await this.notion.pages.update({
        page_id: args.page_id,
        properties: args.properties || {}
      })

      return {
        success: true,
        data: { page_id: args.page_id }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Telegram Tools
   */

  async telegramSendMessage(args: {
    chat_id: string | number
    text: string
    parse_mode?: 'Markdown' | 'HTML'
  }): Promise<MCPToolResult> {
    try {
      await this.telegram.api.sendMessage(args.chat_id, args.text, {
        parse_mode: args.parse_mode || 'Markdown'
      })

      return {
        success: true,
        data: { sent: true }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Telegram Dialogue Tools (User Client)
   * Note: These require Telegram User Client to be initialized in MCP server
   */

  async telegramGetChatHistory(args: {
    username: string
    limit?: number
    days_back?: number
  }): Promise<MCPToolResult> {
    if (!this.telegramUserClient) {
      return {
        success: false,
        error: 'Telegram User Client not initialized. Please set TELEGRAM_API_ID, TELEGRAM_API_HASH, and TELEGRAM_SESSION_STRING in .env'
      }
    }

    try {
      const limit = args.limit || 100
      const daysBack = args.days_back || 7

      // Remove @ if present
      const cleanUsername = args.username.startsWith('@') ? args.username.slice(1) : args.username

      // Get entity (user, group, or channel)
      const entity = await this.telegramUserClient.getEntity(cleanUsername)

      // Calculate offset date
      const offsetDate = new Date()
      offsetDate.setDate(offsetDate.getDate() - daysBack)

      // Get messages
      const messages = await this.telegramUserClient.getMessages(entity, {
        limit,
        offsetDate: Math.floor(offsetDate.getTime() / 1000),
      })

      // Format messages
      const formattedMessages: any[] = []

      for (const message of messages) {
        if (!message || !message.message) {
          continue
        }

        // Get sender info
        let senderName = 'Unknown'
        let senderUsername: string | undefined
        let senderId = message.senderId?.toString() || 'unknown'

        if (message.sender) {
          const sender = message.sender as any
          if (sender.firstName || sender.lastName) {
            senderName = [sender.firstName, sender.lastName].filter(Boolean).join(' ')
          }
          if (sender.username) {
            senderUsername = sender.username
          }
          if (sender.id) {
            senderId = sender.id.toString()
          }
        }

        formattedMessages.push({
          id: message.id.toString(),
          sender_id: senderId,
          sender_name: senderName,
          sender_username: senderUsername,
          content: message.message,
          timestamp: new Date(message.date * 1000).toISOString(),
        })
      }

      // Reverse to get chronological order
      formattedMessages.reverse()

      return {
        success: true,
        data: {
          username: args.username,
          messages_count: formattedMessages.length,
          messages: formattedMessages,
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to get chat history: ${error.message}`
      }
    }
  }

  async telegramSearchUser(args: {
    username: string
  }): Promise<MCPToolResult> {
    if (!this.telegramUserClient) {
      return {
        success: false,
        error: 'Telegram User Client not initialized. Please set TELEGRAM_API_ID, TELEGRAM_API_HASH, and TELEGRAM_SESSION_STRING in .env'
      }
    }

    try {
      const cleanUsername = args.username.startsWith('@') ? args.username.slice(1) : args.username

      const entity = await this.telegramUserClient.getEntity(cleanUsername)

      if (!entity) {
        return {
          success: false,
          error: `User @${args.username} not found`
        }
      }

      const entityObj = entity as any

      return {
        success: true,
        data: {
          id: entityObj.id?.toString() || 'unknown',
          username: entityObj.username,
          title: entityObj.title || [entityObj.firstName, entityObj.lastName].filter(Boolean).join(' '),
          type: entityObj.broadcast ? 'channel' : entityObj.megagroup || entityObj.gigagroup ? 'group' : 'user',
          participants_count: entityObj.participantsCount,
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to search user: ${error.message}`
      }
    }
  }

  async telegramGetChatInfo(args: {
    username: string
  }): Promise<MCPToolResult> {
    return this.telegramSearchUser(args)
  }

  /**
   * Local Data Tools
   */

  dbQuery(sql: string, params: any[] = []): MCPToolResult {
    try {
      const results = this.db.prepare(sql).all(...params)

      return {
        success: true,
        data: results
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  dbSaveConversation(args: {
    telegram_chat_id: string
    telegram_message_id: number
    role: 'user' | 'assistant'
    content: string
  }): MCPToolResult {
    try {
      const now = new Date().toISOString()

      this.db
        .prepare(
          `INSERT INTO conversations (telegram_chat_id, telegram_message_id, role, content, timestamp)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(
          args.telegram_chat_id,
          args.telegram_message_id,
          args.role,
          args.content,
          now
        )

      return {
        success: true,
        data: { saved: true }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  dbGetContext(args: { telegram_chat_id: string; limit?: number }): MCPToolResult {
    try {
      const limit = args.limit || 10

      const results = this.db
        .prepare(
          `SELECT role, content, timestamp
           FROM conversations
           WHERE telegram_chat_id = ?
           ORDER BY timestamp DESC
           LIMIT ?`
        )
        .all(args.telegram_chat_id, limit)
        .reverse()

      return {
        success: true,
        data: results
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  dbSaveReminder(args: {
    notion_task_id: string
    message: string
    remind_at: string
  }): MCPToolResult {
    try {
      this.db
        .prepare(
          `INSERT INTO reminders (notion_task_id, message, remind_at, status)
           VALUES (?, ?, ?, 'pending')`
        )
        .run(args.notion_task_id, args.message, args.remind_at)

      return {
        success: true,
        data: { saved: true }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Perplexity Tool (using fetch API)
   */

  async perplexitySearch(query: string): Promise<MCPToolResult> {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'user',
              content: query
            }
          ]
        })
      })

      const data: any = await response.json()

      return {
        success: true,
        data: {
          answer: data.choices[0].message.content,
          citations: data.citations || []
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Helper: Get database ID by name
   */
  private getDatabaseId(database: 'knowledge' | 'tasks' | 'daily_log'): string {
    const mapping = {
      knowledge: process.env.NOTION_KNOWLEDGE_DB_ID!,
      tasks: process.env.NOTION_TASKS_DB_ID!,
      daily_log: process.env.NOTION_DAILY_LOG_DB_ID!
    }

    return mapping[database]
  }

  /**
   * Helper: Convert simple properties to Notion format
   */
  private convertToNotionProperties(properties: Record<string, any>): Record<string, any> {
    const converted: Record<string, any> = {}

    for (const [key, value] of Object.entries(properties)) {
      if (value === null || value === undefined) {
        continue
      }

      // If already in Notion format, use as is
      if (typeof value === 'object' && (value.select || value.multi_select || value.rich_text || value.title || value.date || value.url || value.checkbox)) {
        converted[key] = value
        continue
      }

      // Auto-convert based on value type and key name
      if (typeof value === 'string') {
        // Known select fields
        if (key === 'Category' || key === 'Status' || key === 'Priority' || key === 'Mood' || key === 'Energy') {
          converted[key] = { select: { name: value } }
        } else if (key === 'Source') {
          converted[key] = { url: value }
        } else {
          converted[key] = { rich_text: [{ text: { content: value } }] }
        }
      } else if (Array.isArray(value)) {
        // Assume multi_select
        converted[key] = { multi_select: value.map(v => typeof v === 'string' ? { name: v } : v) }
      } else if (typeof value === 'boolean') {
        converted[key] = { checkbox: value }
      } else if (typeof value === 'number') {
        converted[key] = { number: value }
      }
    }

    return converted
  }

  /**
   * Cleanup
   */
  async close() {
    this.db.close()
    if (this.telegramUserClient) {
      await this.telegramUserClient.disconnect()
    }
  }
}

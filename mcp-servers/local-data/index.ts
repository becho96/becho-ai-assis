#!/usr/bin/env node

/**
 * Local Data MCP Server
 * Provides tools for interacting with SQLite database
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { SqliteClient } from './sqlite-client.js'
import { createErrorResult } from '../../src/types/mcp.js'
import {
  dbQueryTool,
  saveConversationTool,
  getContextTool,
  saveReminderTool,
  getPreferenceTool,
} from './tools.js'

const DB_PATH = process.env.DB_PATH || './data/assistant.db'

// Initialize SQLite client
const sqliteClient = new SqliteClient(DB_PATH)

// Create MCP server
const server = new Server(
  {
    name: 'local-data-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'db_query',
        description:
          'Execute a read-only SQL query on the local SQLite database. Use for retrieving conversation history, reminders, or cached data.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'SQL SELECT query',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'db_save_conversation',
        description:
          'Save a conversation message to the database for context tracking.',
        inputSchema: {
          type: 'object',
          properties: {
            telegram_chat_id: {
              type: 'string',
              description: 'Telegram chat ID',
            },
            telegram_message_id: {
              type: 'string',
              description: 'Telegram message ID (optional)',
            },
            role: {
              type: 'string',
              enum: ['user', 'assistant', 'system'],
              description: 'Message role',
            },
            content: {
              type: 'string',
              description: 'Message content',
            },
            intent: {
              type: 'string',
              description: 'Classified intent (optional)',
            },
          },
          required: ['telegram_chat_id', 'role', 'content'],
        },
      },
      {
        name: 'db_get_context',
        description:
          'Retrieve recent conversation context for a chat. Returns last N messages.',
        inputSchema: {
          type: 'object',
          properties: {
            telegram_chat_id: {
              type: 'string',
              description: 'Telegram chat ID',
            },
            limit: {
              type: 'number',
              description: 'Number of messages to retrieve (default: 10)',
            },
          },
          required: ['telegram_chat_id'],
        },
      },
      {
        name: 'db_save_reminder',
        description: 'Save a reminder to the database.',
        inputSchema: {
          type: 'object',
          properties: {
            telegram_chat_id: {
              type: 'string',
              description: 'Telegram chat ID',
            },
            title: {
              type: 'string',
              description: 'Reminder title',
            },
            description: {
              type: 'string',
              description: 'Reminder description (optional)',
            },
            remind_at: {
              type: 'string',
              description: 'ISO datetime when to remind',
            },
            repeat_rule: {
              type: 'string',
              description: 'RRULE for recurring reminders (optional)',
            },
            notion_page_id: {
              type: 'string',
              description: 'Associated Notion page ID (optional)',
            },
          },
          required: ['telegram_chat_id', 'title', 'remind_at'],
        },
      },
      {
        name: 'db_get_preference',
        description: 'Get a user preference from the database.',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Preference key',
            },
          },
          required: ['key'],
        },
      },
    ],
  }
})

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'db_query':
        return await dbQueryTool(sqliteClient, args)

      case 'db_save_conversation':
        return await saveConversationTool(sqliteClient, args)

      case 'db_get_context':
        return await getContextTool(sqliteClient, args)

      case 'db_save_reminder':
        return await saveReminderTool(sqliteClient, args)

      case 'db_get_preference':
        return await getPreferenceTool(sqliteClient, args)

      default:
        return createErrorResult(`Unknown tool: ${name}`, 'UNKNOWN_TOOL')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return createErrorResult(message, 'TOOL_ERROR')
  }
})

// Start server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Local Data MCP server running on stdio')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

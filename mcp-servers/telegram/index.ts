#!/usr/bin/env node

/**
 * Telegram MCP Server
 * Provides tools for sending messages via Telegram Bot API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { TelegramClient } from './telegram-client.js'
import { TelegramUserClient } from './telegram-user-client.js'
import { createErrorResult } from '../../src/types/mcp.js'
import { sendMessageTool } from './tools.js'
import { getChatHistoryTool, searchUserTool } from './dialogue-tools.js'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const AUTHORIZED_USER_ID = process.env.TELEGRAM_AUTHORIZED_USER_ID
const API_ID = process.env.TELEGRAM_API_ID
const API_HASH = process.env.TELEGRAM_API_HASH
const SESSION_STRING = process.env.TELEGRAM_SESSION_STRING || ''

if (!BOT_TOKEN) {
  console.error('Error: TELEGRAM_BOT_TOKEN environment variable is required')
  process.exit(1)
}

// Initialize Telegram clients
const telegramClient = new TelegramClient(BOT_TOKEN, AUTHORIZED_USER_ID)

// Initialize Telegram User Client (MTProto) if credentials are available
let userClient: TelegramUserClient | null = null
if (API_ID && API_HASH) {
  userClient = new TelegramUserClient(API_ID, API_HASH, SESSION_STRING)
  userClient.connect().catch((err) => {
    console.error('Warning: Failed to connect Telegram User Client:', err.message)
    console.error('Dialogue analysis features will not be available.')
  })
}

// Create MCP server
const server = new Server(
  {
    name: 'telegram-server',
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
  const tools: any[] = [
    {
      name: 'telegram_send_message',
      description:
        'Send a message to the authorized user via Telegram bot. Use for notifications, reminders, or responses.',
      inputSchema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Message text (supports Markdown)',
          },
          parse_mode: {
            type: 'string',
            enum: ['Markdown', 'MarkdownV2', 'HTML'],
            description: 'Text formatting mode (default: Markdown)',
          },
        },
        required: ['text'],
      },
    },
  ]

  // Add dialogue analysis tools if user client is available
  if (userClient) {
    tools.push(
      {
        name: 'telegram_get_chat_history',
        description:
          'Get chat history from a Telegram dialogue (user, group, or channel). Returns messages with sender info and timestamps.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username or chat identifier (with or without @)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of messages to fetch (default: 100, max: 500)',
            },
            days_back: {
              type: 'number',
              description: 'How many days back to fetch messages (default: 7)',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'telegram_search_user',
        description:
          'Search for a Telegram user, group, or channel by username. Returns chat info.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username to search (with or without @)',
            },
          },
          required: ['username'],
        },
      }
    )
  }

  return { tools }
})

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'telegram_send_message':
        return await sendMessageTool(telegramClient, args)

      case 'telegram_get_chat_history':
        if (!userClient) {
          return createErrorResult(
            'Telegram User Client not initialized. Please set TELEGRAM_API_ID, TELEGRAM_API_HASH, and TELEGRAM_SESSION_STRING in .env',
            'CLIENT_NOT_INITIALIZED'
          )
        }
        return await getChatHistoryTool(userClient, args)

      case 'telegram_search_user':
        if (!userClient) {
          return createErrorResult(
            'Telegram User Client not initialized. Please set TELEGRAM_API_ID, TELEGRAM_API_HASH, and TELEGRAM_SESSION_STRING in .env',
            'CLIENT_NOT_INITIALIZED'
          )
        }
        return await searchUserTool(userClient, args)

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
  console.error('Telegram MCP server running on stdio')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

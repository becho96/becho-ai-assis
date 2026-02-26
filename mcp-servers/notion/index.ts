#!/usr/bin/env node

/**
 * Notion MCP Server
 * Provides tools for interacting with Notion API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { NotionClient } from './notion-client.js'
import { createErrorResult } from '../../src/types/mcp.js'
import {
  searchTool,
  createPageTool,
  updatePageTool,
  queryDatabaseTool,
  getPageTool,
  deletePageTool,
} from './tools.js'
import { setupProxy } from '../../src/lib/proxy.js'

setupProxy()

const NOTION_API_KEY = process.env.NOTION_API_KEY
const NOTION_KNOWLEDGE_DB = process.env.NOTION_KNOWLEDGE_DB_ID
const NOTION_TASKS_DB = process.env.NOTION_TASKS_DB_ID
const NOTION_DAILY_LOG_DB = process.env.NOTION_DAILY_LOG_DB_ID

if (!NOTION_API_KEY) {
  console.error('Error: NOTION_API_KEY environment variable is required')
  process.exit(1)
}

// Initialize Notion client
const notionClient = new NotionClient(NOTION_API_KEY, {
  knowledgeDbId: NOTION_KNOWLEDGE_DB,
  tasksDbId: NOTION_TASKS_DB,
  dailyLogDbId: NOTION_DAILY_LOG_DB,
})

// Create MCP server
const server = new Server(
  {
    name: 'notion-server',
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
        name: 'notion_search',
        description:
          'Search across all Notion pages and databases. Returns matching pages.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query text',
            },
            filter: {
              type: 'string',
              enum: ['page', 'database'],
              description: 'Filter results by type (optional)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'notion_create_page',
        description:
          'Create a new page in a Notion database. Use for creating notes, tasks, or daily logs.',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              enum: ['knowledge', 'tasks', 'daily_log'],
              description: 'Target database',
            },
            title: {
              type: 'string',
              description: 'Page title',
            },
            properties: {
              type: 'object',
              description: 'Page properties (depends on database schema)',
            },
            content: {
              type: 'string',
              description: 'Page content (markdown)',
            },
          },
          required: ['database', 'title'],
        },
      },
      {
        name: 'notion_update_page',
        description: 'Update properties or content of an existing Notion page.',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'Page ID to update',
            },
            properties: {
              type: 'object',
              description: 'Properties to update',
            },
            content: {
              type: 'string',
              description: 'New content (markdown, optional)',
            },
          },
          required: ['page_id'],
        },
      },
      {
        name: 'notion_query_database',
        description:
          'Query a Notion database with filters and sorts. Returns matching pages.',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              enum: ['knowledge', 'tasks', 'daily_log'],
              description: 'Database to query',
            },
            filter: {
              type: 'object',
              description: 'Notion filter object (optional)',
            },
            sorts: {
              type: 'array',
              description: 'Sort criteria (optional)',
            },
            limit: {
              type: 'number',
              description: 'Max results (default 10)',
            },
          },
          required: ['database'],
        },
      },
      {
        name: 'notion_get_page',
        description: 'Get full details of a Notion page by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'Page ID',
            },
          },
          required: ['page_id'],
        },
      },
      {
        name: 'notion_delete_page',
        description: 'Archive (soft delete) a Notion page.',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'Page ID to archive',
            },
          },
          required: ['page_id'],
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
      case 'notion_search':
        return await searchTool(notionClient, args)

      case 'notion_create_page':
        return await createPageTool(notionClient, args)

      case 'notion_update_page':
        return await updatePageTool(notionClient, args)

      case 'notion_query_database':
        return await queryDatabaseTool(notionClient, args)

      case 'notion_get_page':
        return await getPageTool(notionClient, args)

      case 'notion_delete_page':
        return await deletePageTool(notionClient, args)

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
  console.error('Notion MCP server running on stdio')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

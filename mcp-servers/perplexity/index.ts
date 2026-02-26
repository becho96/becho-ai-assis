#!/usr/bin/env node

/**
 * Perplexity MCP Server
 * Provides tools for intelligent web search via Perplexity API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { PerplexityClient } from './perplexity-client.js'
import { createErrorResult } from '../../src/types/mcp.js'
import { searchTool } from './tools.js'
import { setupProxy } from '../../src/lib/proxy.js'

setupProxy()

const API_KEY = process.env.PERPLEXITY_API_KEY

if (!API_KEY) {
  console.error('Warning: PERPLEXITY_API_KEY not set. Server will start but tools will fail.')
}

// Initialize Perplexity client
const perplexityClient = new PerplexityClient(API_KEY || '')

// Create MCP server
const server = new Server(
  {
    name: 'perplexity-server',
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
        name: 'perplexity_search',
        description:
          'Search the web using Perplexity AI. Returns comprehensive answer with sources and citations.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query or question',
            },
            model: {
              type: 'string',
              enum: ['sonar', 'sonar-pro'],
              description: 'Model to use (default: sonar)',
            },
          },
          required: ['query'],
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
      case 'perplexity_search':
        return await searchTool(perplexityClient, args)

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
  console.error('Perplexity MCP server running on stdio')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

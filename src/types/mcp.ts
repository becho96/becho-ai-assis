/**
 * Common MCP types and interfaces
 */

export interface MCPToolInput {
  [key: string]: unknown
}

export interface MCPToolResult {
  [x: string]: unknown
  content: Array<{
    type: 'text'
    text: string
  }>
  isError?: boolean
}

export interface MCPError {
  code: string
  message: string
}

export function createTextResult(text: string): MCPToolResult {
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  }
}

export function createErrorResult(
  message: string,
  code = 'INTERNAL_ERROR'
): MCPToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ error: { code, message } }),
      },
    ],
    isError: true,
  }
}

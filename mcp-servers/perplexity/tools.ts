/**
 * Perplexity MCP Server Tools
 */

import { PerplexityClient } from './perplexity-client.js'
import { createTextResult, createErrorResult } from '../../src/types/mcp.js'

export async function searchTool(client: PerplexityClient, args: any) {
  const { query, model = 'sonar' } = args

  if (!query) {
    return createErrorResult('query parameter is required', 'INVALID_PARAMS')
  }

  const result = await client.search(query, model)

  const answer = result.choices[0]?.message?.content || 'No answer found'
  const citations = result.citations || []

  return createTextResult(
    JSON.stringify(
      {
        answer,
        citations,
        model: result.model,
        usage: result.usage,
      },
      null,
      2
    )
  )
}

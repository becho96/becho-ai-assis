/**
 * Notion MCP Server Tools
 */

import { NotionClient } from './notion-client.js'
import { createTextResult, createErrorResult } from '../../src/types/mcp.js'

export async function searchTool(client: NotionClient, args: any) {
  const { query, filter } = args

  if (!query) {
    return createErrorResult('query parameter is required', 'INVALID_PARAMS')
  }

  const results = await client.search(query, filter)

  const summary = results.results.map((item: any) => ({
    id: item.id,
    type: item.object,
    title:
      item.properties?.Title?.title?.[0]?.plain_text ||
      item.properties?.Name?.title?.[0]?.plain_text ||
      'Untitled',
    url: item.url,
  }))

  return createTextResult(
    JSON.stringify(
      {
        total: results.results.length,
        results: summary,
      },
      null,
      2
    )
  )
}

export async function createPageTool(client: NotionClient, args: any) {
  const { database, title, properties = {}, content } = args

  if (!database || !title) {
    return createErrorResult(
      'database and title are required',
      'INVALID_PARAMS'
    )
  }

  const databaseId = client.getDatabaseId(database)

  // Build properties based on database type
  const pageProperties: any = {
    Title: {
      title: [
        {
          text: { content: title },
        },
      ],
    },
  }

  // Merge additional properties
  Object.assign(pageProperties, properties)

  const page = await client.createPage(databaseId, pageProperties, content)

  return createTextResult(
    JSON.stringify(
      {
        success: true,
        page_id: page.id,
        url: (page as any).url,
      },
      null,
      2
    )
  )
}

export async function updatePageTool(client: NotionClient, args: any) {
  const { page_id, properties } = args

  if (!page_id) {
    return createErrorResult('page_id is required', 'INVALID_PARAMS')
  }

  const page = await client.updatePage(page_id, properties)

  return createTextResult(
    JSON.stringify(
      {
        success: true,
        page_id: page.id,
        url: (page as any).url,
      },
      null,
      2
    )
  )
}

export async function queryDatabaseTool(client: NotionClient, args: any) {
  const { database, filter, sorts, limit = 10 } = args

  if (!database) {
    return createErrorResult('database is required', 'INVALID_PARAMS')
  }

  const databaseId = client.getDatabaseId(database)
  const results = await client.queryDatabase(databaseId, filter, sorts, limit)

  const pages = results.results.map((page: any) => ({
    id: page.id,
    title:
      page.properties?.Title?.title?.[0]?.plain_text ||
      page.properties?.Date?.title?.[0]?.plain_text ||
      'Untitled',
    properties: page.properties,
    url: page.url,
    created_time: page.created_time,
    last_edited_time: page.last_edited_time,
  }))

  return createTextResult(
    JSON.stringify(
      {
        total: results.results.length,
        has_more: results.has_more,
        results: pages,
      },
      null,
      2
    )
  )
}

export async function getPageTool(client: NotionClient, args: any) {
  const { page_id } = args

  if (!page_id) {
    return createErrorResult('page_id is required', 'INVALID_PARAMS')
  }

  const page = await client.getPage(page_id)

  return createTextResult(JSON.stringify(page, null, 2))
}

export async function deletePageTool(client: NotionClient, args: any) {
  const { page_id } = args

  if (!page_id) {
    return createErrorResult('page_id is required', 'INVALID_PARAMS')
  }

  await client.archivePage(page_id)

  return createTextResult(
    JSON.stringify(
      {
        success: true,
        page_id,
        archived: true,
      },
      null,
      2
    )
  )
}

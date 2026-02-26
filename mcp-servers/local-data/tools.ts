/**
 * Local Data MCP Server Tools
 */

import { SqliteClient } from './sqlite-client.js'
import { createTextResult, createErrorResult } from '../../src/types/mcp.js'

export async function dbQueryTool(client: SqliteClient, args: any) {
  const { query } = args

  if (!query) {
    return createErrorResult('query parameter is required', 'INVALID_PARAMS')
  }

  // Only allow SELECT queries for safety
  if (!query.trim().toLowerCase().startsWith('select')) {
    return createErrorResult(
      'Only SELECT queries are allowed',
      'INVALID_QUERY'
    )
  }

  const results = client.query(query)

  return createTextResult(
    JSON.stringify(
      {
        total: results.length,
        results,
      },
      null,
      2
    )
  )
}

export async function saveConversationTool(client: SqliteClient, args: any) {
  const { telegram_chat_id, telegram_message_id, role, content, intent } = args

  if (!telegram_chat_id || !role || !content) {
    return createErrorResult(
      'telegram_chat_id, role, and content are required',
      'INVALID_PARAMS'
    )
  }

  const result = client.saveConversation({
    telegram_chat_id,
    telegram_message_id,
    role,
    content,
    intent,
  })

  return createTextResult(
    JSON.stringify(
      {
        success: true,
        changes: result.changes,
      },
      null,
      2
    )
  )
}

export async function getContextTool(client: SqliteClient, args: any) {
  const { telegram_chat_id, limit = 10 } = args

  if (!telegram_chat_id) {
    return createErrorResult(
      'telegram_chat_id is required',
      'INVALID_PARAMS'
    )
  }

  const messages = client.getContext(telegram_chat_id, limit)

  return createTextResult(
    JSON.stringify(
      {
        total: messages.length,
        messages: messages.reverse(), // Return in chronological order
      },
      null,
      2
    )
  )
}

export async function saveReminderTool(client: SqliteClient, args: any) {
  const {
    telegram_chat_id,
    title,
    description,
    remind_at,
    repeat_rule,
    notion_page_id,
  } = args

  if (!telegram_chat_id || !title || !remind_at) {
    return createErrorResult(
      'telegram_chat_id, title, and remind_at are required',
      'INVALID_PARAMS'
    )
  }

  const result = client.saveReminder({
    telegram_chat_id,
    title,
    description,
    remind_at,
    repeat_rule,
    notion_page_id,
  })

  return createTextResult(
    JSON.stringify(
      {
        success: true,
        changes: result.changes,
      },
      null,
      2
    )
  )
}

export async function getPreferenceTool(client: SqliteClient, args: any) {
  const { key } = args

  if (!key) {
    return createErrorResult('key is required', 'INVALID_PARAMS')
  }

  const preference = client.getPreference(key) as { key: string; value: string } | undefined

  if (!preference) {
    return createErrorResult(`Preference "${key}" not found`, 'NOT_FOUND')
  }

  return createTextResult(
    JSON.stringify(
      {
        key: preference.key,
        value: preference.value,
      },
      null,
      2
    )
  )
}

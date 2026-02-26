/**
 * Telegram MCP Server Tools
 */

import { TelegramClient } from './telegram-client.js'
import { createTextResult, createErrorResult } from '../../src/types/mcp.js'

export async function sendMessageTool(client: TelegramClient, args: any) {
  const { text, parse_mode = 'Markdown' } = args

  if (!text) {
    return createErrorResult('text parameter is required', 'INVALID_PARAMS')
  }

  const chatId = client.getAuthorizedChatId()
  const result = await client.sendMessage(chatId, text, parse_mode)

  return createTextResult(
    JSON.stringify(
      {
        success: true,
        message_id: result.message_id,
        chat_id: result.chat.id,
        text: result.text,
      },
      null,
      2
    )
  )
}

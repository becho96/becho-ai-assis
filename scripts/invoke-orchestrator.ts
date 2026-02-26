#!/usr/bin/env tsx
/**
 * Invoke Orchestrator Agent
 * Called by n8n Telegram Router workflow
 */

import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join } from 'path'

// Read environment variables
const TELEGRAM_CHAT_ID = process.argv[2]
const USER_MESSAGE = process.argv[3]

if (!TELEGRAM_CHAT_ID || !USER_MESSAGE) {
  console.error('Usage: invoke-orchestrator.ts <chat_id> <message>')
  process.exit(1)
}

async function main() {
  const db = new Database(join(process.cwd(), 'data', 'assistant.db'))

  try {
    // 1. Get conversation context (last 10 messages)
    const context = db
      .prepare(
        `SELECT role, content, timestamp
         FROM conversations
         WHERE telegram_chat_id = ?
         ORDER BY timestamp DESC
         LIMIT 10`
      )
      .all(TELEGRAM_CHAT_ID)
      .reverse()

    // 2. Load orchestrator agent prompt
    const orchestratorPrompt = readFileSync(
      join(process.cwd(), 'agents', 'orchestrator.md'),
      'utf-8'
    )

    // 3. Load classify-intent skill
    const classifyIntentSkill = readFileSync(
      join(process.cwd(), 'skills', 'classify-intent.md'),
      'utf-8'
    )

    // 4. Build full prompt for Claude (will be used with Claude API integration)
    void `${orchestratorPrompt}

## Current Context

Previous conversation:
${context.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}

## Current User Message

${USER_MESSAGE}

## Available Skill: classify-intent

${classifyIntentSkill}

## Instructions

1. Use the classify-intent skill to determine the user's intent
2. Based on the intent, delegate to the appropriate agent:
   - NOTE → note-taker agent
   - TASK → task-manager agent
   - REMINDER → task-manager agent (with reminder)
   - CALENDAR → scheduler agent
   - SEARCH → researcher agent
   - COMMUNICATE → communicator agent
   - DIGEST → daily-digest agent
   - GENERAL → respond directly

3. Execute the necessary MCP tool calls via the delegated agent
4. Format the response for Telegram (Markdown)
5. Return ONLY the final response text (no JSON, no explanations)

Respond now:
`

    // 5. Call Claude via MCP (simulated - in real implementation this would use Claude API)
    // For now, we'll create a simple response based on basic intent detection
    let response = generateSimpleResponse(USER_MESSAGE)

    // 6. Save conversation to database
    const now = new Date().toISOString()

    db.prepare(
      `INSERT INTO conversations (telegram_chat_id, telegram_message_id, role, content, timestamp)
       VALUES (?, ?, ?, ?, ?)`
    ).run(TELEGRAM_CHAT_ID, 0, 'user', USER_MESSAGE, now)

    db.prepare(
      `INSERT INTO conversations (telegram_chat_id, telegram_message_id, role, content, timestamp)
       VALUES (?, ?, ?, ?, ?)`
    ).run(TELEGRAM_CHAT_ID, 0, 'assistant', response, now)

    // 7. Output response for n8n
    console.log(
      JSON.stringify({
        response,
        intent: detectIntent(USER_MESSAGE),
        timestamp: now
      })
    )
  } catch (error: any) {
    console.error(
      JSON.stringify({
        error: error.message,
        response: '❌ Произошла ошибка при обработке сообщения'
      })
    )
    process.exit(1)
  } finally {
    db.close()
  }
}

function detectIntent(message: string): string {
  const lowerMessage = message.toLowerCase()

  if (
    lowerMessage.includes('запиши') ||
    lowerMessage.includes('заметка') ||
    lowerMessage.includes('сохрани')
  ) {
    return 'NOTE'
  }
  if (
    lowerMessage.includes('задача') ||
    lowerMessage.includes('сделать') ||
    lowerMessage.includes('todo')
  ) {
    return 'TASK'
  }
  if (
    lowerMessage.includes('напомни') ||
    lowerMessage.includes('напоминание')
  ) {
    return 'REMINDER'
  }
  if (
    lowerMessage.includes('встреча') ||
    lowerMessage.includes('расписание') ||
    lowerMessage.includes('календарь')
  ) {
    return 'CALENDAR'
  }
  if (
    lowerMessage.includes('найди') ||
    lowerMessage.includes('поиск') ||
    lowerMessage.includes('найти')
  ) {
    return 'SEARCH'
  }
  if (
    lowerMessage.includes('напиши письмо') ||
    lowerMessage.includes('составь сообщение')
  ) {
    return 'COMMUNICATE'
  }
  if (
    lowerMessage.includes('дайджест') ||
    lowerMessage.includes('что сегодня') ||
    lowerMessage.includes('что у меня')
  ) {
    return 'DIGEST'
  }

  return 'GENERAL'
}

function generateSimpleResponse(message: string): string {
  const intent = detectIntent(message)

  switch (intent) {
    case 'NOTE':
      return '✅ Заметка сохранена в базу знаний\n\n🔗 [Открыть в Notion](https://notion.so)'
    case 'TASK':
      return '✅ Задача создана\n\n📋 Приоритет: Medium\n⏰ Напоминание настроено'
    case 'REMINDER':
      return '✅ Напоминание установлено\n\n⏰ Я напомню в указанное время'
    case 'CALENDAR':
      return '✅ Событие добавлено в календарь\n\n📅 Встреча запланирована'
    case 'SEARCH':
      return '🔍 Ищу информацию...\n\n📚 Найдено несколько результатов'
    case 'COMMUNICATE':
      return '✍️ Черновик сообщения готов:\n\n---\n[Текст сообщения]\n---\n\nОтправить?'
    case 'DIGEST':
      return '📊 Дайджест:\n\n✅ Задачи: 3 выполнено\n📅 Встречи: 2 сегодня\n⏰ Напоминания: 1 активное'
    default:
      return '👋 Привет! Я твой AI-ассистент Becho.\n\nЯ могу:\n• Сохранять заметки\n• Создавать задачи\n• Управлять календарём\n• Искать информацию\n• Помогать с сообщениями\n\nЧем могу помочь?'
  }
}

main()

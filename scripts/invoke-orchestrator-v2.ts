#!/usr/bin/env tsx
/**
 * Invoke Orchestrator Agent (v2 with real Claude API)
 * Called by n8n Telegram Router workflow
 */

import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'
import { MCPClient } from '../src/lib/mcp-client.js'
import { conversationLogger } from '../src/lib/conversation-logger.js'
import { setupProxy } from '../src/lib/proxy.js'

dotenv.config()
setupProxy()

// Read CLI arguments
const TELEGRAM_CHAT_ID = process.argv[2]
const USER_MESSAGE = process.argv[3]

if (!TELEGRAM_CHAT_ID || !USER_MESSAGE) {
  console.error('Usage: invoke-orchestrator-v2.ts <chat_id> <message>')
  process.exit(1)
}

async function main() {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  })

  const mcpClient = new MCPClient()

  try {
    // 1. Get conversation context (last 10 messages)
    const contextResult = mcpClient.dbGetContext({
      telegram_chat_id: TELEGRAM_CHAT_ID,
      limit: 10
    })

    const context =
      contextResult.success && contextResult.data ? contextResult.data : []

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

    // 4. Check if we need dialogue-analyzer (pre-check for DIALOGUE_ANALYSIS keywords)
    const dialogueKeywords = ['проанализируй переписку', 'анализ диалога', 'что обсуждали с', 'сформируй задачи из переписки']
    const needsDialogueAnalyzer = dialogueKeywords.some(keyword => 
      USER_MESSAGE.toLowerCase().includes(keyword)
    )

    // 5. Build system prompt with current date
    const currentDateTime = new Date()
    const currentDate = currentDateTime.toLocaleDateString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const currentDateISO = currentDateTime.toISOString().split('T')[0]

    let systemPrompt = `# ВАЖНО: Текущая дата и время

Сегодня: ${currentDate}
Дата (ISO): ${currentDateISO}
Время: ${currentDateTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}

${orchestratorPrompt}

## Available Skills

### Classify Intent
${classifyIntentSkill}`

    // Load dialogue-analyzer if needed
    if (needsDialogueAnalyzer) {
      const dialogueAnalyzerPrompt = readFileSync(
        join(process.cwd(), 'agents', 'dialogue-analyzer.md'),
        'utf-8'
      )
      const analyzeDialogueSkill = readFileSync(
        join(process.cwd(), 'skills', 'analyze-dialogue.md'),
        'utf-8'
      )

      systemPrompt += `

### Dialogue Analyzer Agent
${dialogueAnalyzerPrompt}

### Analyze Dialogue Skill
${analyzeDialogueSkill}`
    }

    systemPrompt += `

## Your Role

You are the Orchestrator agent. Your job is to:
1. Understand the user's intent using the classify-intent skill
2. Delegate to the appropriate specialist agent (you ARE the orchestrator, so you execute the delegation yourself)
3. Call the necessary MCP tools to fulfill the request
4. Return a formatted Markdown response for Telegram

## Available MCP Tools

You have access to these tools:

**Notion Tools:**
- notion_search(query: string) - Search for pages in Notion
- notion_create_page(database, title, properties?, content?) - Create a new page
- notion_query_database(database, filter?) - Query a database
- notion_update_page(page_id, properties) - Update a page

**Telegram Tools:**
- telegram_send_message(chat_id, text, parse_mode?) - Send a message
- telegram_get_chat_history(username, limit?, days_back?) - Get chat history for dialogue analysis
- telegram_search_user(username) - Search for a user/chat by username

**Local Data Tools:**
- db_query(sql, params?) - Execute SQL query
- db_save_conversation(telegram_chat_id, telegram_message_id, role, content) - Save message
- db_get_context(telegram_chat_id, limit?) - Get conversation history
- db_save_reminder(notion_task_id, message, remind_at) - Save a reminder

**Perplexity Tool:**
- perplexity_search(query) - Search the web with Perplexity AI

## Intent to Action Mapping

- **NOTE** → Use notion_create_page(database="knowledge", ...)
- **TASK** → Use notion_create_page(database="tasks", ...) + optional db_save_reminder
- **REMINDER** → Use notion_create_page(database="tasks", ...) + db_save_reminder
- **CALENDAR** → (Future: calendar integration)
- **SEARCH** → Use perplexity_search + optional notion_search
- **COMMUNICATE** → Draft message and return it
- **DIGEST** → Use notion_query_database + db_query to gather data
- **DIALOGUE_ANALYSIS** → Use telegram_search_user + telegram_get_chat_history + analyze_dialogue skill + notion_create_page
- **GENERAL** → Just respond conversationally

## Important

- ALWAYS respond in Russian
- Use Markdown formatting
- Include emoji for better UX
- Keep responses concise (2-5 sentences)
- If you create something in Notion, return the URL
`

    // 5. Build conversation messages
    const messages: Anthropic.MessageParam[] = []

    // Add context
    if (context.length > 0) {
      context.forEach((msg: any) => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        })
      })
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: USER_MESSAGE
    })

    // Log user message
    conversationLogger.logUserMessage(TELEGRAM_CHAT_ID, USER_MESSAGE)

    // 6. Define MCP tools for Anthropic
    const tools: Anthropic.Tool[] = [
      {
        name: 'notion_search',
        description: 'Search for pages in Notion Knowledge Base',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'notion_create_page',
        description: 'Create a new page in Notion (Knowledge Base, Tasks, or Daily Log)',
        input_schema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              enum: ['knowledge', 'tasks', 'daily_log'],
              description: 'Which database to create the page in'
            },
            title: {
              type: 'string',
              description: 'Page title'
            },
            properties: {
              type: 'object',
              description: 'Additional properties (Category, Tags, Status, Priority, Due Date, etc.)'
            },
            content: {
              type: 'string',
              description: 'Page content'
            }
          },
          required: ['database', 'title']
        }
      },
      {
        name: 'notion_query_database',
        description: 'Query a Notion database with filters',
        input_schema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              enum: ['knowledge', 'tasks', 'daily_log']
            },
            filter: {
              type: 'object',
              description: 'Notion filter object'
            }
          },
          required: ['database']
        }
      },
      {
        name: 'db_save_reminder',
        description: 'Save a reminder in the local database',
        input_schema: {
          type: 'object',
          properties: {
            notion_task_id: {
              type: 'string',
              description: 'The Notion task page ID'
            },
            message: {
              type: 'string',
              description: 'Reminder message'
            },
            remind_at: {
              type: 'string',
              description: 'ISO datetime when to remind'
            }
          },
          required: ['notion_task_id', 'message', 'remind_at']
        }
      },
      {
        name: 'perplexity_search',
        description: 'Search the web using Perplexity AI',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'telegram_get_chat_history',
        description: 'Get chat history from Telegram dialogue for analysis',
        input_schema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username or chat name (with or without @)'
            },
            limit: {
              type: 'number',
              description: 'Max number of messages to fetch (default: 100, max: 500)'
            },
            days_back: {
              type: 'number',
              description: 'How many days back to fetch messages (default: 7)'
            }
          },
          required: ['username']
        }
      },
      {
        name: 'telegram_search_user',
        description: 'Search for a Telegram user or chat by username',
        input_schema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username to search for (with or without @)'
            }
          },
          required: ['username']
        }
      },
      {
        name: 'telegram_get_chat_info',
        description: 'Get information about a Telegram chat (same as search_user)',
        input_schema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username or chat name'
            }
          },
          required: ['username']
        }
      }
    ]

    // 7. Agentic loop: Allow Claude to use tools
    let finalResponse = ''
    const maxIterations = 5

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        tools
      })

      // Check if Claude finished
      if (response.stop_reason === 'end_turn') {
        const textContent = response.content.find(block => block.type === 'text')
        if (textContent && 'text' in textContent) {
          finalResponse = textContent.text
        }
        break
      }

      // Check if Claude wants to use tools
      if (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(
          block => block.type === 'tool_use'
        ) as Anthropic.ToolUseBlock[]

        if (toolUseBlocks.length === 0) {
          const textContent = response.content.find(block => block.type === 'text')
          if (textContent && 'text' in textContent) {
            finalResponse = textContent.text
          }
          break
        }

        // Execute tools
        const toolResults: Anthropic.ToolResultBlockParam[] = []

        for (const toolUse of toolUseBlocks) {
          let result: any

          // Execute the appropriate MCP tool
          switch (toolUse.name) {
            case 'notion_search':
              result = await mcpClient.notionSearch((toolUse.input as Record<string, any>).query)
              break
            case 'notion_create_page':
              result = await mcpClient.notionCreatePage(toolUse.input as any)
              break
            case 'notion_query_database':
              result = await mcpClient.notionQueryDatabase(toolUse.input as any)
              break
            case 'db_save_reminder':
              result = mcpClient.dbSaveReminder(toolUse.input as any)
              break
            case 'perplexity_search':
              result = await mcpClient.perplexitySearch((toolUse.input as Record<string, any>).query)
              break
            case 'telegram_get_chat_history':
              result = await mcpClient.telegramGetChatHistory(toolUse.input as any)
              break
            case 'telegram_search_user':
              result = await mcpClient.telegramSearchUser(toolUse.input as any)
              break
            case 'telegram_get_chat_info':
              result = await mcpClient.telegramGetChatInfo(toolUse.input as any)
              break
            default:
              result = { success: false, error: 'Unknown tool' }
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result)
          })
        }

        // Add assistant response + tool results to conversation
        messages.push({
          role: 'assistant',
          content: response.content
        })

        messages.push({
          role: 'user',
          content: toolResults
        })

        // Continue loop
        continue
      }

      // Other stop reasons
      const textContent = response.content.find(block => block.type === 'text')
      if (textContent && 'text' in textContent) {
        finalResponse = textContent.text
      }
      break
    }

    // 8. Log assistant response
    conversationLogger.logAssistantResponse(TELEGRAM_CHAT_ID, finalResponse)

    // 9. Save conversation
    const now = new Date().toISOString()

    mcpClient.dbSaveConversation({
      telegram_chat_id: TELEGRAM_CHAT_ID,
      telegram_message_id: 0,
      role: 'user',
      content: USER_MESSAGE
    })

    mcpClient.dbSaveConversation({
      telegram_chat_id: TELEGRAM_CHAT_ID,
      telegram_message_id: 0,
      role: 'assistant',
      content: finalResponse
    })

    // 10. Output for n8n
    console.log(
      JSON.stringify({
        response: finalResponse,
        timestamp: now
      })
    )
  } catch (error: any) {
    console.error(
      JSON.stringify({
        error: error.message,
        response: '❌ Произошла ошибка при обработке сообщения. Попробуйте ещё раз.'
      })
    )
    process.exit(1)
  } finally {
    mcpClient.close()
  }
}

main()

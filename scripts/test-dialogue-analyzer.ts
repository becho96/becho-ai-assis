#!/usr/bin/env tsx

/**
 * Test Dialogue Analyzer
 *
 * Tests the full flow:
 * 1. Search user
 * 2. Get chat history
 * 3. Analyze dialogue
 * 4. Save to Notion
 */

import { TelegramUserClient } from '../mcp-servers/telegram/telegram-user-client.js'
import dotenv from 'dotenv'

dotenv.config()

const API_ID = process.env.TELEGRAM_API_ID
const API_HASH = process.env.TELEGRAM_API_HASH
const SESSION_STRING = process.env.TELEGRAM_SESSION_STRING

if (!API_ID || !API_HASH || !SESSION_STRING) {
  console.error('❌ Missing environment variables!')
  console.error('Required: TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION_STRING')
  console.error('\nRun: npx tsx scripts/auth-telegram-user.ts to get session string')
  process.exit(1)
}

const username = process.argv[2]
const daysBack = parseInt(process.argv[3] || '7')

if (!username) {
  console.error('Usage: test-dialogue-analyzer.ts <username> [days_back]')
  console.error('Example: test-dialogue-analyzer.ts @zadum_off 7')
  process.exit(1)
}

async function main() {
  console.log('🧪 Testing Dialogue Analyzer\n')
  console.log(`Username: ${username}`)
  console.log(`Days back: ${daysBack}\n`)

  const userClient = new TelegramUserClient(API_ID!, API_HASH!, SESSION_STRING!)

  try {
    // Step 1: Connect
    console.log('1️⃣ Connecting to Telegram...')
    await userClient.connect()
    console.log('✅ Connected\n')

    // Step 2: Search user
    console.log('2️⃣ Searching for user...')
    const chatInfo = await userClient.searchUser(username)
    
    if (!chatInfo) {
      console.error(`❌ User ${username} not found`)
      await userClient.disconnect()
      process.exit(1)
    }

    console.log('✅ User found:')
    console.log(JSON.stringify(chatInfo, null, 2))
    console.log()

    // Step 3: Get chat history
    console.log('3️⃣ Fetching chat history...')
    const messages = await userClient.getChatHistory(username, 100, daysBack)
    
    console.log(`✅ Fetched ${messages.length} messages\n`)

    if (messages.length === 0) {
      console.log('📭 No messages found in this time range')
      await userClient.disconnect()
      return
    }

    // Step 4: Display sample messages
    console.log('4️⃣ Sample messages (first 5):')
    console.log('─'.repeat(80))
    
    messages.slice(0, 5).forEach((msg, idx) => {
      const timestamp = new Date(msg.timestamp).toLocaleString('ru-RU')
      console.log(`\n[${idx + 1}] ${msg.sender_name} (@${msg.sender_username || 'unknown'}) - ${timestamp}`)
      console.log(`    ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`)
    })
    
    console.log('\n' + '─'.repeat(80))

    // Step 5: Analyze (mock - we would call Claude here)
    console.log('\n5️⃣ Analysis preview:')
    console.log('─'.repeat(80))
    
    // Extract some basic stats
    const senders = new Set(messages.map(m => m.sender_name))
    const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0)
    const avgLength = Math.round(totalLength / messages.length)

    console.log(`📊 Statistics:`)
    console.log(`   • Total messages: ${messages.length}`)
    console.log(`   • Participants: ${senders.size} (${Array.from(senders).join(', ')})`)
    console.log(`   • Average message length: ${avgLength} chars`)
    console.log(`   • Time range: ${new Date(messages[0].timestamp).toLocaleDateString('ru-RU')} - ${new Date(messages[messages.length - 1].timestamp).toLocaleDateString('ru-RU')}`)
    
    console.log('\n💡 To perform full analysis with Claude, use:')
    console.log(`   npx tsx scripts/invoke-orchestrator-v2.ts <chat_id> "Проанализируй переписку с ${username} за последние ${daysBack} дней"`)
    
    console.log('\n' + '─'.repeat(80))

    // Step 6: Save to cache (would happen in dialogue-tools)
    console.log('\n6️⃣ Cache simulation:')
    console.log('✅ In production, these messages would be cached in SQLite')

    // Step 7: Notion save (would happen in dialogue-analyzer agent)
    console.log('\n7️⃣ Notion integration:')
    console.log('✅ In production, analysis would be saved to Notion Knowledge Base')

    console.log('\n✨ Test completed successfully!')

  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  } finally {
    await userClient.disconnect()
  }
}

main()

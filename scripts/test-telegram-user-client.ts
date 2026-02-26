#!/usr/bin/env tsx

/**
 * Test Telegram User Client in MCPClient
 */

import { MCPClient } from '../src/lib/mcp-client.js'
import dotenv from 'dotenv'

dotenv.config()

console.log('🧪 Testing Telegram User Client in MCPClient\n')

// Check environment variables
console.log('📋 Configuration:')
console.log(`   TELEGRAM_API_ID: ${process.env.TELEGRAM_API_ID ? '✅' : '❌'}`)
console.log(`   TELEGRAM_API_HASH: ${process.env.TELEGRAM_API_HASH ? '✅' : '❌'}`)
console.log(`   TELEGRAM_SESSION_STRING: ${process.env.TELEGRAM_SESSION_STRING ? '✅' : '❌'}`)
console.log()

async function testUserClient() {
  console.log('🚀 Initializing MCPClient...\n')

  const mcpClient = new MCPClient()

  // Wait a bit for connection
  await new Promise(resolve => setTimeout(resolve, 3000))

  console.log('🔍 Testing telegram_search_user...')
  const searchResult = await mcpClient.telegramSearchUser({ username: 'kanzeparov' })

  if (searchResult.success) {
    console.log('✅ User found!')
    console.log('   Data:', JSON.stringify(searchResult.data, null, 2))
  } else {
    console.log('❌ Search failed:', searchResult.error)
  }

  console.log('\n📜 Testing telegram_get_chat_history...')
  const historyResult = await mcpClient.telegramGetChatHistory({
    username: 'kanzeparov',
    limit: 10,
    days_back: 7
  })

  if (historyResult.success) {
    console.log('✅ History retrieved!')
    console.log(`   Messages count: ${historyResult.data.messages_count}`)
    if (historyResult.data.messages.length > 0) {
      console.log(`   First message: ${historyResult.data.messages[0].content.substring(0, 50)}...`)
    }
  } else {
    console.log('❌ History retrieval failed:', historyResult.error)
  }

  await mcpClient.close()

  console.log('\n' + '='.repeat(80))
  console.log('✨ Test complete!')

  if (searchResult.success && historyResult.success) {
    console.log('\n🎉 All tests passed! Your assistant can now access chat history!')
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.')
  }
}

testUserClient().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})

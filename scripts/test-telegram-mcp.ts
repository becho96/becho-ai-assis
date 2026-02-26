#!/usr/bin/env tsx

/**
 * Test Telegram MCP Server with User Client
 *
 * Tests the Telegram MCP server's ability to access chat history
 */

import { spawn } from 'child_process'
import dotenv from 'dotenv'

dotenv.config()

console.log('🧪 Testing Telegram MCP Server with User Client\n')

// Check environment variables
console.log('📋 Checking configuration:')
console.log(`   TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅' : '❌'}`)
console.log(`   TELEGRAM_API_ID: ${process.env.TELEGRAM_API_ID ? '✅' : '❌'}`)
console.log(`   TELEGRAM_API_HASH: ${process.env.TELEGRAM_API_HASH ? '✅' : '❌'}`)
console.log(`   TELEGRAM_SESSION_STRING: ${process.env.TELEGRAM_SESSION_STRING ? '✅' : '❌'}`)
console.log()

if (!process.env.TELEGRAM_SESSION_STRING) {
  console.error('❌ TELEGRAM_SESSION_STRING is missing!')
  console.error('   Run: npx tsx scripts/auth-telegram-qr.ts')
  process.exit(1)
}

async function testMCPServer() {
  console.log('🚀 Starting Telegram MCP server...\n')

  const proc = spawn('npx', ['tsx', 'mcp-servers/telegram/index.ts'], {
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  let output = ''
  let errorOutput = ''

  proc.stdout?.on('data', (data) => {
    const text = data.toString()
    output += text
    if (text.includes('running on stdio')) {
      console.log('✅ MCP server started successfully!')
    }
  })

  proc.stderr?.on('data', (data) => {
    const text = data.toString()
    errorOutput += text
    console.log('   ', text.trim())
  })

  // Send list tools request
  setTimeout(() => {
    console.log('\n📝 Requesting available tools...\n')
    const listToolsRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    })
    proc.stdin?.write(listToolsRequest + '\n')
  }, 2000)

  // Wait for response
  setTimeout(() => {
    proc.kill()

    console.log('\n' + '='.repeat(80))
    console.log('📊 Test Results:\n')

    if (errorOutput.includes('running on stdio')) {
      console.log('✅ MCP Server: Running')
    } else {
      console.log('❌ MCP Server: Failed to start')
    }

    if (errorOutput.includes('Connected to Telegram') || errorOutput.includes('User Client')) {
      console.log('✅ Telegram User Client: Connected')
    } else if (errorOutput.includes('Failed to connect')) {
      console.log('❌ Telegram User Client: Connection failed')
    } else {
      console.log('⚠️  Telegram User Client: Status unclear')
    }

    console.log('\n' + '='.repeat(80))
    console.log('\n💡 Next steps:')
    console.log('   1. If User Client connected: ✅ You can now access chat history!')
    console.log('   2. If connection failed: Check SESSION_STRING and try re-authorization')
    console.log('   3. Test chat history: Send "Проанализируй диалог с @kanzeparov" to your assistant')
    console.log()

    process.exit(0)
  }, 5000)
}

testMCPServer().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})

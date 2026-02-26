#!/usr/bin/env tsx

/**
 * Test Telegram API Connection
 *
 * Quick diagnostic script to verify API credentials and connection
 */

import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import dotenv from 'dotenv'

dotenv.config()

const API_ID = process.env.TELEGRAM_API_ID
const API_HASH = process.env.TELEGRAM_API_HASH

console.log('🔍 Telegram API Connection Test\n')

if (!API_ID || !API_HASH) {
  console.error('❌ Missing credentials in .env:')
  console.error(`   TELEGRAM_API_ID: ${API_ID ? '✅' : '❌'}`)
  console.error(`   TELEGRAM_API_HASH: ${API_HASH ? '✅' : '❌'}`)
  process.exit(1)
}

console.log('✅ Credentials found:')
console.log(`   API ID: ${API_ID}`)
console.log(`   API Hash: ${API_HASH.substring(0, 8)}...\n`)

async function testConnection() {
  const session = new StringSession('')
  const client = new TelegramClient(session, parseInt(API_ID!), API_HASH!, {
    connectionRetries: 3,
    timeout: 10000,
  })

  try {
    console.log('📡 Testing connection to Telegram servers...')
    await client.connect()
    console.log('✅ Successfully connected to Telegram!\n')

    console.log('📊 Connection details:')
    console.log(`   Session: ${client.session ? 'Active' : 'Inactive'}`)
    console.log(`   Connected: ${client.connected ? 'Yes' : 'No'}`)

    await client.disconnect()

    console.log('\n✨ Your API credentials are working correctly!')
    console.log('   You can proceed with authorization.')

    return true
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message)
    console.error('\n🔧 Troubleshooting:')
    console.error('1. Check your internet connection')
    console.error('2. Verify API credentials at https://my.telegram.org/apps')
    console.error('3. Try creating a new application')
    console.error('4. Check if Telegram API is accessible in your region')

    return false
  }
}

testConnection()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

#!/usr/bin/env tsx

/**
 * Telegram User Authorization Script v2
 *
 * Enhanced version with better error handling and alternative auth methods
 */

import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import * as readline from 'readline'
import dotenv from 'dotenv'

dotenv.config()

const API_ID = process.env.TELEGRAM_API_ID
const API_HASH = process.env.TELEGRAM_API_HASH

if (!API_ID || !API_HASH) {
  console.error('❌ Error: TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in .env')
  console.error('\nTo get these:')
  console.error('1. Go to https://my.telegram.org/apps')
  console.error('2. Create a new application')
  console.error('3. Copy API ID and API Hash to .env')
  process.exit(1)
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function main() {
  console.log('🔐 Telegram User Authorization v2\n')
  console.log('API ID:', API_ID)
  console.log('API Hash:', API_HASH?.substring(0, 8) + '...\n')

  const phoneNumber = await question('Enter your phone number (with country code, e.g., +79123456789): ')

  const session = new StringSession('')
  const client = new TelegramClient(session, parseInt(API_ID!), API_HASH!, {
    connectionRetries: 5,
    useWSS: false,
    timeout: 30000,
  })

  try {
    console.log('\n📱 Connecting to Telegram...')
    console.log('⏳ This may take a minute...\n')

    await client.connect()
    console.log('✅ Connected to Telegram!\n')

    console.log('📲 Sending authorization request...')
    console.log('⚠️  Check ALL your Telegram devices for the code:')
    console.log('   - Telegram mobile app')
    console.log('   - Telegram desktop')
    console.log('   - Telegram Web')
    console.log('   - SMS (as fallback)\n')

    await client.start({
      phoneNumber: async () => phoneNumber,
      password: async () => {
        const pwd = await question('\n🔒 Enter your 2FA password (press Enter to skip): ')
        return pwd
      },
      phoneCode: async () => {
        console.log('\n⏰ Waiting for code... (check your Telegram app!)')
        return await question('📩 Enter the code: ')
      },
      onError: (err) => {
        console.error('\n❌ Error:', err.message)
        if (err.message.includes('PHONE_CODE_INVALID')) {
          console.error('   The code you entered is incorrect. Try again.')
        } else if (err.message.includes('PHONE_CODE_EXPIRED')) {
          console.error('   The code has expired. Restart the script.')
        } else if (err.message.includes('FLOOD_WAIT')) {
          console.error('   Too many attempts. Wait a few minutes and try again.')
        }
      },
    })

    console.log('\n✅ Authentication successful!')

    const sessionString = client.session.save() as any as string

    console.log('\n📝 Your session string:')
    console.log('\n' + '='.repeat(80))
    console.log(sessionString)
    console.log('='.repeat(80) + '\n')

    console.log('Copy this line to your .env file:')
    console.log(`\nTELEGRAM_SESSION_STRING=${sessionString}\n`)

    console.log('⚠️  IMPORTANT: Keep this session string secret!')
    console.log('✨ You only need to do this authorization once.')

    await client.disconnect()
  } catch (error: any) {
    console.error('\n❌ Authorization failed:', error.message)
    console.error('\nTroubleshooting:')
    console.error('1. Check if your phone number is correct')
    console.error('2. Make sure API_ID and API_HASH are correct')
    console.error('3. Check your Telegram app for the code')
    console.error('4. Try creating a new app at https://my.telegram.org/apps')
    console.error('5. Wait a few minutes if you see FLOOD_WAIT error')
    process.exit(1)
  } finally {
    rl.close()
  }
}

main()

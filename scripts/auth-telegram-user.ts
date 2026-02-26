#!/usr/bin/env ts-node

/**
 * Telegram User Authorization Script
 *
 * Interactive script for authenticating with Telegram MTProto API.
 * Generates a session string that should be stored in .env
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
  console.log('🔐 Telegram User Authorization\n')
  console.log('This script will help you authenticate with Telegram MTProto API.')
  console.log('You will receive an SMS code that you need to enter.\n')

  const phoneNumber = await question('Enter your phone number (with country code, e.g., +1234567890): ')

  const session = new StringSession('')
  const client = new TelegramClient(session, parseInt(API_ID!), API_HASH!, {
    connectionRetries: 5,
  })

  try {
    console.log('\n📱 Connecting to Telegram...')
    await client.start({
      phoneNumber: async () => phoneNumber,
      password: async () => {
        return await question('Enter your 2FA password (if enabled): ')
      },
      phoneCode: async () => {
        return await question('\n📩 Enter the code you received via SMS: ')
      },
      onError: (err) => {
        console.error('❌ Error:', err.message)
      },
    })

    console.log('\n✅ Authentication successful!')

    const sessionString = client.session.save() as any as string

    console.log('\n📝 Your session string (save this in .env as TELEGRAM_SESSION_STRING):')
    console.log('\n' + '='.repeat(80))
    console.log(sessionString)
    console.log('='.repeat(80) + '\n')

    console.log('Add this line to your .env file:')
    console.log(`\nTELEGRAM_SESSION_STRING=${sessionString}\n`)

    console.log('⚠️  IMPORTANT: Keep this session string secret! Do not commit it to git.')
    console.log('✨ You only need to do this authorization once.')

    await client.disconnect()
  } catch (error: any) {
    console.error('\n❌ Authorization failed:', error.message)
    process.exit(1)
  } finally {
    rl.close()
  }
}

main()

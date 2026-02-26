#!/usr/bin/env tsx

/**
 * Telegram QR Code Authorization
 *
 * Alternative authorization method using QR code instead of SMS.
 * Scan the QR code with your Telegram app to authorize.
 */

import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import dotenv from 'dotenv'
import * as readline from 'readline'

dotenv.config()

const API_ID = process.env.TELEGRAM_API_ID
const API_HASH = process.env.TELEGRAM_API_HASH

if (!API_ID || !API_HASH) {
  console.error('❌ Error: TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in .env')
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

// Simple QR code display using ASCII
function displayQR(url: string) {
  console.log('\n' + '='.repeat(80))
  console.log('📱 SCAN THIS QR CODE WITH YOUR TELEGRAM APP')
  console.log('='.repeat(80))
  console.log('\nIf the QR code below is not readable, use this link:')
  console.log(url)
  console.log('\nOr scan this in your Telegram app:')
  console.log('   1. Open Telegram on your phone')
  console.log('   2. Go to Settings → Devices → Link Desktop Device')
  console.log('   3. Scan the URL above or paste it in browser')
  console.log('\n' + '='.repeat(80) + '\n')
}

async function main() {
  console.log('🔐 Telegram QR Code Authorization\n')
  console.log('This method is easier and does NOT require SMS codes!\n')

  const session = new StringSession('')
  const client = new TelegramClient(session, parseInt(API_ID!), API_HASH!, {
    connectionRetries: 5,
  })

  try {
    console.log('📱 Connecting to Telegram...')
    await client.connect()
    console.log('✅ Connected!\n')

    await client.signInUserWithQrCode(
      { apiId: parseInt(API_ID!), apiHash: API_HASH! },
      {
        qrCode: async (code) => {
          const url = `tg://login?token=${code.token.toString('base64url')}`
          displayQR(url)
        },
        password: async (hint) => {
          if (hint) {
            console.log(`\n🔒 2FA Password hint: ${hint}`)
          }
          return await question('Enter your 2FA password (press Enter to skip): ')
        },
        onError: (err) => {
          console.error('❌ Error:', err.message)
        },
      }
    )

    console.log('\n✅ Authorization successful!')

    const sessionString = client.session.save() as any as string

    console.log('\n📝 Your session string:')
    console.log('\n' + '='.repeat(80))
    console.log(sessionString)
    console.log('='.repeat(80) + '\n')

    console.log('Add this to your .env file:')
    console.log(`\nTELEGRAM_SESSION_STRING=${sessionString}\n`)

    console.log('⚠️  IMPORTANT: Keep this session string secret!')
    console.log('✨ You only need to do this once.')

    await client.disconnect()
    process.exit(0)
  } catch (error: any) {
    console.error('\n❌ Authorization failed:', error.message)
    console.error('\nTroubleshooting:')
    console.error('1. Make sure you scanned the QR code within 30 seconds')
    console.error('2. Try running the script again')
    console.error('3. Check if API_ID and API_HASH are correct')
    process.exit(1)
  } finally {
    rl.close()
  }
}

console.log('⏳ Starting authorization process...\n')
main()

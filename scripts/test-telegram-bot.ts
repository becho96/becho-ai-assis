#!/usr/bin/env tsx

/**
 * Test Telegram bot connectivity
 * Simple echo bot to verify the Telegram integration works
 */

import { Bot } from 'grammy'
import { config } from 'dotenv'

config()

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const AUTHORIZED_USER_ID = process.env.TELEGRAM_AUTHORIZED_USER_ID

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in environment variables')
  process.exit(1)
}

console.log('🤖 Starting Telegram bot test...')

const bot = new Bot(BOT_TOKEN)

// Middleware to check authorized user
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id.toString()

  if (AUTHORIZED_USER_ID && userId !== AUTHORIZED_USER_ID) {
    console.warn(`⚠️  Unauthorized access attempt from user: ${userId}`)
    await ctx.reply('⛔ Unauthorized. This bot is private.')
    return
  }

  await next()
})

// Start command
bot.command('start', async (ctx) => {
  await ctx.reply(
    '👋 Привет! Я Becho AI Assistant.\n\n' +
      'Этот бот работает в тестовом режиме.\n' +
      'Отправь мне любое сообщение, и я отвечу эхом.\n\n' +
      'Доступные команды:\n' +
      '/start - Начать\n' +
      '/help - Помощь\n' +
      '/ping - Проверка связи'
  )
})

// Help command
bot.command('help', async (ctx) => {
  await ctx.reply(
    '📖 Помощь:\n\n' +
      'Сейчас бот работает в тестовом режиме.\n' +
      'После завершения настройки он сможет:\n\n' +
      '📝 Создавать заметки в Notion\n' +
      '✅ Управлять задачами\n' +
      '📅 Работать с календарём\n' +
      '🔍 Искать информацию\n' +
      '💬 Помогать в переписке'
  )
})

// Ping command
bot.command('ping', async (ctx) => {
  const start = Date.now()
  const msg = await ctx.reply('🏓 Pong!')
  const elapsed = Date.now() - start
  await ctx.api.editMessageText(
    ctx.chat.id,
    msg.message_id,
    `🏓 Pong! (${elapsed}ms)`
  )
})

// Echo all other messages
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text
  console.log(`📩 Received: "${text}" from user ${ctx.from.id}`)

  await ctx.reply(`🔁 Эхо: ${text}`, {
    reply_to_message_id: ctx.message.message_id,
  })
})

// Error handler
bot.catch((err) => {
  console.error('❌ Bot error:', err)
})

// Start the bot
bot.start({
  onStart: (botInfo) => {
    console.log('✅ Bot started successfully!')
    console.log(`   Username: @${botInfo.username}`)
    console.log(`   ID: ${botInfo.id}`)
    if (AUTHORIZED_USER_ID) {
      console.log(`   Authorized user: ${AUTHORIZED_USER_ID}`)
    } else {
      console.warn('⚠️  No TELEGRAM_AUTHORIZED_USER_ID set - bot is public!')
    }
    console.log('\n📱 Send a message to the bot to test connectivity...')
    console.log('   Press Ctrl+C to stop\n')
  },
})

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('\n\n👋 Stopping bot...')
  bot.stop()
  process.exit(0)
})

process.once('SIGTERM', () => {
  console.log('\n\n👋 Stopping bot...')
  bot.stop()
  process.exit(0)
})

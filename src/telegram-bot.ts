import { Bot } from 'grammy';
import dotenv from 'dotenv';
import { setupProxy } from './lib/proxy.js';

dotenv.config();
setupProxy();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const AUTHORIZED_USER_ID = parseInt(process.env.TELEGRAM_AUTHORIZED_USER_ID!);
const HTTP_SERVER_URL = process.env.HTTP_SERVER_URL || 'http://localhost:3000';

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set in .env');
  process.exit(1);
}

if (!AUTHORIZED_USER_ID) {
  console.error('❌ TELEGRAM_AUTHORIZED_USER_ID not set in .env');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

console.log('🤖 Starting Telegram bot...');
console.log(`   Authorized user: ${AUTHORIZED_USER_ID}`);
console.log(`   HTTP server: ${HTTP_SERVER_URL}`);

// Handle all text messages
bot.on('message:text', async (ctx) => {
  const userId = ctx.from?.id;
  const chatId = ctx.chat.id;
  const messageText = ctx.message.text;

  console.log(`📨 Message from user ${userId}: ${messageText.substring(0, 50)}...`);

  // Check authorization
  if (userId !== AUTHORIZED_USER_ID) {
    console.log(`⛔ Unauthorized access attempt from user ${userId}`);
    await ctx.reply('⛔ Доступ запрещён. Этот бот доступен только авторизованным пользователям.');
    return;
  }

  try {
    // Show typing indicator
    await ctx.replyWithChatAction('typing');

    // Call orchestrator via HTTP
    console.log(`🔄 Calling orchestrator...`);
    const response = await fetch(`${HTTP_SERVER_URL}/api/orchestrator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telegram_chat_id: chatId.toString(),
        user_message: messageText,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: any = await response.json();
    const replyText = data.response || 'Извините, не удалось обработать ваше сообщение.';

    // Send response
    console.log(`✅ Sending response (${replyText.length} chars)`);
    await ctx.reply(replyText, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('❌ Error processing message:', error);
    await ctx.reply(
      '⚠️ Произошла ошибка при обработке сообщения. Попробуйте ещё раз через несколько секунд.',
    );
  }
});

// Handle /start command
bot.command('start', async (ctx) => {
  const userId = ctx.from?.id;

  if (userId !== AUTHORIZED_USER_ID) {
    await ctx.reply('⛔ Доступ запрещён. Этот бот доступен только авторизованным пользователям.');
    return;
  }

  await ctx.reply('👋 Привет! Отправьте мне любое сообщение, и я обработаю его через AI ассистента.');
});

// Error handling
bot.catch((err) => {
  console.error('❌ Bot error:', err);
});

// Start bot
bot.start({
  onStart: (botInfo) => {
    console.log('✅ Bot started successfully!');
    console.log(`   Username: @${botInfo.username}`);
    console.log(`   ID: ${botInfo.id}`);
    console.log('');
    console.log('📱 Ready to receive messages...');
    console.log('   Press Ctrl+C to stop');
  },
});

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('\n👋 Stopping bot...');
  bot.stop();
});

process.once('SIGTERM', () => {
  console.log('\n👋 Stopping bot...');
  bot.stop();
});

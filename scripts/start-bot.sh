#!/bin/bash

# Start Telegram bot
# This bot receives messages and calls the HTTP orchestrator

echo "🤖 Starting Telegram Bot..."

# Kill any existing bot processes
pkill -f "telegram-bot.ts" 2>/dev/null || true

# Start bot in background with nohup
cd "$(dirname "$0")/.."
nohup npm run start:bot > /tmp/becho-telegram-bot.log 2>&1 &

# Wait for bot to start
sleep 2

# Check if bot is running
if pgrep -f "telegram-bot.ts" > /dev/null 2>&1; then
    echo "✅ Telegram Bot started successfully!"
    echo "   Logs: /tmp/becho-telegram-bot.log"
    echo "   PID: $(pgrep -f telegram-bot.ts)"
    echo ""
    echo "📱 Test: Send /start to @becho_ai_assistant_bot"
else
    echo "❌ Failed to start Telegram bot"
    echo "Check logs: /tmp/becho-telegram-bot.log"
    exit 1
fi

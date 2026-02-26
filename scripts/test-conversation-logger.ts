#!/usr/bin/env tsx
/**
 * Test Conversation Logger
 *
 * Simple test to verify conversation logging functionality
 */

import { conversationLogger } from '../src/lib/conversation-logger.js';

console.log('🧪 Testing Conversation Logger...\n');

// Test 1: Log user message
console.log('1️⃣ Logging user message...');
conversationLogger.logUserMessage('test-chat-123', 'Привет! Как дела?');
console.log('✅ User message logged\n');

// Test 2: Log assistant response
console.log('2️⃣ Logging assistant response...');
conversationLogger.logAssistantResponse(
  'test-chat-123',
  'Привет! Я AI ассистент. Чем могу помочь?'
);
console.log('✅ Assistant response logged\n');

// Test 3: Log full conversation
console.log('3️⃣ Logging full conversation...');
conversationLogger.logConversation(
  'test-chat-456',
  'Создай задачу: Купить молоко',
  '✅ Задача создана в Notion: [Купить молоко](https://notion.so/...)'
);
console.log('✅ Full conversation logged\n');

console.log('🎉 All tests completed!');
console.log('\n📁 Check logs directory: logs/conversations/');
console.log(`📄 Today's log file: ${new Date().toISOString().split('T')[0]}.log`);

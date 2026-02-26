#!/usr/bin/env tsx
/**
 * Analyze Conversation Logs
 *
 * Reads conversation logs and provides statistics and insights
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

interface LogEntry {
  timestamp: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ConversationStats {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  uniqueChats: Set<string>;
  dateRange: { start: string; end: string };
  averageUserMessageLength: number;
  averageAssistantMessageLength: number;
}

function analyzeLogFile(filePath: string): LogEntry[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.length > 0);

  return lines.map(line => {
    try {
      return JSON.parse(line) as LogEntry;
    } catch (error) {
      console.error(`Failed to parse line: ${line}`);
      return null;
    }
  }).filter(entry => entry !== null) as LogEntry[];
}

function calculateStats(entries: LogEntry[]): ConversationStats {
  const stats: ConversationStats = {
    totalMessages: entries.length,
    userMessages: 0,
    assistantMessages: 0,
    uniqueChats: new Set(),
    dateRange: { start: '', end: '' },
    averageUserMessageLength: 0,
    averageAssistantMessageLength: 0,
  };

  let userMessageLengthSum = 0;
  let assistantMessageLengthSum = 0;

  entries.forEach(entry => {
    stats.uniqueChats.add(entry.chatId);

    if (entry.role === 'user') {
      stats.userMessages++;
      userMessageLengthSum += entry.content.length;
    } else {
      stats.assistantMessages++;
      assistantMessageLengthSum += entry.content.length;
    }
  });

  if (stats.userMessages > 0) {
    stats.averageUserMessageLength = Math.round(userMessageLengthSum / stats.userMessages);
  }

  if (stats.assistantMessages > 0) {
    stats.averageAssistantMessageLength = Math.round(
      assistantMessageLengthSum / stats.assistantMessages
    );
  }

  if (entries.length > 0) {
    stats.dateRange.start = entries[0].timestamp;
    stats.dateRange.end = entries[entries.length - 1].timestamp;
  }

  return stats;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function main() {
  const logsDir = join(process.cwd(), 'logs', 'conversations');

  console.log('📊 Analyzing Conversation Logs\n');
  console.log(`📁 Logs directory: ${logsDir}\n`);

  try {
    const files = readdirSync(logsDir).filter(file => file.endsWith('.log'));

    if (files.length === 0) {
      console.log('❌ No log files found');
      return;
    }

    console.log(`📄 Found ${files.length} log file(s):\n`);

    let allEntries: LogEntry[] = [];

    files.forEach(file => {
      const filePath = join(logsDir, file);
      const entries = analyzeLogFile(filePath);
      allEntries = allEntries.concat(entries);

      console.log(`   ${file}: ${entries.length} messages`);
    });

    console.log('\n' + '='.repeat(60) + '\n');

    const stats = calculateStats(allEntries);

    console.log('📈 Overall Statistics:\n');
    console.log(`   Total messages: ${stats.totalMessages}`);
    console.log(`   User messages: ${stats.userMessages}`);
    console.log(`   Assistant messages: ${stats.assistantMessages}`);
    console.log(`   Unique chats: ${stats.uniqueChats.size}`);
    console.log(`\n   Date range:`);
    console.log(`      Start: ${formatDate(stats.dateRange.start)}`);
    console.log(`      End:   ${formatDate(stats.dateRange.end)}`);
    console.log(`\n   Average message length:`);
    console.log(`      User: ${stats.averageUserMessageLength} characters`);
    console.log(`      Assistant: ${stats.averageAssistantMessageLength} characters`);

    console.log('\n' + '='.repeat(60) + '\n');

    // Show sample conversations
    console.log('💬 Sample Conversations:\n');

    const conversationsByChat = new Map<string, LogEntry[]>();
    allEntries.forEach(entry => {
      if (!conversationsByChat.has(entry.chatId)) {
        conversationsByChat.set(entry.chatId, []);
      }
      conversationsByChat.get(entry.chatId)!.push(entry);
    });

    let sampleCount = 0;
    for (const [chatId, entries] of conversationsByChat.entries()) {
      if (sampleCount >= 3) break;

      console.log(`   Chat: ${chatId}`);
      entries.slice(0, 4).forEach(entry => {
        const preview =
          entry.content.length > 60 ? entry.content.substring(0, 60) + '...' : entry.content;
        const roleEmoji = entry.role === 'user' ? '👤' : '🤖';
        console.log(`      ${roleEmoji} ${entry.role}: ${preview}`);
      });
      console.log('');
      sampleCount++;
    }

    console.log('✅ Analysis complete!\n');
  } catch (error) {
    console.error('❌ Error analyzing logs:', error);
  }
}

main();

#!/usr/bin/env tsx
/**
 * View Recent Conversations
 *
 * Shows the most recent N messages from conversation logs
 * with nice formatting
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

interface LogEntry {
  timestamp: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('ru-RU', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatMessage(entry: LogEntry): string {
  const roleEmoji = entry.role === 'user' ? '👤' : '🤖';
  const roleName = entry.role === 'user' ? 'USER' : 'ASST';
  const timestamp = formatTimestamp(entry.timestamp);

  // Truncate long messages
  const maxLength = 200;
  let content = entry.content;
  if (content.length > maxLength) {
    content = content.substring(0, maxLength) + '...';
  }

  return `${roleEmoji} [${timestamp}] [${entry.chatId}] ${roleName}:\n   ${content}\n`;
}

function main() {
  const logsDir = join(process.cwd(), 'logs', 'conversations');
  const limit = parseInt(process.argv[2]) || 20; // Default: show last 20 messages

  console.log(`📜 Recent Conversations (last ${limit} messages)\n`);
  console.log('─'.repeat(80) + '\n');

  try {
    // Get all log files, sorted by date (newest first)
    const files = readdirSync(logsDir)
      .filter(file => file.endsWith('.log'))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.log('❌ No log files found');
      return;
    }

    // Collect all entries from all files
    const allEntries: LogEntry[] = [];

    for (const file of files) {
      const filePath = join(logsDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);

      const entries = lines
        .map(line => {
          try {
            return JSON.parse(line) as LogEntry;
          } catch (error) {
            return null;
          }
        })
        .filter(entry => entry !== null) as LogEntry[];

      allEntries.push(...entries);
    }

    // Sort by timestamp (newest first) and take last N
    allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const recentMessages = allEntries.slice(0, limit).reverse(); // Reverse to show oldest first

    if (recentMessages.length === 0) {
      console.log('❌ No messages found in logs');
      return;
    }

    // Display messages
    recentMessages.forEach(entry => {
      console.log(formatMessage(entry));
    });

    console.log('─'.repeat(80));
    console.log(`\n✅ Showing ${recentMessages.length} of ${allEntries.length} total messages`);
  } catch (error) {
    console.error('❌ Error reading logs:', error);
  }
}

main();

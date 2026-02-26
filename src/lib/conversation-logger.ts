/**
 * Conversation Logger
 *
 * Logs all user messages and assistant responses to separate log files
 * for later analysis. Each day gets its own log file.
 */

import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';

interface LogEntry {
  timestamp: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
}

export class ConversationLogger {
  private logsDir: string;

  constructor(logsDir?: string) {
    this.logsDir = logsDir || join(process.cwd(), 'logs', 'conversations');
    this.ensureLogsDirectoryExists();
  }

  /**
   * Ensure logs directory exists
   */
  private ensureLogsDirectoryExists(): void {
    if (!existsSync(this.logsDir)) {
      mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Get log file path for today
   */
  private getLogFilePath(): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return join(this.logsDir, `${today}.log`);
  }

  /**
   * Format log entry as JSON line
   */
  private formatLogEntry(entry: LogEntry): string {
    return JSON.stringify(entry) + '\n';
  }

  /**
   * Append log entry to file
   */
  private appendLog(entry: LogEntry): void {
    const logFilePath = this.getLogFilePath();
    const formattedEntry = this.formatLogEntry(entry);

    try {
      appendFileSync(logFilePath, formattedEntry, 'utf-8');
    } catch (error) {
      console.error('Failed to write to conversation log:', error);
    }
  }

  /**
   * Log user message
   */
  logUserMessage(chatId: string, message: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      chatId,
      role: 'user',
      content: message,
    };

    this.appendLog(entry);
  }

  /**
   * Log assistant response
   */
  logAssistantResponse(chatId: string, response: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      chatId,
      role: 'assistant',
      content: response,
    };

    this.appendLog(entry);
  }

  /**
   * Log both user message and assistant response together
   */
  logConversation(chatId: string, userMessage: string, assistantResponse: string): void {
    this.logUserMessage(chatId, userMessage);
    this.logAssistantResponse(chatId, assistantResponse);
  }
}

// Export singleton instance
export const conversationLogger = new ConversationLogger();

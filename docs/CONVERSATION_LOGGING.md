# Conversation Logging

## Overview

The conversation logging system records all user messages and assistant responses to separate log files for later analysis. This allows you to:
- Track conversation history
- Analyze conversation patterns
- Debug issues
- Generate insights and statistics

## Architecture

### Components

1. **ConversationLogger** ([src/lib/conversation-logger.ts](../src/lib/conversation-logger.ts))
   - Core logging module
   - Handles file I/O and formatting
   - Automatically creates log directories
   - Uses JSONL (JSON Lines) format

2. **Integration Point** ([scripts/invoke-orchestrator-v2.ts](../scripts/invoke-orchestrator-v2.ts))
   - Logs user messages before processing
   - Logs assistant responses after generation
   - Maintains conversation flow

### Log Format

Logs are stored in JSONL format (one JSON object per line):

```json
{"timestamp":"2026-02-17T20:54:33.420Z","chatId":"123456789","role":"user","content":"Привет!"}
{"timestamp":"2026-02-17T20:54:33.421Z","chatId":"123456789","role":"assistant","content":"Привет! Чем могу помочь?"}
```

### File Structure

```
logs/
└── conversations/
    ├── 2026-02-17.log
    ├── 2026-02-18.log
    └── 2026-02-19.log
```

- Each day gets its own log file
- File naming: `YYYY-MM-DD.log`
- Files are automatically created when needed
- Logs are excluded from git (via `.gitignore`)

## Usage

### Logging Messages

```typescript
import { conversationLogger } from '../src/lib/conversation-logger.js';

// Log user message
conversationLogger.logUserMessage('chat-123', 'Hello!');

// Log assistant response
conversationLogger.logAssistantResponse('chat-123', 'Hi! How can I help?');

// Log both at once
conversationLogger.logConversation(
  'chat-123',
  'User message',
  'Assistant response'
);
```

### Testing

```bash
# Test logging functionality
npm run test:logger
```

### Analysis

```bash
# Analyze conversation logs (statistics and insights)
npm run analyze:logs

# View recent conversations (last N messages)
npm run view:logs [N]  # Default: 20 messages
```

The analysis script provides:
- Total message counts (user/assistant)
- Unique chat count
- Date range coverage
- Average message lengths
- Sample conversations

The view script shows:
- Most recent N messages from all logs
- Formatted with timestamps and chat IDs
- Truncated long messages for readability

## Example Output

```
📊 Analyzing Conversation Logs

📁 Logs directory: /path/to/logs/conversations

📄 Found 3 log file(s):

   2026-02-17.log: 24 messages
   2026-02-18.log: 18 messages
   2026-02-19.log: 32 messages

============================================================

📈 Overall Statistics:

   Total messages: 74
   User messages: 37
   Assistant messages: 37
   Unique chats: 5

   Date range:
      Start: 17 февраля 2026 г. в 10:23
      End:   19 февраля 2026 г. в 18:45

   Average message length:
      User: 45 characters
      Assistant: 178 characters

============================================================

💬 Sample Conversations:

   Chat: 123456789
      👤 user: Создай задачу: Купить молоко
      🤖 assistant: ✅ Задача создана в Notion...

✅ Analysis complete!
```

## Privacy & Security

### What Gets Logged

- All user messages sent to the assistant
- All assistant responses
- Chat IDs (Telegram chat IDs)
- Timestamps

### What Doesn't Get Logged

- API keys or credentials
- Internal tool calls or MCP operations
- Database queries
- System prompts

### Data Protection

1. **Local Storage**: Logs are stored locally in `logs/conversations/`
2. **Git Exclusion**: `.gitignore` excludes all `*.log` files
3. **No Remote Sync**: Logs are not uploaded anywhere by default
4. **Chat ID Only**: User IDs are stored as chat IDs, not personal information

### Recommendations

- Regularly backup log files if analysis is important
- Consider rotating/archiving old logs (>30 days)
- Review logs for sensitive information before sharing
- Add additional encryption if logs contain sensitive data

## Scripts Reference

### test-conversation-logger.ts

Simple test script that:
- Logs sample user messages
- Logs sample assistant responses
- Verifies directory creation
- Confirms file writing

**Usage:**
```bash
npm run test:logger
```

### analyze-conversation-logs.ts

Analysis script that:
- Reads all log files in `logs/conversations/`
- Calculates statistics (message counts, averages, etc.)
- Shows sample conversations
- Displays date range and chat counts

**Usage:**
```bash
npm run analyze:logs
```

### view-recent-conversations.ts

View recent messages script that:
- Shows the most recent N messages from all logs
- Displays messages in chronological order
- Formats with emoji, timestamps, and chat IDs
- Truncates long messages for readability

**Usage:**
```bash
# View last 20 messages (default)
npm run view:logs

# View last 50 messages
npm run view:logs 50
```

## Integration Points

### Orchestrator Integration

The logger is integrated into the orchestrator at two key points:

1. **User Message Receipt** (line ~177)
   ```typescript
   conversationLogger.logUserMessage(TELEGRAM_CHAT_ID, USER_MESSAGE);
   ```

2. **Assistant Response Generation** (line ~431)
   ```typescript
   conversationLogger.logAssistantResponse(TELEGRAM_CHAT_ID, finalResponse);
   ```

### Future Integration Points

Consider adding logging to:
- Daily digest generation
- MCP tool calls (for debugging)
- Error conditions
- Web search queries

## Troubleshooting

### Issue: Logs not being created

**Solution:**
- Check write permissions on project directory
- Verify `logs/conversations/` directory exists
- Check console for error messages

### Issue: JSONL parsing errors

**Solution:**
- Each line must be valid JSON
- No trailing commas or syntax errors
- Use `analyze:logs` script to validate format

### Issue: Large log files

**Solution:**
- Implement log rotation (archive old files)
- Add cleanup script to remove logs >30 days
- Consider compressing old logs (gzip)

## Future Enhancements

Potential improvements:
- [ ] Automatic log rotation by size
- [ ] Compression of old logs
- [ ] Elasticsearch/Logstash integration
- [ ] Real-time log streaming dashboard
- [ ] Sentiment analysis on conversations
- [ ] Export to CSV/Excel for analysis
- [ ] Search functionality (by date, chat ID, content)
- [ ] Privacy-preserving anonymization

## Related Files

- [src/lib/conversation-logger.ts](../src/lib/conversation-logger.ts) - Logger implementation
- [scripts/invoke-orchestrator-v2.ts](../scripts/invoke-orchestrator-v2.ts) - Integration point
- [scripts/test-conversation-logger.ts](../scripts/test-conversation-logger.ts) - Test script
- [scripts/analyze-conversation-logs.ts](../scripts/analyze-conversation-logs.ts) - Analysis tool
- [.gitignore](../.gitignore) - Log file exclusion

## Questions?

If you have questions or need help with conversation logging:
1. Check this documentation
2. Review the source code
3. Run the test script to verify setup
4. Check the analysis output for insights

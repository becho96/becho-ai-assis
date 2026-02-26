# 🔄 Детальный поток обработки сообщения

## Цепочка: Пользователь → Telegram Bot → HTTP Server → Orchestrator

---

## 1️⃣ Пользователь отправляет сообщение

```
Пользователь в Telegram: "Запиши: встреча с инвестором прошла отлично"
```

---

## 2️⃣ Telegram Bot получает сообщение

**Файл:** `src/telegram-bot.ts`

```typescript
// grammY получает сообщение через Long Polling
bot.on('message:text', async (ctx) => {
  const userId = ctx.from?.id;           // 290722791
  const chatId = ctx.chat.id;            // 290722791
  const messageText = ctx.message.text;  // "Запиши: встреча..."

  // Проверка авторизации
  if (userId !== AUTHORIZED_USER_ID) {
    await ctx.reply('⛔ Доступ запрещён');
    return;
  }

  // Показать "typing..."
  await ctx.replyWithChatAction('typing');

  // 👇 HTTP запрос к серверу
  const response = await fetch('http://localhost:3000/api/orchestrator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      telegram_chat_id: chatId.toString(),    // "290722791"
      user_message: messageText               // "Запиши: встреча..."
    })
  });

  const data = await response.json();
  // data = { response: "✅ Заметка сохранена!...", timestamp: "..." }

  // Отправить ответ обратно
  await ctx.reply(data.response, { parse_mode: 'Markdown' });
});
```

**HTTP запрос:**
```http
POST http://localhost:3000/api/orchestrator
Content-Type: application/json

{
  "telegram_chat_id": "290722791",
  "user_message": "Запиши: встреча с инвестором прошла отлично"
}
```

---

## 3️⃣ HTTP Server получает запрос

**Файл:** `src/http-server.ts`

```typescript
app.post('/api/orchestrator', async (req, res) => {
  try {
    const { telegram_chat_id, user_message } = req.body;

    // Валидация
    if (!telegram_chat_id || !user_message) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    console.log(`Processing message from chat ${telegram_chat_id}`);

    // Путь к скрипту orchestrator
    const scriptPath = path.join(projectRoot, 'scripts', 'invoke-orchestrator-v2.ts');

    // 👇 Вызов TypeScript скрипта через npx tsx
    const { stdout, stderr } = await execFileAsync(
      'npx',
      ['tsx', scriptPath, telegram_chat_id, user_message],
      {
        cwd: projectRoot,
        timeout: 60000,  // 60 секунд
        maxBuffer: 10 * 1024 * 1024  // 10MB
      }
    );

    // Парсинг JSON ответа от скрипта
    const response = JSON.parse(stdout);
    // response = { response: "✅ Заметка сохранена!...", timestamp: "..." }

    // 👇 Возврат JSON клиенту
    res.json(response);

  } catch (error) {
    console.error('Orchestrator error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      response: 'Извините, произошла ошибка.'
    });
  }
});
```

**Что происходит:**
1. Express получает HTTP POST запрос
2. Валидирует параметры (`telegram_chat_id`, `user_message`)
3. Вызывает TypeScript скрипт через `execFileAsync`:
   ```bash
   npx tsx scripts/invoke-orchestrator-v2.ts "290722791" "Запиши: встреча..."
   ```
4. Ждет выполнения скрипта (до 60 секунд)
5. Парсит JSON из stdout
6. Возвращает JSON ответ клиенту

---

## 4️⃣ Orchestrator обрабатывает запрос

**Файл:** `scripts/invoke-orchestrator-v2.ts`

```typescript
// Получение параметров из командной строки
const telegramChatId = process.argv[2];  // "290722791"
const userMessage = process.argv[3];     // "Запиши: встреча..."

// Загрузить историю разговора из SQLite
const conversationHistory = await dbGetContext({
  telegram_chat_id: telegramChatId,
  limit: 10
});

// Добавить новое сообщение в историю
conversationHistory.push({
  role: 'user',
  content: userMessage
});

// Подготовить MCP tools для Claude
const mcpTools = [
  {
    name: 'notionCreatePage',
    description: 'Создать новую страницу в Notion',
    input_schema: {
      type: 'object',
      properties: {
        database: { type: 'string' },
        title: { type: 'string' },
        properties: { type: 'object' },
        content: { type: 'string' }
      }
    }
  },
  // ... другие tools
];

// 👇 Agentic Loop
const maxIterations = 10;
for (let iteration = 0; iteration < maxIterations; iteration++) {

  // Вызов Claude API
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: conversationHistory,
    tools: mcpTools,
    system: 'Ты персональный AI-ассистент...'
  });

  // Если Claude вызывает tool
  if (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(
      block => block.type === 'tool_use'
    );

    // Выполнить каждый tool
    const toolResults = [];
    for (const toolUse of toolUseBlocks) {

      if (toolUse.name === 'notionCreatePage') {
        // Вызвать MCP Client
        const result = await notionCreatePage({
          database: toolUse.input.database,
          title: toolUse.input.title,
          properties: toolUse.input.properties,
          content: toolUse.input.content
        });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result)
        });
      }
      // ... другие tools
    }

    // Добавить результаты в историю
    conversationHistory.push({
      role: 'assistant',
      content: response.content
    });
    conversationHistory.push({
      role: 'user',
      content: toolResults
    });

    // Продолжить loop
    continue;
  }

  // Если Claude закончил (text response)
  if (response.stop_reason === 'end_turn') {
    const textBlock = response.content.find(
      block => block.type === 'text'
    );

    const finalResponse = textBlock.text;
    // finalResponse = "✅ Заметка сохранена! [Открыть в Notion](link)"

    // Сохранить разговор в SQLite
    await dbSaveConversation({
      telegram_chat_id: telegramChatId,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    });
    await dbSaveConversation({
      telegram_chat_id: telegramChatId,
      role: 'assistant',
      content: finalResponse,
      timestamp: new Date().toISOString()
    });

    // 👇 Вывести JSON в stdout
    console.log(JSON.stringify({
      response: finalResponse,
      timestamp: new Date().toISOString()
    }));

    process.exit(0);
  }
}
```

**Что происходит:**
1. Получает параметры из `process.argv`
2. Загружает историю разговора из SQLite
3. Запускает agentic loop с Claude API
4. Claude анализирует сообщение "Запиши: встреча..."
5. Claude решает вызвать `notionCreatePage` tool
6. Orchestrator выполняет tool через MCP Client
7. Claude получает результат и генерирует финальный ответ
8. Orchestrator сохраняет разговор в SQLite
9. **Выводит JSON в stdout** (это важно!)

**Вывод в stdout:**
```json
{
  "response": "✅ Заметка сохранена!\n\n**Встреча с инвестором** добавлена в базу знаний. Отлично, что встреча прошла хорошо! 🎉\n\n[Посмотреть в Notion](https://notion.so/...)",
  "timestamp": "2026-02-16T20:00:00.000Z"
}
```

---

## 5️⃣ HTTP Server возвращает ответ

```typescript
// HTTP Server парсит JSON из stdout
const response = JSON.parse(stdout);

// Возвращает JSON клиенту
res.json(response);
```

**HTTP Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "response": "✅ Заметка сохранена!\n\n**Встреча с инвестором**...",
  "timestamp": "2026-02-16T20:00:00.000Z"
}
```

---

## 6️⃣ Telegram Bot отправляет ответ

```typescript
// Telegram Bot получает JSON
const data = await response.json();

// Отправляет ответ пользователю
await ctx.reply(data.response, { parse_mode: 'Markdown' });
```

---

## 7️⃣ Пользователь получает ответ

```
Бот в Telegram:
✅ Заметка сохранена!

**Встреча с инвестором** добавлена в базу знаний.
Отлично, что встреча прошла хорошо! 🎉

[Посмотреть в Notion](https://notion.so/...)
```

---

## 📊 Визуализация потока данных

```
┌─────────────────┐
│   Пользователь  │ "Запиши: встреча..."
└────────┬────────┘
         │
         ▼ (Telegram API)
┌─────────────────────────────────────┐
│       Telegram Bot (grammY)         │
│     src/telegram-bot.ts             │
├─────────────────────────────────────┤
│ 1. Получить сообщение (polling)     │
│ 2. Проверить авторизацию            │
│ 3. POST /api/orchestrator           │
│    {                                │
│      telegram_chat_id: "...",       │
│      user_message: "..."            │
│    }                                │
└────────┬────────────────────────────┘
         │
         ▼ (HTTP POST)
┌─────────────────────────────────────┐
│     HTTP Server (Express)           │
│     src/http-server.ts              │
├─────────────────────────────────────┤
│ 1. Получить POST запрос             │
│ 2. Валидировать параметры           │
│ 3. execFileAsync(                   │
│      'npx tsx',                     │
│      ['invoke-orchestrator-v2.ts',  │
│       chat_id, message]             │
│    )                                │
│ 4. Парсить JSON из stdout           │
│ 5. Вернуть JSON клиенту             │
└────────┬────────────────────────────┘
         │
         ▼ (Child Process)
┌─────────────────────────────────────┐
│         Orchestrator                │
│  invoke-orchestrator-v2.ts          │
├─────────────────────────────────────┤
│ 1. Получить параметры (argv)        │
│ 2. Загрузить историю (SQLite)       │
│ 3. Agentic Loop:                    │
│    ┌─────────────────────────┐     │
│    │ Claude API Request      │     │
│    │ + MCP Tools available   │     │
│    └──────────┬──────────────┘     │
│               ▼                     │
│    ┌─────────────────────────┐     │
│    │ Claude decides tools    │     │
│    └──────────┬──────────────┘     │
│               ▼                     │
│    ┌─────────────────────────┐     │
│    │ Execute MCP Tools       │     │
│    │ (notionCreatePage)      │     │
│    └──────────┬──────────────┘     │
│               ▼                     │
│    ┌─────────────────────────┐     │
│    │ Claude final response   │     │
│    └─────────────────────────┘     │
│                                     │
│ 4. Сохранить в SQLite               │
│ 5. console.log(JSON.stringify({    │
│      response: "...",               │
│      timestamp: "..."               │
│    }))                              │
└────────┬────────────────────────────┘
         │
         ▼ (stdout → HTTP Server)
┌─────────────────────────────────────┐
│     HTTP Server (Express)           │
├─────────────────────────────────────┤
│ JSON.parse(stdout)                  │
│ res.json(response)                  │
└────────┬────────────────────────────┘
         │
         ▼ (HTTP Response)
┌─────────────────────────────────────┐
│       Telegram Bot (grammY)         │
├─────────────────────────────────────┤
│ ctx.reply(data.response)            │
└────────┬────────────────────────────┘
         │
         ▼ (Telegram API)
┌─────────────────┐
│   Пользователь  │ ← "✅ Заметка сохранена!..."
└─────────────────┘
```

---

## ❓ Роль HTTP Server vs n8n

### Вопрос: HTTP Server заменил n8n?

**Да, частично!** Но не полностью.

### Что раньше делал n8n:

```
n8n Telegram Router workflow:
┌─────────────────────────────────────┐
│ 1. Telegram Trigger (webhook)       │
│    ↓                                │
│ 2. Check Authorized User (IF)       │
│    ↓                                │
│ 3. Extract Message Data (Function)  │
│    ↓                                │
│ 4. Execute Command                  │ ❌ НЕ РАБОТАЕТ
│    npx tsx invoke-orchestrator.ts   │
│    ↓                                │
│ 5. Send Telegram Response           │
└─────────────────────────────────────┘
```

### Что делает сейчас:

```
Telegram Bot + HTTP Server:
┌─────────────────────────────────────┐
│ Telegram Bot (grammY)               │
│ • Получает сообщения (polling)      │
│ • Проверяет авторизацию             │
│ • POST /api/orchestrator            │
│ • Отправляет ответ                  │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ HTTP Server (Express)               │
│ • Принимает HTTP запросы            │
│ • Вызывает orchestrator (exec)      │ ✅ РАБОТАЕТ
│ • Возвращает JSON                   │
└─────────────────────────────────────┘
```

### Что всё ещё может делать n8n:

```
Автоматические workflow (по расписанию):
┌─────────────────────────────────────┐
│ Morning Digest (08:00)              │
│ • Schedule Trigger                  │
│ • HTTP Request → /api/daily-digest  │
│ • Send Telegram                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Reminder Checker (every 5 min)      │
│ • Schedule Trigger                  │
│ • Check SQLite                      │
│ • Send Telegram                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Notion Sync (every 30 min)          │
│ • Schedule Trigger                  │
│ • Sync script                       │
└─────────────────────────────────────┘
```

### Итого:

| Функция | Раньше (n8n) | Сейчас | Статус |
|---------|--------------|--------|--------|
| **Telegram → Orchestrator** | n8n Telegram Router | Telegram Bot + HTTP Server | ✅ Работает |
| **Утренний дайджест** | n8n workflow | n8n workflow (опционально) | ⚠️ Опционально |
| **Вечерний дайджест** | n8n workflow | n8n workflow (опционально) | ⚠️ Опционально |
| **Проверка напоминаний** | n8n workflow | n8n workflow (опционально) | ⚠️ Опционально |
| **Синхронизация Notion** | n8n workflow | n8n workflow (опционально) | ⚠️ Опционально |

---

## 💡 Преимущества текущей архитектуры

### 1. **Независимость от n8n для основной функции**
- Telegram Bot работает сам по себе
- Если n8n упал → бот продолжает отвечать
- Не нужно настраивать webhook/polling в n8n

### 2. **HTTP Server = универсальный API**
- Можно вызывать orchestrator откуда угодно:
  - Telegram Bot (текущее использование)
  - n8n workflows (для digest)
  - Curl (для тестирования)
  - Другие сервисы

### 3. **Проще отлаживать**
- Отдельные логи для бота: `/tmp/becho-telegram-bot.log`
- Отдельные логи для сервера: `/tmp/becho-http-server.log`
- Можно тестировать компоненты независимо

### 4. **Легче масштабировать**
- HTTP Server можно горизонтально масштабировать
- Можно добавить Redis для кеширования
- Можно добавить очереди (RabbitMQ)

---

## 🎯 Резюме

### Поток данных:

1. **Telegram Bot** получает сообщение (grammY polling)
2. **HTTP POST** к `http://localhost:3000/api/orchestrator`
3. **HTTP Server** вызывает `invoke-orchestrator-v2.ts` через `execFileAsync`
4. **Orchestrator** обрабатывает через Claude API + MCP Tools
5. **Orchestrator** выводит JSON в stdout
6. **HTTP Server** парсит stdout и возвращает JSON
7. **Telegram Bot** получает JSON и отправляет ответ пользователю

### Роль HTTP Server:

✅ **Заменил** n8n для Telegram интеграции
✅ **Предоставляет** API для вызова orchestrator
✅ **Может использоваться** n8n для других workflow

### n8n сейчас:

⚠️ **Опционален** для основной функции (Telegram)
✅ **Полезен** для автоматических задач (digest, reminders, sync)
✅ **Может работать** параллельно с Telegram Bot

---

**Готово!** Теперь понятна вся цепочка обработки сообщений. 🚀

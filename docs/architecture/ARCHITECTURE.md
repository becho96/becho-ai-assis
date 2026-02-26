# 🏗️ Архитектура Becho AI Assistant

## 📊 Общая схема

```
┌─────────────────────────────────────────────────────────────────┐
│                         ПОЛЬЗОВАТЕЛЬ                             │
│                     (Telegram Client)                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TELEGRAM BOT (grammY)                         │
│              src/telegram-bot.ts (Polling)                       │
│  • Получает сообщения через Long Polling                        │
│  • Проверяет авторизацию пользователя                           │
│  • Отправляет HTTP запросы к orchestrator                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼ HTTP POST
┌─────────────────────────────────────────────────────────────────┐
│                   HTTP API SERVER (Express)                      │
│                  src/http-server.ts (Port 3000)                  │
│  • POST /api/orchestrator → invoke-orchestrator-v2.ts            │
│  • POST /api/daily-digest → invoke-daily-digest.ts              │
│  • GET  /health → Health check                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              ORCHESTRATOR (Claude Code Logic)                    │
│            scripts/invoke-orchestrator-v2.ts                     │
│  • Создает agentic loop с Claude API                            │
│  • Предоставляет MCP tools как Claude tools                     │
│  • Обрабатывает multi-turn conversations                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CLAUDE SONNET 4 API                             │
│              (Anthropic API via SDK)                             │
│  • Понимает намерения пользователя                              │
│  • Вызывает нужные MCP tools                                    │
│  • Генерирует умные ответы на русском языке                     │
└──────┬──────────────────────────────────────────────────────────┘
       │
       │ Tool Calls
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MCP CLIENT WRAPPER                            │
│                  src/lib/mcp-client.ts                           │
│  Прямые вызовы к MCP инструментам:                              │
│  • Notion (search, create, query, update)                       │
│  • Telegram (send messages)                                     │
│  • Local Data (SQLite queries, conversations, reminders)        │
│  • Perplexity (web search)                                      │
└──────┬──────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ВНЕШНИЕ СЕРВИСЫ                               │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Notion API   │  │ Perplexity   │  │  SQLite DB   │         │
│  │  (Knowledge   │  │ API (Search) │  │  (Local      │         │
│  │   & Tasks)    │  │              │  │   Storage)   │         │
│  └───────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧩 Компоненты системы

### 1. **Telegram Bot** (Entry Point)

**Файл:** `src/telegram-bot.ts`
**Технология:** grammY (Telegram Bot Framework)
**Режим:** Long Polling (не требует HTTPS)

**Функции:**
- Получает сообщения от пользователя через Telegram API
- Проверяет авторизацию (только `TELEGRAM_AUTHORIZED_USER_ID`)
- Делает HTTP POST запрос к orchestrator
- Отправляет ответ обратно в Telegram

**Почему отдельный процесс:**
- Независимость от n8n
- Легче отлаживать (отдельные логи)
- Работает везде (не требует webhook/HTTPS)

---

### 2. **HTTP API Server** (API Gateway)

**Файл:** `src/http-server.ts`
**Технология:** Express.js
**Port:** 3000

**Endpoints:**

| Method | Path | Описание |
|--------|------|----------|
| GET | `/health` | Health check |
| POST | `/api/orchestrator` | Обработка сообщения через Claude |
| POST | `/api/daily-digest` | Генерация утреннего/вечернего дайджеста |

**Функции:**
- Принимает HTTP запросы от Telegram bot
- Вызывает TypeScript скрипты (orchestrator, digest)
- Возвращает JSON ответы
- Обрабатывает ошибки и таймауты

**Почему HTTP Server:**
- n8n не поддерживает `Execute Command` узел
- HTTP Request работает в любой версии n8n
- Легче масштабировать (можно добавить кеширование, очереди)

---

### 3. **Orchestrator v2** (Brain)

**Файл:** `scripts/invoke-orchestrator-v2.ts`
**Технология:** Anthropic SDK + MCP Client

**Agentic Loop:**
```typescript
for (let iteration = 0; iteration < maxIterations; iteration++) {
  // 1. Отправить сообщение Claude API с доступными tools
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    messages: conversationHistory,
    tools: mcpTools,
  });

  // 2. Если Claude вызывает tool
  if (response.stop_reason === 'tool_use') {
    // Выполнить tool через MCP Client
    const toolResults = await executeMcpTools(response.content);

    // Добавить результаты в историю
    conversationHistory.push({
      role: 'user',
      content: toolResults
    });

    // Продолжить loop
    continue;
  }

  // 3. Если Claude закончил (text response)
  return response.content[0].text;
}
```

**Функции:**
- Классифицирует намерения пользователя
- Делегирует задачи специализированным MCP tools
- Поддерживает multi-turn диалоги
- Сохраняет контекст разговора

**Модель:** Claude Sonnet 4 (`claude-sonnet-4-20250514`)

---

### 4. **MCP Client** (Tool Executor)

**Файл:** `src/lib/mcp-client.ts`

**Доступные Tools:**

#### Notion Tools
```typescript
notionSearch(query: string)              // Поиск в Notion
notionCreatePage({                       // Создание страницы
  database, title, properties, content
})
notionQueryDatabase({ database, filter }) // Запрос к БД
notionUpdatePage({ page_id, properties }) // Обновление страницы
```

#### Local Data Tools
```typescript
dbQuery(sql, params)                     // SQL запросы
dbSaveConversation({ ... })              // Сохранить сообщение
dbGetContext({ telegram_chat_id })       // История разговора
dbSaveReminder({ ... })                  // Создать напоминание
```

#### Perplexity Tool
```typescript
perplexitySearch(query)                  // Умный веб-поиск
```

#### Telegram Tool
```typescript
telegramSendMessage({ chat_id, text })   // Отправить сообщение
```

**Преимущества MCP Client:**
- Прямой доступ к API (без spawn processes)
- Быстрее чем создание отдельных процессов
- Лучший error handling
- Типобезопасность (TypeScript)

---

### 5. **SQLite Database** (Local Storage)

**Файл:** `data/assistant.db`
**Технология:** better-sqlite3

**Таблицы:**

| Таблица | Назначение |
|---------|-----------|
| `conversations` | История всех сообщений пользователя |
| `reminders` | Активные и прошедшие напоминания |
| `notion_cache` | Кеш страниц из Notion для быстрого поиска |
| `calendar_cache` | Кеш событий из календаря |
| `preferences` | Настройки и предпочтения пользователя |

**Функции:**
- Хранение истории разговоров
- Управление напоминаниями
- Кеширование данных из Notion
- Быстрый локальный поиск

---

### 6. **Notion Integration** (Knowledge Base)

**API:** Notion API v1
**Token:** `NOTION_API_KEY`

**Базы данных:**

| База | ID | Назначение |
|------|----|-----------|
| Knowledge Base | `NOTION_KNOWLEDGE_DB_ID` | Заметки и идеи |
| Tasks | `NOTION_TASKS_DB_ID` | Задачи и напоминания |
| Daily Log | `NOTION_DAILY_LOG_DB_ID` | Дневной журнал |

**Операции:**
- Создание заметок
- Создание задач
- Поиск по базе знаний
- Обновление статусов задач

---

### 7. **n8n Workflows** (Automation - Optional)

**URL:** `http://localhost:5678`
**Статус:** Опционально (не требуется для Telegram)

**Workflows:**

| Workflow | Расписание | Назначение |
|----------|-----------|-----------|
| Morning Digest | 08:00 ежедневно | Утренний дайджест задач |
| Evening Digest | 21:00 ежедневно | Вечерняя сводка |
| Reminder Checker | Каждые 5 минут | Проверка напоминаний |
| Notion Sync | Каждые 30 минут | Синхронизация кеша |

**Почему n8n опционален:**
- Telegram Bot работает независимо
- n8n нужен только для автоматических задач (digest, sync)
- Можно использовать cron jobs вместо n8n

---

## 🔄 Поток обработки сообщения

### Пример: Пользователь отправляет "Запиши: встреча с инвестором"

```
1. Telegram Bot получает сообщение
   ├─ Проверяет user_id = 290722791 ✓
   └─ Делает POST /api/orchestrator

2. HTTP Server получает запрос
   ├─ Валидирует body (telegram_chat_id, user_message)
   └─ Вызывает invoke-orchestrator-v2.ts

3. Orchestrator запускает agentic loop
   ├─ Отправляет в Claude API:
   │  {
   │    model: 'claude-sonnet-4',
   │    messages: [{ role: 'user', content: 'Запиши: ...' }],
   │    tools: [notionCreatePage, dbSaveConversation, ...]
   │  }
   │
   ├─ Claude анализирует намерение → "создать заметку"
   │
   ├─ Claude вызывает tool: notionCreatePage
   │  {
   │    database: 'KNOWLEDGE_DB_ID',
   │    title: 'Встреча с инвестором',
   │    properties: { ... }
   │  }
   │
   ├─ MCP Client выполняет tool
   │  └─ Notion API создает страницу → page_id
   │
   ├─ Claude получает результат tool
   │  └─ Генерирует финальный ответ:
   │     "✅ Заметка сохранена! [Открыть в Notion](link)"
   │
   └─ Orchestrator возвращает ответ

4. HTTP Server возвращает JSON
   └─ { response: "✅ Заметка сохранена!..." }

5. Telegram Bot отправляет ответ
   └─ ctx.reply(response, { parse_mode: 'Markdown' })

6. Пользователь получает сообщение в Telegram
```

**Время обработки:** ~5-10 секунд (зависит от Claude API)

---

## 🧠 Принятие решений Claude

Claude классифицирует намерения и выбирает нужные tools:

| Запрос пользователя | Намерение | Tools | Результат |
|---------------------|-----------|-------|-----------|
| "Запиши: ..." | Создать заметку | `notionCreatePage` | Страница в Knowledge Base |
| "Создай задачу: ..." | Создать задачу | `notionCreatePage` | Задача в Tasks DB |
| "Что у меня на сегодня?" | Посмотреть задачи | `notionQueryDatabase` | Список задач |
| "Найди информацию про X" | Поиск | `notionSearch` + `perplexitySearch` | Результаты поиска |
| "Напомни мне через час: ..." | Создать напоминание | `dbSaveReminder` | Напоминание в SQLite |

---

## 📦 Структура проекта

```
becho-ai-assis/
├── src/
│   ├── telegram-bot.ts          # Telegram бот (grammY)
│   ├── http-server.ts           # HTTP API сервер (Express)
│   └── lib/
│       ├── mcp-client.ts        # MCP tools wrapper
│       └── claude-client.ts     # Claude API wrapper
│
├── scripts/
│   ├── invoke-orchestrator-v2.ts    # Главный оркестратор
│   ├── invoke-daily-digest.ts       # Генерация дайджестов
│   ├── check-reminders.ts           # Проверка напоминаний
│   ├── sync-notion-cache.ts         # Синхронизация с Notion
│   ├── start-http-server.sh         # Запуск HTTP сервера
│   └── start-bot.sh                 # Запуск Telegram бота
│
├── agents/                      # Определения агентов (для Claude Code)
├── skills/                      # Prompt-шаблоны
├── mcp-servers/                 # MCP серверы конфигурация
├── n8n-workflows/               # n8n workflow файлы (опционально)
├── data/
│   └── assistant.db            # SQLite база данных
│
├── .env                        # Конфигурация (API keys, tokens)
└── package.json                # Зависимости
```

---

## ⚙️ Конфигурация (.env)

```bash
# Telegram
TELEGRAM_BOT_TOKEN=...              # Бот token от @BotFather
TELEGRAM_AUTHORIZED_USER_ID=...    # Ваш Telegram user ID

# Notion
NOTION_API_KEY=...                 # Integration token
NOTION_KNOWLEDGE_DB_ID=...         # Knowledge Base ID
NOTION_TASKS_DB_ID=...             # Tasks DB ID

# Claude API
ANTHROPIC_API_KEY=...              # Claude API key

# Perplexity
PERPLEXITY_API_KEY=...             # Perplexity API key (опционально)

# HTTP Server
HTTP_SERVER_PORT=3000
HTTP_SERVER_URL=http://localhost:3000

# Database
DB_PATH=./data/assistant.db
```

---

## 🚀 Запуск системы

### Полный запуск (2 команды):

```bash
# 1. Запустить HTTP сервер
./scripts/start-http-server.sh

# 2. Запустить Telegram бота
./scripts/start-bot.sh
```

### Проверка статуса:

```bash
# HTTP сервер
curl http://localhost:3000/health

# Telegram бот
pgrep -f "telegram-bot.ts"

# Логи
tail -f /tmp/becho-http-server.log
tail -f /tmp/becho-telegram-bot.log
```

---

## 🔐 Безопасность

1. **Авторизация:**
   - Только один пользователь (`TELEGRAM_AUTHORIZED_USER_ID`)
   - Проверка на каждом сообщении

2. **API Keys:**
   - Все ключи в `.env` (gitignored)
   - Никогда не коммитятся в git

3. **Валидация:**
   - Zod схемы для всех входных данных
   - Проверка параметров перед API вызовами

4. **Rate Limiting:**
   - Естественный rate limit через Telegram API
   - Claude API имеет свои лимиты

---

## 📊 Мониторинг

### Логи:

```bash
# HTTP Server
/tmp/becho-http-server.log

# Telegram Bot
/tmp/becho-telegram-bot.log

# n8n Executions (если используется)
http://localhost:5678 → Executions
```

### Метрики:

```sql
-- Количество сообщений за день
SELECT COUNT(*) FROM conversations
WHERE DATE(timestamp) = DATE('now');

-- Активные напоминания
SELECT COUNT(*) FROM reminders WHERE status='pending';

-- Кеш Notion
SELECT COUNT(*) FROM notion_cache;
```

---

## 🎯 Расширение системы

### Добавить новый MCP Tool:

1. Создать функцию в `src/lib/mcp-client.ts`
2. Добавить tool definition в `invoke-orchestrator-v2.ts`
3. Claude автоматически начнет использовать новый tool

### Добавить новый workflow:

1. Создать скрипт в `scripts/`
2. Добавить endpoint в `src/http-server.ts`
3. (Опционально) Создать n8n workflow

### Добавить новую базу Notion:

1. Создать базу в Notion
2. Добавить ID в `.env`
3. Обновить MCP tool definitions

---

## ✅ Преимущества текущей архитектуры

1. **Модульность:**
   - Каждый компонент независим
   - Легко заменить/обновить части

2. **Масштабируемость:**
   - HTTP API легко горизонтально масштабируется
   - Можно добавить Redis для кеширования
   - Можно добавить очереди (RabbitMQ, BullMQ)

3. **Отказоустойчивость:**
   - Если n8n упал → Telegram бот продолжает работать
   - Если HTTP server упал → можно перезапустить без потери данных

4. **Легко отлаживать:**
   - Отдельные логи для каждого компонента
   - Можно тестировать каждый компонент независимо

5. **Гибкость:**
   - Легко добавить новые интеграции
   - Легко изменить логику обработки
   - Можно использовать разные модели Claude

---

**Готово!** Теперь у вас есть полное понимание архитектуры системы. 🚀

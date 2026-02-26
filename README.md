# Becho AI Assistant

Персональный мультиагентный AI-ассистент на основе Claude Code для автоматизации повседневных задач.

## Возможности

- 📝 **Управление заметками** — сохранение в Notion с автоматической категоризацией
- ✅ **Управление задачами** — создание, отслеживание, напоминания
- 📅 **Календарь** — просмотр расписания и создание встреч в Яндекс.Календаре
- 🔍 **Умный поиск** — поиск информации через Perplexity API
- 💬 **Переписка** — помощь в общении с контрагентами через Telegram
- 📊 **Дайджесты** — утренние и вечерние сводки
- 🔎 **Анализ диалогов** — извлечение insights, задач и решений из переписок Telegram

## Архитектура

```
Telegram Bot → n8n Workflows → Claude Code Agents → Integrations
                                      ↓
                         MCP Servers (Notion, Calendar, etc.)
```

### Компоненты

- **Claude Code** — мультиагентная система (7 специализированных агентов)
- **n8n** — автоматизация workflow и оркестрация
- **MCP Servers** — интеграции с внешними сервисами
- **SQLite** — локальное хранилище (история, кеш, напоминания)
- **ChromaDB** — векторная БД для семантического поиска

## 🚀 Быстрый старт

### Запуск системы (2 команды):

```bash
# 1. Запустить HTTP Server
./scripts/start-http-server.sh

# 2. Запустить Telegram Bot
./scripts/start-bot.sh
```

### Проверка:

```bash
# HTTP Server
curl http://localhost:3000/health

# Telegram Bot
pgrep -f "telegram-bot.ts"
```

### Тест в Telegram:

Отправьте боту `/start`: [@becho_ai_assistant_bot](https://t.me/becho_ai_assistant_bot)

---

## 📚 Документация

Полная документация в папке **[docs/](docs/)**:

- **[docs/getting-started/START.md](docs/getting-started/START.md)** - Полная инструкция по запуску
- **[docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)** - Архитектура системы
- **[docs/architecture/FLOW_DETAILED.md](docs/architecture/FLOW_DETAILED.md)** - Поток обработки данных
- **[docs/n8n/IMPORT_N8N.md](docs/n8n/IMPORT_N8N.md)** - n8n workflows (опционально)

---

## 🎯 Детальная настройка

Если запускаете впервые:

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка окружения

```bash
cp .env.example .env
# Отредактируйте .env и добавьте ваши API ключи
```

### 3. Инициализация базы данных

```bash
npm run init:db
```

### 4. Запуск

```bash
./scripts/start-http-server.sh  # HTTP Server
./scripts/start-bot.sh           # Telegram Bot
```

**Подробная инструкция:** [docs/getting-started/SETUP.md](docs/getting-started/SETUP.md)

## Структура проекта

```
becho-ai-assis/
├── agents/              # Определения Claude Code агентов
├── skills/              # Переиспользуемые промпт-шаблоны
├── mcp-servers/         # MCP серверы для интеграций
├── src/                 # Общие утилиты и типы
├── scripts/             # Скрипты для настройки и обслуживания
├── n8n-workflows/       # Экспортированные n8n workflow
├── data/                # Локальные данные (gitignored)
└── tests/               # Тесты

```

## Агенты

1. **orchestrator** — маршрутизация и делегирование задач
2. **note-taker** — управление заметками в Notion
3. **task-manager** — управление задачами и напоминаниями
4. **scheduler** — работа с календарём
5. **researcher** — поиск информации
6. **communicator** — помощь в переписке
7. **daily-digest** — генерация дайджестов
8. **dialogue-analyzer** — анализ диалогов Telegram

## MCP Серверы

- **notion** — интеграция с Notion API
- **telegram** — отправка/чтение сообщений, анализ диалогов (Bot API + MTProto)
- **yandex-calendar** — работа с Яндекс.Календарём (CalDAV)
- **perplexity** — умный поиск
- **local-data** — SQLite и ChromaDB

## Разработка

### Запуск в dev режиме

```bash
npm run dev
```

### Тестирование

```bash
# Запустить все тесты
npm test

# С покрытием
npm run test:coverage

# Тест MCP серверов
npm run test:mcp
```

## Необходимые API ключи

1. **Telegram Bot Token** — получить у [@BotFather](https://t.me/botfather)
2. **Telegram API ID/Hash** — получить на [my.telegram.org](https://my.telegram.org) (для MTProto)
3. **Notion Integration** — создать на [notion.so/my-integrations](https://www.notion.so/my-integrations)
4. **Yandex OAuth** — получить через [oauth.yandex.ru](https://oauth.yandex.ru)
5. **Perplexity API Key** — получить на [perplexity.ai](https://www.perplexity.ai/settings/api)

## Безопасность

- ✅ Все API ключи в `.env` файле (gitignored)
- ✅ Telegram бот ограничен одним авторизованным пользователем
- ✅ n8n защищён базовой аутентификацией
- ✅ Валидация всех входных данных через Zod

## Roadmap

- [x] **Phase 1: Foundation** — Project setup, SQLite, n8n
- [x] **Phase 2: MCP Servers** — All integrations (Notion, Telegram, Perplexity, Local Data)
- [x] **Phase 3: Agents & Skills** — 7 agents, 5 skills ([PHASE3_COMPLETE.md](PHASE3_COMPLETE.md))
- [x] **Phase 4: n8n Workflows** — 5 workflows, 5 scripts ([PHASE4_COMPLETE.md](PHASE4_COMPLETE.md))
- [x] **Phase 4.1: Claude API Integration** — Real AI with tool use ([PHASE4.1_COMPLETE.md](PHASE4.1_COMPLETE.md)) ✅
- [ ] **Phase 5: RAG & Intelligence** — ChromaDB, semantic search, Telegram channels
- [ ] **Phase 6: Polish** — Multi-step conversations, proactive notifications

## Лицензия

MIT

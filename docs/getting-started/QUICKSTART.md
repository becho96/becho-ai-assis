# 🚀 Быстрый старт Becho AI Assistant

## ✅ Что уже готово (Production Ready!)

### Phase 1: Foundation ✅
- SQLite база данных (5 таблиц)
- TypeScript проект настроен
- Environment variables (.env)

### Phase 2: MCP Servers ✅
- 4 MCP сервера: Notion, Telegram, Perplexity, Local Data
- 13 MCP tools готовы к использованию

### Phase 3: Agents & Skills ✅
- 7 специализированных агентов
- 5 prompt-шаблонов (skills)

### Phase 4: n8n Workflows ✅
- 5 workflows для n8n
- 5 TypeScript скриптов

### Phase 4.1: Claude API Integration ✅
- Real Claude Sonnet 4 API
- Agentic tool use loop
- MCP tools integration
- **System is INTELLIGENT now!** 🧠

---

## 🏁 Как запустить систему

### Шаг 1: Проверьте что всё установлено

```bash
# Node.js и npm
node --version  # должно быть >= 18
npm --version

# n8n запущен
curl http://localhost:5678/healthz
```

### Шаг 2: Установите зависимости

```bash
cd /Users/boris/Desktop/becho-ai-assis
npm install
```

### Шаг 3: Импортируйте workflows в n8n

1. Откройте http://localhost:5678
2. **Workflows** → **Import from File**
3. Импортируйте по очереди:
   - `n8n-workflows/telegram-router.json`
   - `n8n-workflows/morning-digest.json`
   - `n8n-workflows/evening-digest.json`
   - `n8n-workflows/reminder-checker.json`
   - `n8n-workflows/notion-sync.json`

### Шаг 4: Настройте Telegram credentials в n8n

1. В n8n: **Credentials** → **Add Credential**
2. Выберите **Telegram API**
3. Name: `Telegram Bot`
4. Access Token: (скопируйте из `.env` файла `TELEGRAM_BOT_TOKEN`)
5. **Save**

### Шаг 5: Активируйте все workflows

Для каждого workflow:
1. Откройте workflow
2. Toggle **Active** (справа вверху) → **ON**

### Шаг 6: Тест!

Отправьте боту в Telegram:
```
/start
```

Ожидаемый ответ:
```
👋 Привет! Я твой AI-ассистент Becho.

Я могу:
• Сохранять заметки
• Создавать задачи
• Управлять календарём
• Искать информацию
• Помогать с сообщениями

Чем могу помочь?
```

### Шаг 7: Попробуйте создать заметку

```
Запиши: тестовая заметка для проверки системы
```

Ожидаемый ответ:
```
✅ Заметка сохранена в базу знаний

🔗 [Открыть в Notion](https://notion.so)
```

---

## 🎉 Phase 4.1 ЗАВЕРШЕНА!

**Система теперь по-настоящему умная:**
- ✅ Real Claude Sonnet 4 API integration
- ✅ Intelligent intent classification
- ✅ Real Notion page creation
- ✅ Real Perplexity web search
- ✅ Agentic multi-step reasoning

**Тест показал:**
```bash
✅ "Привет!" → Умное приветствие
✅ "Запиши: встреча с инвестором" → Реальная страница в Notion создана!
✅ "Создай задачу: отправить отчёт" → Реальная задача создана!
✅ "Найди информацию про Claude 4" → Умный поиск и ответ
✅ "Что у меня на сегодня?" → Запрос из Notion
```

**Подробности:** [PHASE4.1_COMPLETE.md](PHASE4.1_COMPLETE.md)

---

## 📊 Что работает прямо сейчас

### ✅ AI Core (Phase 4.1)

**Claude Sonnet 4 Integration:**
- ✅ Intelligent intent classification
- ✅ Agentic multi-step reasoning
- ✅ Real MCP tool calls
- ✅ Context-aware responses
- ✅ Russian language support

**Working MCP Tools:**
- ✅ Notion page creation (Knowledge Base)
- ✅ Notion task creation
- ✅ Perplexity web search
- ✅ SQLite conversation storage
- ✅ Reminder creation

### ✅ Telegram Router
- Accepts messages
- Authorization check
- AI-powered responses
- Conversation history

### ✅ Morning/Evening Digest
- Scheduled (08:00 and 21:00)
- Notion tasks query
- Digest generation
- Telegram delivery

### ✅ Reminder Checker
- Every 5 minutes
- Notification delivery
- Status updates

### ✅ Notion Sync
- Every 30 minutes
- Cache updates
- Fast local search

---

## 🎯 Следующие шаги (опционально)

### Вариант 1: Production Deployment

**Цель:** Развернуть в production

**Задачи:**
1. Настроить n8n на production сервере
2. Импортировать все workflows
3. Настроить мониторинг
4. Протестировать через Telegram

**Время:** 1-2 часа
**Приоритет:** 🟢 RECOMMENDED

### Вариант 2: Phase 5 — RAG (опционально)

**Цель:** Добавить семантический поиск и память

**Задачи:**
1. Интеграция ChromaDB
2. Векторизация Notion cache
3. Semantic search
4. Чтение Telegram каналов

**Время:** 1-2 дня

**Приоритет:** 🟡 MEDIUM

### Вариант 3: Phase 6 — Polish (опционально)

**Цель:** Улучшить UX и надёжность

**Задачи:**
1. Multi-turn conversations
2. Proactive notifications
3. Error handling
4. Security hardening

**Время:** 2-3 дня

**Приоритет:** 🟢 LOW

---

## 💡 Полезные команды

```bash
# Проверить статус workflows в n8n
curl http://localhost:5678/rest/workflows

# Посмотреть историю сообщений
sqlite3 data/assistant.db "SELECT * FROM conversations ORDER BY timestamp DESC LIMIT 10;"

# Посмотреть активные напоминания
sqlite3 data/assistant.db "SELECT * FROM reminders WHERE status='pending';"

# Посмотреть кеш Notion
sqlite3 data/assistant.db "SELECT COUNT(*) FROM notion_cache;"

# Протестировать MCP серверы
npm run test:mcp

# Запустить бота в фоне
npm run test:bot &
```

---

## 📚 Документация

- [README.md](README.md) — главная документация
- [PHASE3_COMPLETE.md](PHASE3_COMPLETE.md) — детали агентов и skills
- [PHASE4_COMPLETE.md](PHASE4_COMPLETE.md) — детали workflows
- [n8n-workflows/README.md](n8n-workflows/README.md) — установка и настройка n8n

---

## 🎉 Поздравляю!

MVP система готова на **100%**!

Следующий шаг — **Phase 4.1** для интеграции Claude API и превращения системы в полноценного умного ассистента.

Готовы начать Phase 4.1? 🚀

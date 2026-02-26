# 🚀 СТАРТ: Becho AI Assistant готов к использованию!

## ✅ Что проверено и работает

### Инфраструктура
- ✅ **n8n** запущен на `http://localhost:5678`
- ✅ **SQLite база данных** создана с 5 таблицами
- ✅ **Telegram бот** `@becho_ai_assistant_bot` запущен
- ✅ **Claude Sonnet 4 API** интегрирован и работает

### Функциональность
- ✅ Приём и обработка сообщений из Telegram
- ✅ Создание заметок в Notion (Knowledge Base)
- ✅ Создание задач в Notion (Tasks)
- ✅ Поиск в базе знаний
- ✅ Умные ответы с использованием Claude API

---

## 🎯 Следующий шаг: Импорт и активация workflows

### Шаг 1: Откройте n8n

```bash
# Откройте в браузере:
open http://localhost:5678
```

**Credentials для входа:**
- Email: `becho15rus@gmail.com`
- Password: `TV@4!X7aBTkTej4`

### Шаг 2: Настройте Telegram Credentials

1. В n8n: **Credentials** → **+ Add Credential**
2. Выберите **Telegram API**
3. Заполните:
   - **Name**: `Telegram Bot`
   - **Access Token**: `8530313570:AAGKPw8OV7OYNNm8umRLduYn6SF3e_RsCdo`
4. Нажмите **Save**

### Шаг 3: Импортируйте workflows

В n8n: **Workflows** → **Import from File**

Импортируйте по очереди все 5 файлов из папки `n8n-workflows/`:

1. ✅ `telegram-router.json` — Главный роутер сообщений
2. ✅ `morning-digest.json` — Утренний дайджест (08:00)
3. ✅ `evening-digest.json` — Вечерний дайджест (21:00)
4. ✅ `reminder-checker.json` — Проверка напоминаний (каждые 5 мин)
5. ✅ `notion-sync.json` — Синхронизация с Notion (каждые 30 мин)

### Шаг 4: Активируйте workflows

Для каждого workflow:
1. Откройте workflow в n8n
2. Нажмите переключатель **Active** (справа вверху) → **ON**
3. Убедитесь что статус "Active" зелёный

### Шаг 5: Настройте Webhook для Telegram

1. Откройте workflow **Telegram Router**
2. Найдите узел **Webhook** (первый узел)
3. Скопируйте Webhook URL (будет что-то вроде `http://localhost:5678/webhook/...`)
4. Зарегистрируйте webhook:

```bash
curl "https://api.telegram.org/bot8530313570:AAGKPw8OV7OYNNm8umRLduYn6SF3e_RsCdo/setWebhook?url=WEBHOOK_URL"
```

Замените `WEBHOOK_URL` на скопированный URL.

**Альтернатива (если n8n на локалхосте):**

Используйте **Telegram Polling** вместо Webhook:
1. В workflow **Telegram Router** замените узел **Webhook** на **Telegram Trigger (Polling)**
2. Настройте credentials как в Шаге 2

---

## 🧪 Тестирование

### Тест 1: Отправьте сообщение боту

Откройте Telegram → [@becho_ai_assistant_bot](https://t.me/becho_ai_assistant_bot)

```
/start
```

**Ожидаемый ответ:**
```
👋 Привет!

Отлично тебя видеть! Я твой персональный ассистент...
```

### Тест 2: Создайте заметку

```
Запиши: тестовая заметка для проверки системы
```

**Ожидаемый ответ:**
```
✅ Заметка сохранена!

**Тестовая заметка** добавлена в базу знаний.

[Посмотреть в Notion](https://notion.so/...)
```

### Тест 3: Создайте задачу

```
Создай задачу: протестировать AI ассистента
```

**Ожидаемый ответ:**
```
✅ Задача создана успешно!

📋 **Протестировать AI ассистента**
🔗 [Открыть в Notion](https://notion.so/...)
```

### Тест 4: Поиск

```
Что у меня на сегодня?
```

Бот проверит базу задач и ответит списком активных задач.

---

## 📱 Как использовать

### Создание заметок
```
Запиши: <текст заметки>
Заметка: <текст>
Сохрани: <текст>
```

### Создание задач
```
Создай задачу: <название>
Задача: <название> до <дата>
Напомни <дата>: <текст>
```

### Поиск информации
```
Найди информацию про <тема>
Что ты знаешь про <тема>?
```

### Проверка задач
```
Что у меня на сегодня?
Какие задачи на этой неделе?
Покажи активные задачи
```

### Общение
```
Помоги с ответом на сообщение: <контекст>
Как лучше ответить на: <сообщение>
```

---

## 🔧 Полезные команды

### Проверка статуса

```bash
# Проверить n8n
curl http://localhost:5678/healthz

# Проверить БД
sqlite3 data/assistant.db "SELECT COUNT(*) FROM conversations;"

# Посмотреть последние сообщения
sqlite3 data/assistant.db "SELECT * FROM conversations ORDER BY timestamp DESC LIMIT 5;"

# Проверить напоминания
sqlite3 data/assistant.db "SELECT * FROM reminders WHERE status='pending';"
```

### Перезапуск n8n

```bash
# Если используете Docker
docker-compose restart

# Если n8n установлен глобально
n8n restart
```

---

## 📊 Мониторинг

### Просмотр логов n8n

1. Откройте n8n → **Executions**
2. Фильтруйте по workflow
3. Проверяйте статус выполнений (success/error)

### Проверка кеша Notion

```bash
sqlite3 data/assistant.db "SELECT COUNT(*) FROM notion_cache;"
```

Если кеш пустой, выполните ручную синхронизацию:
```bash
npm run sync:notion
```

---

## 🎉 Система готова!

**Что работает прямо сейчас:**
- ✅ Telegram бот принимает сообщения
- ✅ Claude Sonnet 4 обрабатывает запросы
- ✅ Создание заметок в Notion
- ✅ Создание задач в Notion
- ✅ Поиск в базе знаний
- ✅ Сохранение истории разговоров

**Следующие фазы (опционально):**
- 📊 **Phase 5: RAG** — Семантический поиск с ChromaDB
- 🎯 **Phase 6: Polish** — Мультишаговые диалоги и проактивные уведомления

---

## 🆘 Если что-то не работает

### Бот не отвечает
1. Проверьте что workflow **Telegram Router** активен
2. Проверьте webhook или polling настроен
3. Посмотрите логи в n8n → **Executions**

### Ошибки при создании заметок
1. Проверьте Notion credentials:
   - API Key: возьмите в Notion → Settings → Integrations
   - Knowledge DB ID: скопируйте из URL базы данных
2. Убедитесь что интеграция Notion подключена к базе данных

### Claude API не работает
Проверьте API key:
```bash
echo $ANTHROPIC_API_KEY
# Должен вывести: sk-ant-api03-...
```

---

## 📚 Документация

- [README.md](README.md) — Полная документация проекта
- [QUICKSTART.md](QUICKSTART.md) — Быстрый старт
- [n8n-workflows/README.md](n8n-workflows/README.md) — Детали по workflows
- [PHASE4.1_COMPLETE.md](PHASE4.1_COMPLETE.md) — Claude API интеграция

---

**🎯 Следующий шаг:**
Импортируйте workflows в n8n (см. Шаг 3 выше) и начните использовать ассистента! 🚀

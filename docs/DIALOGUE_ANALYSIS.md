# Анализ диалогов Telegram

Функциональность анализа диалогов позволяет извлекать insights, задачи, решения и риски из переписок в Telegram.

## Возможности

- ✅ Анализ 1-on-1 диалогов
- ✅ Анализ групповых чатов
- ✅ Анализ каналов
- ✅ Извлечение задач и дедлайнов
- ✅ Выявление принятых решений
- ✅ Определение рисков
- ✅ Сохранение анализа в Notion
- ✅ Кеширование истории (TTL: 24 часа)

## Быстрый старт

### 1. Авторизация MTProto

Telegram User Client требует одноразовой авторизации:

```bash
npx tsx scripts/auth-telegram-user.ts
```

Вам будет отправлен SMS код. После авторизации вы получите **session string**.

### 2. Добавить session string в .env

```bash
echo "TELEGRAM_SESSION_STRING=<ваш_session_string>" >> .env
```

⚠️ **Важно:** Никогда не коммитьте session string в git!

### 3. Проверка работы

Тест получения истории:

```bash
npx tsx scripts/test-dialogue-analyzer.ts @username 7
```

## Использование через Telegram бота

### Примеры запросов

**Полный анализ:**
```
Проанализируй переписку с @zadum_off за последние 7 дней
```

**Конкретный период:**
```
Что обсуждали с @username за последние 30 дней
```

**Извлечение задач:**
```
Сформируй список задач из переписки с клиентом
```

### Формат ответа

Агент вернет структурированный отчет:

```markdown
📊 Анализ переписки с @username (последние 7 дней)

💬 Сообщений проанализировано: 127

🔑 КЛЮЧЕВЫЕ ТЕМЫ
• Тема 1
• Тема 2

✅ ПРИНЯТЫЕ РЕШЕНИЯ
• Решение 1

📝 ИЗВЛЕЧЕННЫЕ ЗАДАЧИ (5)
1. 🔴 Задача - @assignee (дедлайн)

❓ ОТКРЫТЫЕ ВОПРОСЫ
• Вопрос 1

⚠️ РИСКИ
• Риск 1

📅 ВАЖНЫЕ ДАТЫ
• 2026-02-20: Дедлайн

🔗 Полный анализ сохранен в Notion: [ссылка]
```

## Архитектура

### Компоненты

1. **TelegramUserClient** (`mcp-servers/telegram/telegram-user-client.ts`)
   - MTProto client для чтения истории
   - Методы: `getChatHistory`, `searchUser`, `getChatInfo`

2. **Dialogue Tools** (`mcp-servers/telegram/dialogue-tools.ts`)
   - MCP tools: `telegram_get_chat_history`, `telegram_search_user`
   - Кеширование в SQLite

3. **dialogue-analyzer Agent** (`agents/dialogue-analyzer.md`)
   - Процесс: поиск → история → анализ → отчет → сохранение

4. **analyze-dialogue Skill** (`skills/analyze-dialogue.md`)
   - Глубокий анализ переписки
   - Извлечение: темы, решения, задачи, риски, вопросы

### База данных

**Таблица `telegram_dialogues`:**
```sql
CREATE TABLE telegram_dialogues (
  id TEXT PRIMARY KEY,
  chat_username TEXT,
  sender_id TEXT,
  sender_name TEXT,
  content TEXT,
  timestamp DATETIME,
  fetched_at DATETIME
)
```

**Таблица `dialogue_analyses`:**
```sql
CREATE TABLE dialogue_analyses (
  id TEXT PRIMARY KEY,
  chat_username TEXT,
  analysis_type TEXT,
  analysis_json TEXT,
  notion_page_id TEXT,
  created_at DATETIME
)
```

## Ограничения

- **Максимум сообщений:** 500 за запрос
- **Rate limit:** 20 запросов/сек к Telegram API
- **Кеш TTL:** 24 часа
- **Доступ:** Только к диалогам владельца аккаунта

## Безопасность

- ✅ Session string хранится в `.env` (не в git)
- ✅ Rate limiting для защиты от блокировки
- ✅ Кеш в локальной SQLite (не в облаке)
- ✅ Доступ только к собственным диалогам

## Примеры использования

### Анализ проекта

**Запрос:**
```
Проанализируй переписку с @team_lead за последнюю неделю
```

**Результат:**
- Ключевые темы: Phase 4, код-ревью, дедлайны
- Решения: Использовать MTProto API
- Задачи: 5 извлеченных с приоритетами
- Риски: Сжатые сроки

### Встреча с клиентом

**Запрос:**
```
Что обсуждали с @client_name на этой неделе
```

**Результат:**
- Summary: Требования к интеграции
- Решения: Salesforce, 2 недели
- Задачи: Отправить смету завтра
- Вопросы: Бюджет, объем данных

### Анализ группы

**Запрос:**
```
Проанализируй группу 'Команда разработки' за последние 30 дней
```

**Результат:**
- Участники: 5 человек
- Темы: Архитектура, тестирование, деплой
- Решения: Переход на микросервисы
- Задачи: Распределенные по участникам

## Troubleshooting

### Ошибка: "User not found"

**Причина:** Неправильный username или пользователь не в контактах.

**Решение:**
1. Проверить написание username
2. Убедиться что есть переписка с этим пользователем
3. Проверить актуальный username в Telegram

### Ошибка: "No messages found"

**Причина:** Нет сообщений за указанный период.

**Решение:**
1. Расширить диапазон (например, 30 дней вместо 7)
2. Проверить что переписка не была удалена

### Ошибка: "Rate limit exceeded"

**Причина:** Превышен лимит запросов Telegram API.

**Решение:**
1. Подождать 5 минут
2. Использовать кеш (если доступен)
3. Уменьшить частоту запросов

### Ошибка: "Session expired"

**Причина:** Session string устарел или невалиден.

**Решение:**
1. Запустить `npx tsx scripts/auth-telegram-user.ts` снова
2. Обновить `TELEGRAM_SESSION_STRING` в `.env`

## Будущие улучшения

- [ ] Автоматическое создание задач в Notion из анализа
- [ ] Semantic search по диалогам через ChromaDB
- [ ] Проактивные инсайты из важных диалогов
- [ ] Экспорт анализа в PDF/Markdown
- [ ] Визуализация: графики тем, timeline событий
- [ ] Поддержка нескольких языков (не только русский)
- [ ] Анализ медиа-файлов из диалогов

## Технические детали

### Зависимости

```json
{
  "telegram": "^2.24.11"
}
```

### Environment Variables

```bash
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_SESSION_STRING=your_session_string
```

### Файлы

**Созданные:**
- `mcp-servers/telegram/telegram-user-client.ts`
- `mcp-servers/telegram/dialogue-tools.ts`
- `agents/dialogue-analyzer.md`
- `skills/analyze-dialogue.md`
- `scripts/auth-telegram-user.ts`
- `scripts/test-dialogue-analyzer.ts`
- `scripts/init-dialogue-tables.ts`

**Модифицированные:**
- `mcp-servers/telegram/index.ts` - добавлены dialogue tools
- `src/lib/mcp-client.ts` - методы для dialogue tools
- `skills/classify-intent.md` - добавлен DIALOGUE_ANALYSIS intent
- `agents/orchestrator.md` - добавлен dialogue-analyzer в таблицу
- `scripts/invoke-orchestrator-v2.ts` - добавлены новые tools

## FAQ

**Q: Можно ли анализировать чужие диалоги?**  
A: Нет. MTProto API дает доступ только к диалогам вашего аккаунта.

**Q: Сколько времени занимает анализ?**  
A: ~5 секунд на получение истории + ~10 секунд на анализ = ~15-30 секунд

**Q: Безопасно ли хранить session string?**  
A: Да, если хранить в `.env` (не коммитить в git). Session string = доступ к вашему аккаунту.

**Q: Можно ли анализировать старые диалоги (> 1 года)?**  
A: Да, но будет долго. Рекомендуем до 30 дней для быстроты.

**Q: Что если диалог очень большой (> 1000 сообщений)?**  
A: Система ограничит до 500 сообщений. Можно запросить анализ отдельных периодов.

---

**Документация:** [README.md](../README.md) | **Архитектура:** [docs/architecture/ARCHITECTURE.md](architecture/ARCHITECTURE.md)

# Пошаговая настройка Becho AI Assistant

Следуйте этим шагам для первоначальной настройки системы.

## Шаг 1: Установка зависимостей

```bash
npm install
```

## Шаг 2: Получение API ключей

### 2.1 Telegram Bot

1. Откройте Telegram и найдите [@BotFather](https://t.me/botfather)
2. Отправьте команду `/newbot`
3. Следуйте инструкциям (имя бота, username)
4. Скопируйте **Bot Token** (выглядит как `110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw`)

### 2.2 Telegram API ID и Hash

1. Перейдите на [my.telegram.org](https://my.telegram.org)
2. Войдите с помощью вашего номера телефона
3. Перейдите в "API development tools"
4. Создайте новое приложение
5. Скопируйте **api_id** и **api_hash**

### 2.3 Ваш Telegram User ID

1. Откройте Telegram и найдите [@userinfobot](https://t.me/userinfobot)
2. Отправьте команду `/start`
3. Скопируйте ваш **ID** (число, например `123456789`)

### 2.4 Notion Integration

1. Перейдите на [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Нажмите "+ New integration"
3. Заполните форму:
   - Name: "Becho AI Assistant"
   - Associated workspace: выберите ваш workspace
   - Capabilities: оставьте все по умолчанию
4. Нажмите "Submit"
5. Скопируйте **Internal Integration Token** (начинается с `secret_`)

### 2.5 Notion Parent Page

1. Создайте новую страницу в Notion (например, "Becho AI")
2. Откройте эту страницу
3. Скопируйте ID страницы из URL:
   - URL: `https://notion.so/My-Page-abc123def456...`
   - Page ID: `abc123def456...` (32 символа после последнего дефиса)

### 2.6 Yandex Calendar OAuth

1. Перейдите на [oauth.yandex.ru](https://oauth.yandex.ru)
2. Зарегистрируйте новое приложение
3. Получите OAuth токен с правами доступа к календарю
4. Скопируйте токен

### 2.7 Perplexity API Key

1. Перейдите на [perplexity.ai](https://www.perplexity.ai/settings/api)
2. Войдите в аккаунт
3. Создайте новый API ключ
4. Скопируйте ключ (начинается с `pplx-`)

## Шаг 3: Настройка .env файла

Скопируйте `.env.example` в `.env`:

```bash
cp .env.example .env
```

Откройте `.env` и заполните все значения:

```bash
# Telegram Configuration
TELEGRAM_BOT_TOKEN=110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890
TELEGRAM_AUTHORIZED_USER_ID=123456789

# Notion Configuration
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_PARENT_PAGE_ID=abc123def456ghi789...

# Yandex Calendar
YANDEX_OAUTH_TOKEN=your_token_here
YANDEX_CALENDAR_URL=https://caldav.yandex.ru

# Perplexity
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# n8n
N8N_USER=admin
N8N_PASSWORD=your_secure_password_123

# Paths (оставьте по умолчанию)
DB_PATH=./data/assistant.db
CHROMA_PATH=./data/chroma
```

## Шаг 4: Инициализация базы данных

Создайте SQLite базу данных:

```bash
npm run init:db
```

Вы должны увидеть:

```
🗄️  Initializing SQLite database...
✅ Created directory: ./data
📝 Creating tables...
  ✓ conversations
  ✓ reminders
  ✓ notion_cache
  ✓ calendar_cache
  ✓ preferences
  ✓ default preferences

✅ Database initialized successfully at: ./data/assistant.db
```

## Шаг 5: Настройка Notion баз данных

Создайте базы данных в Notion:

```bash
npm run init:notion
```

Скрипт создаст три базы данных и выведет их ID. Например:

```
📊 Creating database: Knowledge Base
   ✅ Created: abc123...
   📋 Add this to your .env file:
   NOTION_KNOWLEDGE_DB_ID=abc123...

📊 Creating database: Tasks
   ✅ Created: def456...
   📋 Add this to your .env file:
   NOTION_TASKS_DB_ID=def456...

📊 Creating database: Daily Log
   ✅ Created: ghi789...
   📋 Add this to your .env file:
   NOTION_DAILY_LOG_DB_ID=ghi789...
```

**ВАЖНО:**
1. Скопируйте все три ID в ваш `.env` файл
2. Откройте каждую базу данных в Notion
3. Нажмите "..." → "Add connections" → Выберите "Becho AI Assistant"

## Шаг 6: Запуск n8n

Запустите n8n через Docker:

```bash
docker-compose up -d
```

Проверьте статус:

```bash
docker-compose ps
```

Должно быть:

```
NAME           STATUS    PORTS
becho-n8n      Up        0.0.0.0:5678->5678/tcp
becho-redis    Up        0.0.0.0:6379->6379/tcp
```

Откройте n8n в браузере: [http://localhost:5678](http://localhost:5678)

Войдите с credentials из `.env`:
- Username: значение `N8N_USER` (по умолчанию `admin`)
- Password: значение `N8N_PASSWORD`

## Шаг 7: Тестирование Telegram бота

Проверьте подключение к Telegram:

```bash
npm run test:bot
```

Должно появиться:

```
🤖 Starting Telegram bot test...
✅ Bot started successfully!
   Username: @your_bot_username
   ID: 123456789
   Authorized user: 123456789

📱 Send a message to the bot to test connectivity...
   Press Ctrl+C to stop
```

Теперь:
1. Откройте Telegram
2. Найдите вашего бота по username (из вывода выше)
3. Отправьте `/start`
4. Бот должен ответить приветствием
5. Отправьте любое сообщение — бот отправит эхо

**Если всё работает — Phase 1 завершена! ✅**

Нажмите `Ctrl+C` чтобы остановить тестовый бот.

## Шаг 8: Проверка установки

Убедитесь что все готово:

- [x] Все зависимости установлены (`npm install`)
- [x] `.env` файл заполнен всеми ключами
- [x] SQLite база данных создана
- [x] Три базы данных в Notion созданы и подключены
- [x] n8n запущен и доступен
- [x] Telegram бот отвечает на сообщения

## Следующие шаги

После успешной настройки:

1. **Phase 2**: Создание MCP серверов для интеграций
2. **Phase 3**: Настройка Claude Code агентов
3. **Phase 4**: Создание n8n workflows

## Устранение проблем

### Telegram бот не отвечает

- Проверьте `TELEGRAM_BOT_TOKEN` в `.env`
- Убедитесь что бот не заблокирован в Telegram
- Проверьте логи: должно быть "Bot started successfully"

### Notion API ошибка

- Проверьте `NOTION_API_KEY` — должен начинаться с `secret_`
- Убедитесь что страница существует и доступна интеграции
- Проверьте что вы добавили connection к каждой базе данных

### n8n не запускается

- Проверьте Docker Desktop запущен
- Проверьте порт 5678 не занят: `lsof -i :5678`
- Проверьте логи: `docker-compose logs n8n`

### SQLite ошибка

- Убедитесь что директория `./data` существует
- Проверьте права доступа: `ls -la data/`
- Попробуйте удалить и пересоздать: `rm data/assistant.db && npm run init:db`

## Помощь

Если возникли проблемы:

1. Проверьте логи каждого компонента
2. Убедитесь что все API ключи валидны
3. Проверьте что все зависимости установлены
4. Посмотрите [Issues](https://github.com/yourusername/becho-ai-assis/issues)

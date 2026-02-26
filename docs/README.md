# 📚 Документация Becho AI Assistant

## 🚀 Быстрый старт

Для запуска системы читайте:
- **[START.md](getting-started/START.md)** - Полная инструкция по запуску
- **[QUICKSTART.md](getting-started/QUICKSTART.md)** - Краткий гайд (5 минут)
- **[SETUP.md](getting-started/SETUP.md)** - Детальная настройка окружения

## 🏗️ Архитектура

Понимание внутреннего устройства:
- **[ARCHITECTURE.md](architecture/ARCHITECTURE.md)** - Полная архитектура системы
- **[FLOW_DETAILED.md](architecture/FLOW_DETAILED.md)** - Детальный поток обработки сообщений

## 🔧 n8n Интеграция

Настройка workflow (опционально):
- **[IMPORT_N8N.md](n8n/IMPORT_N8N.md)** - Инструкция по импорту workflows
- **[FIX_N8N.md](n8n/FIX_N8N.md)** - Решение проблем с Execute Command

## 📈 История разработки

Changelog и прогресс:
- **[PROGRESS.md](development/PROGRESS.md)** - Общий прогресс
- **[PHASE1_COMPLETE.md](development/PHASE1_COMPLETE.md)** - Foundation (SQLite, структура)
- **[PHASE2_COMPLETE.md](development/PHASE2_COMPLETE.md)** - MCP Servers (4 интеграции)
- **[PHASE3_COMPLETE.md](development/PHASE3_COMPLETE.md)** - Agents & Skills (7 агентов)
- **[PHASE4_COMPLETE.md](development/PHASE4_COMPLETE.md)** - n8n Workflows (5 workflows)
- **[PHASE4.1_COMPLETE.md](development/PHASE4.1_COMPLETE.md)** - Claude API Integration

---

## 📂 Структура документации

```
docs/
├── README.md                    # Этот файл (навигация)
├── getting-started/             # Быстрый старт
│   ├── START.md                 # Полная инструкция
│   ├── QUICKSTART.md            # Краткий гайд
│   └── SETUP.md                 # Детальная настройка
├── architecture/                # Архитектура
│   ├── ARCHITECTURE.md          # Общая схема
│   └── FLOW_DETAILED.md         # Поток данных
├── n8n/                         # n8n интеграция
│   ├── IMPORT_N8N.md            # Импорт workflows
│   └── FIX_N8N.md               # Troubleshooting
└── development/                 # История разработки
    ├── PROGRESS.md              # Общий прогресс
    ├── PHASE1_COMPLETE.md       # Phase 1
    ├── PHASE2_COMPLETE.md       # Phase 2
    ├── PHASE3_COMPLETE.md       # Phase 3
    ├── PHASE4_COMPLETE.md       # Phase 4
    └── PHASE4.1_COMPLETE.md     # Phase 4.1
```

---

## 🎯 Рекомендуемый порядок чтения

### Для новых пользователей:

1. **[START.md](getting-started/START.md)** - начните здесь
2. **[ARCHITECTURE.md](architecture/ARCHITECTURE.md)** - поймите как работает система
3. **[FLOW_DETAILED.md](architecture/FLOW_DETAILED.md)** - детали обработки сообщений

### Для разработчиков:

1. **[SETUP.md](getting-started/SETUP.md)** - настройка окружения
2. **[ARCHITECTURE.md](architecture/ARCHITECTURE.md)** - архитектура
3. **[PHASE4.1_COMPLETE.md](development/PHASE4.1_COMPLETE.md)** - последние изменения

### Для troubleshooting:

1. **[FIX_N8N.md](n8n/FIX_N8N.md)** - проблемы с n8n
2. **[START.md](getting-started/START.md)** - раздел "Troubleshooting"

---

## 💡 Быстрые ссылки

### Запуск системы:
```bash
./scripts/start-http-server.sh  # HTTP Server
./scripts/start-bot.sh           # Telegram Bot
```

### Проверка статуса:
```bash
curl http://localhost:3000/health              # HTTP Server
pgrep -f "telegram-bot.ts"                     # Telegram Bot
tail -f /tmp/becho-http-server.log             # Логи Server
tail -f /tmp/becho-telegram-bot.log            # Логи Bot
```

### Полезные команды:
```bash
npm run test:orchestrator        # Тест orchestrator
npm run test:bot                 # Тест Telegram бота
npm run init:db                  # Инициализация БД
npm run sync:notion              # Синхронизация с Notion
```

---

**🚀 Начните с [START.md](getting-started/START.md)!**

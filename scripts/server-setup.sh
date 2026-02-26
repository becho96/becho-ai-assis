#!/usr/bin/env bash
# =============================================================================
# Becho AI Assistant — первичная настройка сервера
# Запускать ОДИН РАЗ на сервере Яндекс Облака при первоначальном развёртывании.
#
# Использование:
#   bash server-setup.sh [REPO_URL]
#
# Пример:
#   bash server-setup.sh https://github.com/your-org/becho-ai-assis.git
# =============================================================================

set -euo pipefail

PROJECT_DIR="/opt/becho-ai-assis"
REPO_URL="${1:-}"

# ── Цвета для вывода ─────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()    { echo -e "${GREEN}==>${NC} $1"; }
warn()    { echo -e "${YELLOW}WARN:${NC} $1"; }
error()   { echo -e "${RED}ERROR:${NC} $1" >&2; exit 1; }

# ── Проверка прав ────────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  error "Запустите скрипт с правами root: sudo bash server-setup.sh"
fi

# ── Проверка Docker ──────────────────────────────────────────────────────────
info "Проверяем Docker..."
docker --version || error "Docker не установлен. Установите Docker перед запуском скрипта."
docker compose version || error "Docker Compose не установлен. Установите Docker Compose плагин."

# ── URL репозитория ──────────────────────────────────────────────────────────
if [[ -z "$REPO_URL" ]]; then
  echo ""
  echo "Введите URL вашего GitHub репозитория:"
  echo "  Пример: https://github.com/your-org/becho-ai-assis.git"
  read -rp "REPO_URL: " REPO_URL
fi

[[ -z "$REPO_URL" ]] && error "URL репозитория не указан."

# ── Клонирование или обновление репозитория ──────────────────────────────────
if [[ -d "$PROJECT_DIR/.git" ]]; then
  warn "Директория $PROJECT_DIR уже существует. Обновляем код..."
  cd "$PROJECT_DIR"
  git pull origin main
else
  info "Клонируем репозиторий в $PROJECT_DIR..."
  git clone "$REPO_URL" "$PROJECT_DIR"
  cd "$PROJECT_DIR"
fi

# ── Создание необходимых директорий ─────────────────────────────────────────
info "Создаём рабочие директории..."
mkdir -p data logs
chmod 755 data logs

# ── Настройка .env ───────────────────────────────────────────────────────────
if [[ -f ".env" ]]; then
  warn ".env файл уже существует. Пропускаем создание."
else
  info "Создаём .env из шаблона .env.example..."
  cp .env.example .env
  chmod 600 .env

  echo ""
  echo -e "${YELLOW}════════════════════════════════════════════════════════${NC}"
  echo -e "${YELLOW}  ВАЖНО: Заполните .env файл реальными значениями!${NC}"
  echo -e "${YELLOW}════════════════════════════════════════════════════════${NC}"
  echo ""
  echo "  Откройте файл: nano $PROJECT_DIR/.env"
  echo ""
  echo "  Обязательные переменные:"
  echo "    ANTHROPIC_API_KEY        — ключ Claude API"
  echo "    TELEGRAM_BOT_TOKEN       — токен Telegram-бота"
  echo "    TELEGRAM_AUTHORIZED_USER_ID — ваш Telegram user ID"
  echo "    NOTION_API_KEY           — ключ Notion API"
  echo "    PERPLEXITY_API_KEY       — ключ Perplexity API"
  echo ""
  echo -e "${YELLOW}════════════════════════════════════════════════════════${NC}"
  echo ""

  read -rp "Нажмите Enter чтобы открыть .env в редакторе nano (или Ctrl+C чтобы пропустить)..."
  nano .env
fi

# ── Сборка и запуск ──────────────────────────────────────────────────────────
info "Собираем Docker образы..."
docker compose build

info "Запускаем сервисы..."
docker compose up -d

info "Ждём 10 секунд..."
sleep 10

# ── Проверка ─────────────────────────────────────────────────────────────────
info "Статус сервисов:"
docker compose ps

echo ""
info "Health check HTTP сервера..."
if curl -sf http://localhost:3000/health > /dev/null; then
  echo -e "${GREEN}  ✓ HTTP сервер работает${NC}"
else
  warn "HTTP сервер не отвечает. Проверьте логи: docker compose logs http-server"
fi

# ── Итог ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Настройка завершена!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Полезные команды:"
echo "    Статус:   cd $PROJECT_DIR && docker compose ps"
echo "    Логи:     cd $PROJECT_DIR && docker compose logs -f"
echo "    Стоп:     cd $PROJECT_DIR && docker compose down"
echo "    Рестарт:  cd $PROJECT_DIR && docker compose restart"
echo ""
echo "  Следующий шаг — настройте GitHub Actions Secrets:"
echo "    SERVER_HOST     — IP-адрес этого сервера"
echo "    SERVER_USER     — текущий SSH-пользователь ($(whoami 2>/dev/null || echo 'root'))"
echo "    SSH_PRIVATE_KEY — содержимое ~/.ssh/id_rsa (приватный ключ для деплоя)"
echo ""

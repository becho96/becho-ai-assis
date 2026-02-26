# Docker Deployment Guide

## 🐳 Architecture

The Becho AI Assistant runs as a multi-container Docker application with the following services:

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                        │
│                   (becho-network)                        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ HTTP Server  │  │ Telegram Bot │  │    n8n       │ │
│  │  (Port 3000) │◄─┤              │  │ (Port 8080)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                                     │         │
│         └─────────────────┬──────────────────┘         │
│                           │                             │
│                    ┌──────────────┐                     │
│                    │    Redis     │                     │
│                    │ (Port 6379)  │                     │
│                    └──────────────┘                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker Desktop installed and running
- `.env` file configured with all required credentials

### Start All Services

```bash
./docker-start.sh
```

Or manually:

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## 📦 Services

### 1. HTTP Server (`becho-http-server`)

**Purpose:** Orchestrator API endpoint for processing messages

**Port:** 3000

**Health Check:** `http://localhost:3000/health`

**Command:** `npm run start:server`

**Dependencies:** None (standalone)

### 2. Telegram Bot (`becho-telegram-bot`)

**Purpose:** Telegram Bot interface for user interaction

**Port:** None (connects to Telegram API)

**Command:** `npm run start:bot`

**Dependencies:** HTTP Server

### 3. n8n (`becho-n8n`)

**Purpose:** Workflow automation and scheduling

**Port:** 8080

**URL:** `http://localhost:8080`

**Credentials:**
- User: Set via `N8N_USER` env var (default: admin)
- Password: Set via `N8N_PASSWORD` env var (default: changeme)

**Dependencies:** Redis

### 4. Redis (`becho-redis`)

**Purpose:** Caching and queue management

**Port:** 6379

**Command:** `redis-server --appendonly yes`

**Dependencies:** None (standalone)

## 🔧 Configuration

### Environment Variables

All services use the `.env` file. Key variables:

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_SESSION_STRING=your_session_string
TELEGRAM_AUTHORIZED_USER_ID=your_user_id

# Notion
NOTION_API_KEY=your_notion_key
NOTION_KNOWLEDGE_DB_ID=your_db_id
NOTION_TASKS_DB_ID=your_tasks_db_id
NOTION_DAILY_LOG_DB_ID=your_log_db_id

# Anthropic
ANTHROPIC_API_KEY=your_claude_key

# HTTP Server
HTTP_SERVER_PORT=3000
HTTP_SERVER_URL=http://http-server:3000

# n8n
N8N_USER=admin
N8N_PASSWORD=your_password
```

## 📊 Monitoring

### View Docker Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f http-server
docker-compose logs -f telegram-bot
docker-compose logs -f n8n
docker-compose logs -f redis
```

### View Conversation Logs

Conversation logs are persisted to `./logs/conversations/` and remain accessible even after container restarts:

```bash
# View recent conversations (from host machine)
npm run view:logs [N]       # Last N messages (default: 20)

# Analyze conversation statistics
npm run analyze:logs

# View raw log file
cat logs/conversations/$(date +%Y-%m-%d).log

# From inside container
docker exec becho-http-server npm run view:logs
docker exec becho-http-server npm run analyze:logs
```

### Check Status

```bash
docker-compose ps
```

### Check Health

```bash
# HTTP Server
curl http://localhost:3000/health

# Redis
docker exec becho-redis redis-cli ping
```

## 🔄 Updates

### Rebuild After Code Changes

```bash
# Stop and rebuild
docker-compose down
docker-compose build
docker-compose up -d
```

### Update Dependencies

```bash
# Rebuild with no cache
docker-compose build --no-cache
```

## 🛑 Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

## 📁 Data Persistence

### Volumes

- `./data` - SQLite database and Chroma vector store
- `./logs` - Conversation logs (user messages and assistant responses)
- `./n8n-data` - n8n workflows and credentials
- `redis-data` - Redis persistent storage

### Backup

```bash
# Backup data and logs
tar -czf backup-$(date +%Y%m%d).tar.gz data/ logs/ n8n-data/

# Restore
tar -xzf backup-YYYYMMDD.tar.gz

# Backup only conversation logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/

# View conversation logs (from host)
npm run view:logs
npm run analyze:logs
```

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs [service-name]

# Restart specific service
docker-compose restart [service-name]
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3000  # or 8080, 6379

# Change port in docker-compose.yml
# For example: "3001:3000"
```

### Cannot Connect to Service

```bash
# Check if container is running
docker-compose ps

# Check network
docker network inspect becho-network

# Test internal connectivity
docker exec becho-telegram-bot ping http-server
```

### Clean Restart

```bash
# Stop all, remove containers and networks
docker-compose down

# Remove images (forces rebuild)
docker rmi becho-assistant:latest becho-n8n:latest

# Start fresh
./docker-start.sh
```

## 🔐 Security Notes

1. **Never commit .env to git** - Contains sensitive credentials
2. **Change n8n password** - Default is `changeme`
3. **Use strong TELEGRAM_SESSION_STRING** - Keep it secret
4. **Expose ports carefully** - Only expose what's needed

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [n8n Documentation](https://docs.n8n.io/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Notion API](https://developers.notion.com/)

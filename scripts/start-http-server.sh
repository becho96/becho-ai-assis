#!/bin/bash

# Start HTTP server for n8n integration
# This server provides HTTP endpoints for n8n workflows

echo "🚀 Starting Becho AI HTTP Server..."

# Kill any existing server processes
pkill -f "http-server.ts" 2>/dev/null || true

# Start server in background with nohup
cd "$(dirname "$0")/.."
nohup npm run start:server > /tmp/becho-http-server.log 2>&1 &

# Wait for server to start
sleep 2

# Check if server is running
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ HTTP Server started successfully!"
    echo "   Health check: http://localhost:3000/health"
    echo "   Logs: /tmp/becho-http-server.log"
    echo "   PID: $(pgrep -f http-server.ts)"
else
    echo "❌ Failed to start HTTP server"
    echo "Check logs: /tmp/becho-http-server.log"
    exit 1
fi

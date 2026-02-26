#!/bin/bash

# Stop HTTP server

echo "🛑 Stopping Becho AI HTTP Server..."

# Kill server processes
pkill -f "http-server.ts"

# Wait a moment
sleep 1

# Check if stopped
if pgrep -f "http-server.ts" > /dev/null 2>&1; then
    echo "⚠️  Server still running, forcing kill..."
    pkill -9 -f "http-server.ts"
    sleep 1
fi

if pgrep -f "http-server.ts" > /dev/null 2>&1; then
    echo "❌ Failed to stop server"
    exit 1
else
    echo "✅ HTTP Server stopped"
fi

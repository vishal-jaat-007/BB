#!/bin/bash

# Simple Server Restart Script

echo "🔄 Restarting server..."

cd /Users/vishal/Desktop/cashfree-wallet-backend

# Stop server
pkill -f "node index.js" 2>/dev/null
sleep 1

# Start server
node index.js > server_live.log 2>&1 &
sleep 2

echo "✅ Server restarted!"
echo "📊 View logs: tail -f server_live.log"


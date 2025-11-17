#!/bin/bash
cd "$(dirname "$0")"

echo "📊 LIVE SERVER LOGS"
echo "==================="
echo ""

# Kill existing server
pkill -f "node index.js" 2>/dev/null
sleep 1

# Start server
echo "🚀 Starting server..."
node index.js > server_live.log 2>&1 &
SERVER_PID=$!

sleep 3

echo "✅ Server started! PID: $SERVER_PID"
echo ""
echo "📊 LIVE LOGS (Last 40 lines):"
echo "============================="
echo ""

tail -40 server_live.log

echo ""
echo "🔄 Live monitoring ke liye:"
echo "   tail -f server_live.log"
echo ""
echo "💡 Payment karein - logs automatically update honge!"
echo ""


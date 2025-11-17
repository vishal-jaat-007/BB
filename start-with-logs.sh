#!/bin/bash
cd "$(dirname "$0")"

echo "🚀 Starting Server with Live Logs..."
echo "===================================="
echo ""

# Kill existing server
pkill -f "node index.js" 2>/dev/null
sleep 1

# Start server with logs
node index.js 2>&1 | tee server_live.log &
SERVER_PID=$!

sleep 2

echo "✅ Server started! PID: $SERVER_PID"
echo ""
echo "📊 Server Logs:"
echo "==============="
echo ""

# Show initial logs
tail -30 server_live.log 2>/dev/null || echo "Server starting..."

echo ""
echo "🔄 Live monitoring ke liye:"
echo "   tail -f server_live.log"
echo ""
echo "💡 Payment karein - logs automatically dikhenge!"
echo ""


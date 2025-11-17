#!/bin/bash
echo "📊 SERVER LOGS MONITOR"
echo "======================"
echo ""

# Check if server is running
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "✅ Server Status: RUNNING on port 3000"
else
    echo "❌ Server Status: NOT RUNNING"
    echo ""
    echo "🚀 Starting server..."
    cd "$(dirname "$0")"
    node index.js > server_live.log 2>&1 &
    sleep 2
    echo "✅ Server started!"
fi

echo ""
echo "📝 Recent Logs:"
echo "---------------"

if [ -f server_live.log ]; then
    tail -50 server_live.log
else
    echo "No log file found. Server might be running in foreground."
    echo ""
    echo "💡 To see live logs, run:"
    echo "   tail -f server_live.log"
    echo ""
    echo "Or check server terminal output directly."
fi

echo ""
echo "🔄 To monitor live logs:"
echo "   tail -f server_live.log"
echo ""


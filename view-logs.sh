#!/bin/bash
cd "$(dirname "$0")"

echo "📊 SERVER LOGS VIEWER"
echo "===================="
echo ""

if [ -f server_live.log ]; then
    echo "✅ Log file found!"
    echo ""
    echo "📝 Last 60 lines:"
    echo "-----------------"
    tail -60 server_live.log
    echo ""
    echo "🔄 Live monitoring: tail -f server_live.log"
else
    echo "⚠️ Log file not found!"
    echo ""
    echo "💡 Server start karein:"
    echo "   node index.js > server_live.log 2>&1 &"
    echo ""
    echo "Ya check karein server terminal mein directly logs dikhenge."
fi


#!/bin/bash

# Quick Start Script - Server Start + New URL

echo "🚀 Starting Server and Creating New URL..."
echo ""

# Step 1: Stop old processes
echo "📴 Stopping old tunnel and server..."
pkill -f "lt --port" 2>/dev/null
pkill -f "node index.js" 2>/dev/null
sleep 2

# Step 2: Start new tunnel
echo "🌐 Creating new tunnel..."
cd /Users/vishal/Desktop/cashfree-wallet-backend
lt --port 3000 > /tmp/localtunnel_output.txt 2>&1 &
sleep 3

# Step 3: Get new URL
NEW_URL=$(cat /tmp/localtunnel_output.txt | grep -o 'https://[^ ]*' | head -1)

if [ -z "$NEW_URL" ]; then
    echo "❌ Failed to get new URL. Trying again..."
    sleep 2
    NEW_URL=$(cat /tmp/localtunnel_output.txt | grep -o 'https://[^ ]*' | head -1)
fi

if [ -z "$NEW_URL" ]; then
    echo "❌ Error: Could not get tunnel URL"
    exit 1
fi

echo "✅ New URL: $NEW_URL"
echo ""

# Step 4: Update index.js with new URL
echo "📝 Updating index.js with new URL..."
sed -i '' "s|https://[^ ]*\.loca\.lt|$NEW_URL|g" index.js

# Step 5: Start server
echo "🔄 Starting server..."
node index.js > server_live.log 2>&1 &
sleep 2

# Step 6: Show status
echo ""
echo "✅ ===================================="
echo "✅ SERVER STARTED SUCCESSFULLY!"
echo "====================================="
echo "🌐 New URL: $NEW_URL"
echo ""
echo "📋 Cashfree Dashboard URLs:"
echo "   Return URL: $NEW_URL/api/payment/success"
echo "   Webhook URL: $NEW_URL/api/payment/webhook"
echo ""
echo "📱 Flutter App:"
echo "   Update baseUrl in PaymentService.dart to: $NEW_URL"
echo ""
echo "📊 View logs: tail -f server_live.log"
echo "====================================="


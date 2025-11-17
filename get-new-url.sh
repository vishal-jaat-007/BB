#!/bin/bash

# Get New URL Script

echo "🌐 Creating new tunnel URL..."

cd /Users/vishal/Desktop/cashfree-wallet-backend

# Stop old tunnel
pkill -f "lt --port" 2>/dev/null
sleep 2

# Start new tunnel
lt --port 3000 > /tmp/localtunnel_output.txt 2>&1 &
sleep 3

# Get URL
NEW_URL=$(cat /tmp/localtunnel_output.txt | grep -o 'https://[^ ]*' | head -1)

if [ -z "$NEW_URL" ]; then
    echo "❌ Failed to get URL. Trying again..."
    sleep 2
    NEW_URL=$(cat /tmp/localtunnel_output.txt | grep -o 'https://[^ ]*' | head -1)
fi

if [ -z "$NEW_URL" ]; then
    echo "❌ Error: Could not get tunnel URL"
    exit 1
fi

echo ""
echo "✅ New URL: $NEW_URL"
echo ""
echo "📋 Update these URLs in Cashfree Dashboard:"
echo "   Return URL: $NEW_URL/api/payment/success"
echo "   Webhook URL: $NEW_URL/api/payment/webhook"
echo ""
echo "📱 Update Flutter App (PaymentService.dart):"
echo "   const baseUrl = '$NEW_URL';"
echo ""
echo "💡 To update index.js automatically, run:"
echo "   sed -i '' 's|https://[^ ]*\.loca\.lt|$NEW_URL|g' index.js"

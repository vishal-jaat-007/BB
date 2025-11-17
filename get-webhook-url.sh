#!/bin/bash

echo "🚀 Starting ngrok..."
echo ""

# Start ngrok in background
ngrok http 3000 > /dev/null 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start
sleep 3

# Get the public URL
WEBHOOK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$WEBHOOK_URL" ]; then
    echo "❌ Could not get ngrok URL. Please run manually:"
    echo "   ngrok http 3000"
    echo ""
    echo "Then copy the HTTPS URL and add /api/payment/webhook to it"
    echo "Example: https://abc123.ngrok-free.app/api/payment/webhook"
else
    FULL_WEBHOOK_URL="${WEBHOOK_URL}/api/payment/webhook"
    echo "✅ Your Webhook URL is:"
    echo ""
    echo "   $FULL_WEBHOOK_URL"
    echo ""
    echo "📋 Copy this URL and add it to Cashfree Dashboard:"
    echo "   1. Go to: https://merchant.cashfree.com"
    echo "   2. Developers → Webhooks → Add Webhook URL"
    echo "   3. Paste: $FULL_WEBHOOK_URL"
    echo "   4. Select events: PAYMENT_SUCCESS, PAYMENT_FAILED, ORDER_PAID"
    echo ""
    echo "⚠️  Keep this terminal open while testing!"
    echo "   Press Ctrl+C to stop ngrok"
    echo ""
    
    # Keep script running
    wait $NGROK_PID
fi


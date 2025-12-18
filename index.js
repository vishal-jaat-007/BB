const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Razorpay Configuration
// NOTE: Replace these with your actual Razorpay credentials from environment variables
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'YOUR_KEY_ID';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'YOUR_KEY_SECRET';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'YOUR_WEBHOOK_SECRET';

// Validate Razorpay credentials
if (!RAZORPAY_KEY_ID || RAZORPAY_KEY_ID === 'YOUR_KEY_ID') {
  console.error('❌ ERROR: RAZORPAY_KEY_ID not set! Please set environment variable.');
}
if (!RAZORPAY_KEY_SECRET || RAZORPAY_KEY_SECRET === 'YOUR_KEY_SECRET') {
  console.error('❌ ERROR: RAZORPAY_KEY_SECRET not set! Please set environment variable.');
}

// Initialize Razorpay instance
let razorpay;
try {
  razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
  });
  console.log('✅ Razorpay initialized with Key ID:', RAZORPAY_KEY_ID.substring(0, 10) + '...');
} catch (error) {
  console.error('❌ Razorpay initialization error:', error);
  throw error;
}

// App Package Name - Flutter app ka package name
const APP_PACKAGE_NAME = 'com.example.equityapp';
const APP_DEEP_LINK = 'equityapp://payment-success';

// In-memory storage for wallet balances
// NOTE: For production, use a database (MongoDB, PostgreSQL, etc.)
const walletBalances = {};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware - sab requests log karein
app.use((req, res, next) => {
  console.log(`\n📥 ${req.method} ${req.url}`);
  if (req.query && Object.keys(req.query).length > 0) {
    console.log('📋 Query Params:', JSON.stringify(req.query));
  }
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    console.log('📦 Body:', JSON.stringify(req.body));
  }
  next();
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Razorpay Wallet Backend is running!' });
});

// Create Payment Order - Razorpay Integration
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { userId, amount, currency = 'INR', appRedirectUrl, customerName, customerEmail, customerPhone } = req.body;

    console.log('\n🔄 ===== PAYMENT ORDER REQUEST =====');
    console.log('📱 User ID:', userId);
    console.log('💰 Amount:', amount);
    console.log('📧 Email:', customerEmail);
    console.log('📞 Phone:', customerPhone);
    console.log('🔗 App Redirect:', appRedirectUrl);

    if (!userId || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId and amount are required' 
      });
    }

    // Validate minimum amount (₹1 = 100 paise)
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Minimum amount is ₹1. Please enter amount greater than or equal to ₹1.' 
      });
    }

    // Build return URL
    const baseUrl = req.protocol + '://' + req.get('host');
    const returnUrl = `${baseUrl}/api/payment/success?user_id=${encodeURIComponent(userId)}&app_redirect=${encodeURIComponent(appRedirectUrl || APP_DEEP_LINK)}`;
    
    // Ensure minimum amount is ₹1 (100 paise)
    const finalAmount = Math.max(amountValue, 1); // Minimum ₹1
    
    // Create Razorpay order
    const options = {
      amount: Math.round(finalAmount * 100), // Razorpay expects amount in paise, minimum 100 paise (₹1)
      currency: currency,
      receipt: `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      notes: {
        userId: userId,
        customerName: customerName || 'User',
        customerEmail: customerEmail || 'user@example.com',
        customerPhone: customerPhone || '9999999999',
        appRedirectUrl: appRedirectUrl || APP_DEEP_LINK
      }
    };

    console.log('📋 Creating Razorpay order with options:', options);
    console.log('🔑 Using Razorpay Key ID:', RAZORPAY_KEY_ID ? RAZORPAY_KEY_ID.substring(0, 10) + '...' : 'NOT SET');

    // Validate Razorpay instance
    if (!razorpay) {
      throw new Error('Razorpay instance not initialized. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }

    const razorpayOrder = await razorpay.orders.create(options);
    const orderId = razorpayOrder.id;
    
    console.log('✅ Razorpay Order Created:', orderId);

    // Store order details temporarily (in production, save to database)
    walletBalances[orderId] = {
      userId,
      amount: finalAmount, // Use validated amount (minimum ₹1)
      status: 'PENDING',
      createdAt: new Date(),
      appRedirectUrl: appRedirectUrl || APP_DEEP_LINK,
      customerEmail: customerEmail,
      customerPhone: customerPhone,
      razorpayOrderId: orderId
    };
    
    console.log('💾 Order stored:', {
      orderId: orderId,
      userId: userId,
      amount: finalAmount,
      status: 'PENDING'
    });

    console.log('✅ Payment order created successfully');
    console.log('=====================================\n');

    res.json({
      success: true,
      orderId: orderId,
      keyId: RAZORPAY_KEY_ID,
      amount: Math.round(finalAmount * 100), // Amount in paise (minimum 100 paise = ₹1)
      currency: currency,
      name: customerName || 'User',
      description: 'Wallet Recharge',
      prefill: {
        name: customerName || 'User',
        email: customerEmail || 'user@example.com',
        contact: customerPhone || '9999999999'
      },
      notes: {
        userId: userId,
        appRedirectUrl: appRedirectUrl || APP_DEEP_LINK
      },
      returnUrl: returnUrl,
      message: 'Razorpay order created. Use these details in Razorpay Checkout.',
      instructions: {
        step1: 'Use orderId, keyId, and amount in Razorpay Checkout',
        step2: 'Payment complete hone ke baad automatically app mein redirect ho jayega',
        step3: 'Profile screen mein balance check karein - automatically update ho jayega'
      }
    });
  } catch (error) {
    console.error('\n❌ ===== PAYMENT ORDER ERROR =====');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    // Check if Razorpay credentials are set
    if (!RAZORPAY_KEY_ID || RAZORPAY_KEY_ID === 'YOUR_KEY_ID') {
      console.error('⚠️ RAZORPAY_KEY_ID is not set!');
    }
    if (!RAZORPAY_KEY_SECRET || RAZORPAY_KEY_SECRET === 'YOUR_KEY_SECRET') {
      console.error('⚠️ RAZORPAY_KEY_SECRET is not set!');
    }
    
    // Check if it's a Razorpay API error
    if (error.error) {
      console.error('Razorpay API Error:', error.error);
      console.error('Razorpay Error Description:', error.error.description);
      console.error('Razorpay Error Code:', error.error.code);
    }
    
    console.error('=====================================\n');
    
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      razorpayError: error.error ? {
        description: error.error.description,
        code: error.error.code
      } : undefined
    });
  }
});

// Payment Success Callback - Redirect URL (Razorpay se yahan redirect hoga)
app.get('/api/payment/success', async (req, res) => {
  try {
    // IMPORTANT: Log immediately - even before parsing
    console.log('\n🎉 ===== PAYMENT SUCCESS CALLBACK RECEIVED =====');
    console.log('📥 Full URL:', req.url);
    console.log('📥 Query String:', req.query);
    console.log('📥 All Query Params:', JSON.stringify(req.query, null, 2));
    
    // Razorpay callback parameters
    const razorpay_order_id = req.query.razorpay_order_id || req.query['razorpay_order_id'];
    const razorpay_payment_id = req.query.razorpay_payment_id || req.query['razorpay_payment_id'];
    const razorpay_signature = req.query.razorpay_signature || req.query['razorpay_signature'];
    const user_id = req.query.user_id || req.query['user_id'];

    console.log('🆔 Razorpay Order ID:', razorpay_order_id || 'NOT_PROVIDED');
    console.log('💳 Razorpay Payment ID:', razorpay_payment_id || 'NOT_PROVIDED');
    console.log('👤 User ID:', user_id || 'NOT_PROVIDED');

    // Verify Razorpay signature
    let paymentVerified = false;
    let orderInfo = null;
    let orderId = razorpay_order_id;
    let userId = user_id;

    if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      // Verify signature
      const text = razorpay_order_id + '|' + razorpay_payment_id;
      const generatedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(text)
        .digest('hex');

      if (generatedSignature === razorpay_signature) {
        paymentVerified = true;
        console.log('✅ Razorpay signature verified');
      } else {
        console.log('❌ Razorpay signature verification failed');
      }
    }

    // Get order info from stored data
    if (razorpay_order_id) {
      orderInfo = walletBalances[razorpay_order_id];
      if (orderInfo) {
        userId = userId || orderInfo.userId;
      }
    }
    
    // Agar abhi bhi nahi mila, to user_id se latest PENDING order find karein
    if (!orderInfo && userId) {
      console.log('⚠️ Searching for latest PENDING order by user_id...');
      const foundOrder = Object.entries(walletBalances).find(
        ([id, order]) => order.userId === userId && order.status === 'PENDING'
      );
      if (foundOrder) {
        orderInfo = foundOrder[1];
        orderId = foundOrder[0];
        console.log(`✅ Found order by user_id: ${orderId}`);
      }
    }

    // Verify payment with Razorpay API
    let orderAmount = 0;
    if (razorpay_payment_id && paymentVerified) {
      try {
        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        if (payment.status === 'captured' || payment.status === 'authorized') {
          paymentVerified = true;
          orderAmount = parseFloat(payment.amount) / 100; // Convert from paise to rupees
          console.log(`💰 Razorpay Amount (from API): ₹${orderAmount}`);
          
          // Update order info if not found
          if (!orderInfo && payment.order_id) {
            orderId = payment.order_id;
            orderInfo = walletBalances[orderId];
          }
        }
      } catch (apiError) {
        console.log('⚠️ Could not verify with Razorpay API:', apiError.message);
      }
    }

    // Get amount from stored order if not available
    if (!orderAmount && orderInfo) {
      orderAmount = parseFloat(orderInfo.amount);
    }

    userId = userId || (orderInfo ? orderInfo.userId : null);

    if (!orderId && !userId) {
      console.log('❌ No order ID or user ID found');
      return res.status(400).send(`
        <html>
        <body>
          <h1>Error: Order ID and User ID not found</h1>
          <p>Please contact support.</p>
        </body>
        </html>
      `);
    }

    const isPaymentSuccess = paymentVerified && orderAmount > 0;
    
    console.log('✅ Payment Success Check:', {
      paymentVerified,
      orderId: orderId || 'NOT_PROVIDED',
      orderInfo: !!orderInfo,
      isPaymentSuccess
    });
    
    // Update wallet balance (only if payment verified and not already updated by webhook)
    if (isPaymentSuccess && userId) {
      // IMPORTANT: Check if transaction already exists (webhook might have already updated)
      const existingTransaction = walletBalances[userId] ? 
        walletBalances[userId].transactions.find(
          t => (t.orderId === orderId || t.paymentId === razorpay_payment_id) && t.status === 'SUCCESS'
        ) : null;
      
      if (!existingTransaction) {
        // Initialize balance if user doesn't exist
        if (!walletBalances[userId]) {
          walletBalances[userId] = { balance: 0, transactions: [] };
        }

        // IMPORTANT: Agar orderAmount 0 hai, to orderInfo se amount lein
        const finalAmount = orderAmount > 0 ? orderAmount : (orderInfo ? parseFloat(orderInfo.amount) : 0);
        
        if (finalAmount > 0) {
          // Update balance - actual payment amount use karein
          walletBalances[userId].balance += finalAmount;
          walletBalances[userId].transactions.push({
            orderId: orderId,
            paymentId: razorpay_payment_id,
            amount: finalAmount,
            type: 'CREDIT',
            status: 'SUCCESS',
            timestamp: new Date(),
            source: 'callback'
          });

          console.log(`✅ Balance updated via callback: +₹${finalAmount}`);
          console.log(`💰 New Balance: ${walletBalances[userId].balance}`);
          
          orderAmount = finalAmount; // Update orderAmount for redirect
        } else {
          console.log('⚠️ Amount is 0, cannot update balance');
        }

        // Mark order as completed
        if (orderId && walletBalances[orderId]) {
          walletBalances[orderId].status = 'COMPLETED';
          if (razorpay_payment_id) {
            walletBalances[orderId].razorpayPaymentId = razorpay_payment_id;
          }
        }
      } else if (existingTransaction) {
        console.log('⚠️ Transaction already processed by webhook, skipping callback update');
        // Balance already updated by webhook, use that balance
        orderAmount = existingTransaction.amount;
      }

      // Redirect to app with success message
      // App ka deep link - order info se ya query param se
      const appRedirectUrl = req.query.app_redirect || (orderInfo ? orderInfo.appRedirectUrl : null) || APP_DEEP_LINK;
      
      console.log('🔗 App Redirect URL:', appRedirectUrl);
      
      // IMPORTANT FIX: Deep link URL properly format karein
      const actualAmount = orderAmount || 0;
      const currentBalance = walletBalances[userId]?.balance || 0;
      const deepLinkParams = new URLSearchParams({
        order_id: orderId || '',
        payment_id: razorpay_payment_id || '',
        status: 'success',
        amount: actualAmount.toString(),
        user_id: userId || '',
        balance: currentBalance.toString()
      });
      
      console.log('🔗 Deep Link Params:', {
        order_id: orderId,
        payment_id: razorpay_payment_id,
        amount: actualAmount,
        user_id: userId,
        balance: currentBalance
      });
      
      const redirectUrl = `${appRedirectUrl}?${deepLinkParams.toString()}`;
      
      // Android Intent URL (better for automatic redirect)
      // Package name: com.example.equityapp
      const androidIntentUrl = `intent://payment-success?${deepLinkParams.toString()}#Intent;scheme=equityapp;package=${APP_PACKAGE_NAME};S.browser_fallback_url=${encodeURIComponent(redirectUrl)};end`;
      
      console.log('✅ Payment Verified: SUCCESS');
      console.log('💰 Amount:', orderAmount);
      console.log('💵 Updated Balance:', walletBalances[userId]?.balance || orderAmount);
      console.log('🔗 Deep Link:', redirectUrl);
      console.log('📱 Android Intent:', androidIntentUrl);
      console.log('🚀 Redirecting to app...');
      console.log('=====================================\n');
      
      // HTML page with AGGRESSIVE redirect methods
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Success</title>
          <meta http-equiv="refresh" content="1;url=${redirectUrl}">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script>
            // IMMEDIATE redirect - before page fully loads
            (function() {
              const deepLink = "${redirectUrl}";
              const androidIntent = "${androidIntentUrl}";
              
              console.log('🚀 IMMEDIATE redirect starting...');
              
              // Try immediately
              if (/Android/i.test(navigator.userAgent)) {
                try {
                  window.location.href = androidIntent;
                  console.log('✅ Android Intent triggered');
                } catch(e) {
                  console.log('⚠️ Intent failed, trying deep link');
                  window.location.href = deepLink;
                }
              } else {
                window.location.href = deepLink;
              }
            })();
          </script>
          <script>
            (function() {
              // Function to detect Android
              function isAndroid() {
                return /Android/i.test(navigator.userAgent);
              }
              
              // Function to detect iOS
              function isIOS() {
                return /iPhone|iPad|iPod/i.test(navigator.userAgent);
              }
              
              const deepLink = "${redirectUrl}";
              const androidIntent = "${androidIntentUrl}";
              
              // AGGRESSIVE REDIRECT - Multiple methods
              function tryOpenApp() {
                if (isAndroid()) {
                  // Method 1: Android Intent (best for automatic)
                  try {
                    window.location.replace(androidIntent);
                  } catch(e) {
                    console.log('Intent failed, trying deep link');
                  }
                  
                  // Method 2: Direct deep link
                  setTimeout(function() {
                    try {
                      window.location.replace(deepLink);
                    } catch(e) {
                      console.log('Deep link failed');
                    }
                  }, 100);
                  
                  // Method 3: window.location.href
                  setTimeout(function() {
                    try {
                      window.location.href = deepLink;
                    } catch(e) {
                      console.log('Href failed');
                    }
                  }, 300);
                  
                } else if (isIOS()) {
                  // iOS - try deep link
                  window.location.replace(deepLink);
                  setTimeout(function() {
                    window.location.href = deepLink;
                  }, 100);
                } else {
                  // Desktop/Other
                  window.location.href = deepLink;
                }
              }
              
              // Try IMMEDIATELY on page load
              tryOpenApp();
              
              // Try again after 100ms
              setTimeout(tryOpenApp, 100);
              
              // Try again after 500ms
              setTimeout(tryOpenApp, 500);
              
              // Try again after 1 second
              setTimeout(tryOpenApp, 1000);
              
              // Try again after 2 seconds
              setTimeout(tryOpenApp, 2000);
              
              // Try again after 3 seconds
              setTimeout(tryOpenApp, 3000);
              
              // Try again after 5 seconds (last attempt)
              setTimeout(tryOpenApp, 5000);
            })();
          </script>
          <style>
            #openAppBtn:hover {
              transform: scale(1.05);
              transition: transform 0.2s;
            }
            #openAppBtn:active {
              transform: scale(0.95);
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center;">
          <div style="background: white; padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 400px; margin: 20px;">
            <div style="font-size: 60px; margin-bottom: 20px;">✅</div>
            <h1 style="color: #28a745; margin: 0 0 10px 0; font-size: 24px;">Payment Successful!</h1>
            <p style="font-size: 32px; color: #333; margin: 15px 0; font-weight: bold;">₹${actualAmount}</p>
            <p style="color: #666; margin: 5px 0; font-size: 14px;">Order ID: ${orderId || 'N/A'}</p>
            <p style="color: #666; margin: 5px 0; font-size: 14px;">Payment ID: ${razorpay_payment_id || 'N/A'}</p>
            <p style="color: #666; margin: 5px 0; font-size: 14px;">Balance: ₹${currentBalance}</p>
            <p style="color: #666; margin: 20px 0 10px 0; font-size: 14px;">Opening app...</p>
            
            <!-- Big Button for Manual Click -->
            <a href="${redirectUrl}" id="openAppBtn" onclick="openAppNow(); return false;" style="display: inline-block; margin-top: 20px; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); cursor: pointer;">
              Open App Now
            </a>
            
            <p style="color: #999; margin-top: 20px; font-size: 12px;">If app doesn't open automatically, tap the button above</p>
            <p style="color: #999; margin-top: 10px; font-size: 11px;">Deep Link: ${redirectUrl.substring(0, 50)}...</p>
            
            <script>
              // Function to open app - called from button and auto-redirect
              function openAppNow() {
                const deepLink = "${redirectUrl}";
                const androidIntent = "${androidIntentUrl}";
                
                console.log('🚀 Opening app...');
                console.log('Deep Link:', deepLink);
                console.log('Android Intent:', androidIntent);
                
                if (/Android/i.test(navigator.userAgent)) {
                  // Try Android Intent first (best for automatic redirect)
                  try {
                    window.location.href = androidIntent;
                  } catch(e) {
                    console.log('Intent failed, trying deep link');
                  }
                  // Fallback to deep link
                  setTimeout(function() {
                    try {
                      window.location.href = deepLink;
                    } catch(e) {
                      console.log('Deep link failed');
                    }
                  }, 300);
                } else {
                  window.location.href = deepLink;
                }
              }
              
              // Button click handler
              document.getElementById('openAppBtn').addEventListener('click', function(e) {
                e.preventDefault();
                openAppNow();
              });
              
              // Auto-redirect on page load (immediate)
              window.onload = function() {
                console.log('📱 Page loaded, starting auto-redirect...');
                setTimeout(openAppNow, 100);
              };
              
              // Also try immediately (before window.onload)
              setTimeout(openAppNow, 50);
              
              // Handle browser back button - redirect to app
              window.addEventListener('popstate', function(event) {
                console.log('🔙 Back button pressed, redirecting to app...');
                openAppNow();
              });
              
              // Prevent back navigation - redirect to app instead
              // IMPORTANT: Prevent going back to localtunnel password page
              // Add multiple entries to history to prevent going back to tunnel password
              history.pushState(null, null, location.href);
              history.pushState(null, null, location.href);
              
              window.onpopstate = function(event) {
                console.log('🔙 Back button detected, redirecting to app...');
                // Immediately redirect to app, don't go back
                openAppNow();
                // Prevent default back behavior - push state again
                history.pushState(null, null, location.href);
                // Try redirect again after a short delay
                setTimeout(openAppNow, 100);
              };
              
              // Also intercept back button via keydown (for mobile)
              document.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' || e.keyCode === 8) {
                  e.preventDefault();
                  console.log('🔙 Backspace key detected, redirecting to app...');
                  openAppNow();
                }
              });
              
              // Handle visibility change - if page becomes visible again, redirect
              document.addEventListener('visibilitychange', function() {
                if (!document.hidden) {
                  console.log('📱 Page visible again, redirecting to app...');
                  setTimeout(openAppNow, 100);
                }
              });
              
              // Prevent any navigation away from this page
              window.addEventListener('beforeunload', function(e) {
                console.log('📱 Page unloading, ensuring app redirect...');
                // Don't prevent, but ensure redirect happens
                openAppNow();
              });
            </script>
          </div>
        </body>
        </html>
      `);
    } else {
      // Payment failed or pending
      const appRedirectUrl = req.query.app_redirect || (orderInfo ? orderInfo.appRedirectUrl : null) || 'equityapp://payment-failed';
      const failedRedirectUrl = `${appRedirectUrl}?order_id=${orderId || ''}&status=failed&user_id=${userId || ''}`;
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Failed</title>
          <meta http-equiv="refresh" content="1;url=${failedRedirectUrl}">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center;">
          <div style="background: white; padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 400px;">
            <div style="font-size: 60px; margin-bottom: 20px;">❌</div>
            <h1 style="color: #dc3545; margin: 0 0 10px 0;">Payment Failed</h1>
            <p style="color: #666; margin: 5px 0; font-size: 14px;">Order ID: ${orderId || 'N/A'}</p>
            <p style="color: #666; margin: 20px 0 0 0; font-size: 14px;">Redirecting to app...</p>
            <a href="${failedRedirectUrl}" style="display: inline-block; margin-top: 20px; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 25px; font-weight: bold;">Open App</a>
          </div>
          <script>
            window.location.href = "${failedRedirectUrl}";
            setTimeout(function() {
              window.location.href = "${failedRedirectUrl}";
            }, 1000);
          </script>
        </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('Error in payment success callback:', error.response?.data || error.message);
    res.status(500).send(`
      <html>
      <body>
        <h1>Error Processing Payment</h1>
        <p>${error.message}</p>
      </body>
      </html>
    `);
  }
});

// Payment Webhook - Razorpay will call this automatically
app.post('/api/payment/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    const webhookSignature = req.headers['x-razorpay-signature'];
    
    console.log('\n📡 ===== WEBHOOK RECEIVED =====');
    console.log('📦 Webhook Data:', JSON.stringify(webhookData, null, 2));
    console.log('🔐 Webhook Signature:', webhookSignature || 'NOT_PROVIDED');

    // Verify webhook signature
    if (RAZORPAY_WEBHOOK_SECRET && webhookSignature) {
      const text = JSON.stringify(webhookData);
      const generatedSignature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(text)
        .digest('hex');

      if (generatedSignature !== webhookSignature) {
        console.log('❌ Webhook signature verification failed');
        return res.status(400).json({ success: false, message: 'Invalid signature' });
      }
      console.log('✅ Webhook signature verified');
    }

    // Razorpay webhook format
    // Format: { event: 'payment.captured', payload: { payment: { entity: { id, order_id, amount, status } } } }
    const event = webhookData.event;
    const paymentEntity = webhookData.payload?.payment?.entity;
    
    if (!paymentEntity) {
      console.log('⚠️ No payment entity in webhook');
      return res.status(200).json({ success: true, message: 'Webhook received but no payment data' });
    }

    const razorpayPaymentId = paymentEntity.id;
    const razorpayOrderId = paymentEntity.order_id;
    const paymentAmount = paymentEntity.amount; // Amount in paise
    const paymentStatus = paymentEntity.status;
    const paymentNotes = paymentEntity.notes || {};

    console.log('🔍 Extracted from webhook:');
    console.log('  Event:', event);
    console.log('  Payment ID:', razorpayPaymentId);
    console.log('  Order ID:', razorpayOrderId);
    console.log('  Amount (paise):', paymentAmount);
    console.log('  Payment Status:', paymentStatus);
    console.log('  Notes:', paymentNotes);

    // Process payment.captured event
    if (event === 'payment.captured' && paymentStatus === 'captured' && razorpayOrderId) {
      const orderInfo = walletBalances[razorpayOrderId];
      const userId = paymentNotes.userId || (orderInfo ? orderInfo.userId : null);
      
      // IMPORTANT: Webhook amount use karein (actual payment amount in paise)
      const amount = parseFloat(paymentAmount) / 100; // Convert from paise to rupees
      
      console.log('💰 Amount to credit:', amount);
      console.log('   Webhook amount (paise):', paymentAmount);
      console.log('   Stored order amount:', orderInfo?.amount);
      console.log('   Using webhook amount for balance update');

      if (userId && amount > 0) {
        // Only update if not already completed
        if (!orderInfo || orderInfo.status !== 'COMPLETED') {
          // Initialize balance if user doesn't exist
          if (!walletBalances[userId]) {
            walletBalances[userId] = { balance: 0, transactions: [] };
          }

          // Check if this transaction already exists
          const existingTransaction = walletBalances[userId].transactions.find(
            t => (t.orderId === razorpayOrderId || t.paymentId === razorpayPaymentId) && t.status === 'SUCCESS'
          );

          if (!existingTransaction) {
            // IMPORTANT: Ensure balance is a number
            if (typeof walletBalances[userId].balance !== 'number') {
              walletBalances[userId].balance = 0;
            }
            
            // Update balance
            walletBalances[userId].balance = (walletBalances[userId].balance || 0) + amount;
            walletBalances[userId].transactions.push({
              orderId: razorpayOrderId,
              paymentId: razorpayPaymentId,
              amount: amount,
              type: 'CREDIT',
              status: 'SUCCESS',
              timestamp: new Date(),
              source: 'webhook'
            });

            console.log(`✅ Balance updated for user ${userId}: +₹${amount}`);
            console.log(`📝 Razorpay Order ID: ${razorpayOrderId}`);
            console.log(`📝 Razorpay Payment ID: ${razorpayPaymentId}`);
            console.log('💰 New Balance:', walletBalances[userId].balance);
            console.log('📊 Balance type:', typeof walletBalances[userId].balance);
            console.log('📦 Full wallet data:', JSON.stringify(walletBalances[userId], null, 2));
            
            // IMPORTANT: Save balance to Firestore via Flutter app API call
            // Note: Flutter app will sync this to Firestore when it calls the balance API
            // For now, balance is stored in memory and will be synced
            console.log('💾 Balance stored in backend. Flutter app will sync to Firestore.');
            console.log('=====================================\n');
          } else {
            console.log('⚠️ Transaction already processed, skipping...');
            console.log('💰 Current Balance:', walletBalances[userId].balance);
          }

          // Mark order as completed
          if (orderInfo) {
            walletBalances[razorpayOrderId].status = 'COMPLETED';
            walletBalances[razorpayOrderId].razorpayPaymentId = razorpayPaymentId;
          }
        }
      }
    } else {
      console.log(`⚠️ Event ${event} with status ${paymentStatus} - not processing`);
    }

    res.status(200).json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed', error: error.message });
  }
});

// Manual Payment Status Check - Agar callback nahi aaya, to manually check karein
app.post('/api/payment/check-status', async (req, res) => {
  try {
    const { userId, orderId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
    }
    
    console.log('\n🔍 ===== MANUAL PAYMENT STATUS CHECK =====');
    console.log('👤 User ID:', userId);
    console.log('🆔 Order ID:', orderId || 'NOT_PROVIDED');
    
    // Latest PENDING order find karein
    let latestOrder = null;
    let latestOrderId = null;
    
    if (orderId) {
      latestOrder = walletBalances[orderId];
      latestOrderId = orderId;
    } else {
      // Find latest PENDING order for this user
      let latestTime = 0;
      for (const [storedOrderId, storedOrder] of Object.entries(walletBalances)) {
        if (storedOrder.userId === userId && storedOrder.status === 'PENDING' && storedOrder.createdAt) {
          const orderTime = new Date(storedOrder.createdAt).getTime();
          if (orderTime > latestTime) {
            latestTime = orderTime;
            latestOrder = storedOrder;
            latestOrderId = storedOrderId;
          }
        }
      }
    }
    
    if (!latestOrder) {
      return res.json({
        success: false,
        message: 'No pending order found',
        balance: walletBalances[userId]?.balance || 0
      });
    }
    
    // Check if order is already completed
    if (latestOrder.status === 'COMPLETED') {
      return res.json({
        success: true,
        message: 'Order already completed',
        orderId: latestOrderId,
        balance: walletBalances[userId]?.balance || 0
      });
    }
    
    // Try to verify with Razorpay API
    try {
      const orderDetails = await razorpay.orders.fetch(latestOrderId);
      
      if (orderDetails && orderDetails.status === 'paid') {
        // Get payment details
        const payments = await razorpay.orders.fetchPayments(latestOrderId);
        const successfulPayment = payments.items.find(p => p.status === 'captured');
        
        if (successfulPayment) {
          // Payment successful - update balance
          const amount = parseFloat(successfulPayment.amount) / 100; // Convert from paise to rupees
          
          if (!walletBalances[userId]) {
            walletBalances[userId] = { balance: 0, transactions: [] };
          }
          
          // Check if already processed
          const existingTransaction = walletBalances[userId].transactions.find(
            t => (t.orderId === latestOrderId || t.paymentId === successfulPayment.id) && t.status === 'SUCCESS'
          );
          
          if (!existingTransaction) {
            walletBalances[userId].balance += amount;
            walletBalances[userId].transactions.push({
              orderId: latestOrderId,
              paymentId: successfulPayment.id,
              amount: amount,
              type: 'CREDIT',
              status: 'SUCCESS',
              timestamp: new Date(),
              source: 'manual_check'
            });
            
            latestOrder.status = 'COMPLETED';
            
            console.log(`✅ Balance updated via manual check: +₹${amount}`);
            console.log(`💰 New Balance: ${walletBalances[userId].balance}`);
          }
          
          return res.json({
            success: true,
            message: 'Payment verified and balance updated',
            orderId: latestOrderId,
            paymentId: successfulPayment.id,
            amount: amount,
            balance: walletBalances[userId].balance
          });
        }
      }
      
      return res.json({
        success: false,
        message: 'Payment not completed yet',
        orderStatus: orderDetails?.status || 'UNKNOWN',
        balance: walletBalances[userId]?.balance || 0
      });
    } catch (apiError) {
      console.log('⚠️ Could not verify with Razorpay API:', apiError.message);
      return res.json({
        success: false,
        message: 'Could not verify payment status',
        error: apiError.message,
        balance: walletBalances[userId]?.balance || 0
      });
    }
  } catch (error) {
    console.error('Error in manual payment status check:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status',
      error: error.message
    });
  }
});

// Get Wallet Balance API - IMPORTANT: Firestore se bhi sync karein
app.get('/api/wallet/balance/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const firestoreBalance = parseFloat(req.query.firestoreBalance || 0);

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
    }

    console.log('\n💰 ===== WALLET BALANCE REQUEST =====');
    console.log('👤 User ID:', userId);
    console.log('📊 All wallet balances:', Object.keys(walletBalances));
    console.log('💾 Firestore Balance:', firestoreBalance);
    
    // Get user balance from memory
    const userWallet = walletBalances[userId];
    let balance = 0;
    
    if (userWallet && typeof userWallet.balance === 'number') {
      balance = userWallet.balance;
      console.log('📦 User wallet data (memory):', JSON.stringify(userWallet, null, 2));
      console.log('💰 Memory Balance:', balance);
    } else {
      // Initialize with 0 if user doesn't exist in memory
      walletBalances[userId] = { balance: 0, transactions: [] };
      console.log('📦 User wallet data: NOT_FOUND in memory (initialized to 0)');
    }
    
    // IMPORTANT: Firestore se balance sync karein (agar available ho)
    if (firestoreBalance > 0) {
      console.log('💾 Firestore Balance received:', firestoreBalance);
      
      // Agar Firestore balance zyada hai, to use karein (kyunki Firestore persistent hai)
      if (firestoreBalance > balance) {
        console.log('🔄 Syncing balance from Firestore to memory...');
        balance = firestoreBalance;
        if (!walletBalances[userId]) {
          walletBalances[userId] = { balance: 0, transactions: [] };
        }
        walletBalances[userId].balance = balance;
        console.log('✅ Balance synced from Firestore:', balance);
      } else if (balance > firestoreBalance) {
        // Agar memory balance zyada hai, to Firestore update karein (Flutter app se)
        console.log('⚠️ Memory balance > Firestore balance. Flutter app should sync to Firestore.');
      }
    }
    
    const transactions = userWallet?.transactions || [];
    
    console.log('💰 Final Balance:', balance);
    console.log('📋 Transactions count:', transactions.length);
    console.log('=====================================\n');

    res.json({
      success: true,
      userId: userId,
      balance: balance,
      currency: 'INR',
      transactions: transactions
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet balance',
      error: error.message
    });
  }
});

// Get All Transactions for a User
app.get('/api/wallet/transactions/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const userWallet = walletBalances[userId];

    if (!userWallet) {
      return res.json({
        success: true,
        userId: userId,
        transactions: []
      });
    }

    res.json({
      success: true,
      userId: userId,
      transactions: userWallet.transactions || []
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  const publicUrl = process.env.RENDER_EXTERNAL_URL || process.env.RENDER_URL || 'http://localhost:' + PORT;
  console.log('\n🚀 ====================================');
  console.log('✅ SERVER STARTED SUCCESSFULLY!');
  console.log('====================================');
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log(`📡 Public: ${publicUrl}`);
  console.log('\n📋 API Endpoints:');
  console.log(`   POST   /api/payment/create-order - Create payment order`);
  console.log(`   GET    /api/payment/success - Payment success callback`);
  console.log(`   POST   /api/payment/webhook - Razorpay webhook`);
  console.log(`   GET    /api/wallet/balance/:userId - Get wallet balance`);
  console.log(`   GET    /api/wallet/transactions/:userId - Get transactions`);
  console.log('\n📋 Razorpay Dashboard URLs:');
  console.log(`   Return URL: ${publicUrl}/api/payment/success`);
  console.log(`   Webhook URL: ${publicUrl}/api/payment/webhook`);
  console.log('\n👀 Waiting for payment requests...');
  console.log('💡 Payment karein - logs yahan dikhenge!\n');
  console.log('====================================\n');
});


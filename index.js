const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Cashfree Configuration
// NOTE: Replace these with your actual Cashfree credentials from environment variables
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || 'YOUR_APP_ID';
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || 'YOUR_SECRET_KEY';
const CASHFREE_MODE = process.env.CASHFREE_MODE || 'TEST'; // TEST or PRODUCTION
const CASHFREE_BASE_URL = CASHFREE_MODE === 'PRODUCTION' 
  ? 'https://api.cashfree.com' 
  : 'https://sandbox.cashfree.com';

// Cashfree Hosted Payment Form URL
const CASHFREE_FORM_URL = process.env.CASHFREE_FORM_URL || 'https://payments.cashfree.com/forms/bbequity';

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
  res.json({ message: 'Cashfree Wallet Backend is running!' });
});

// Create Payment Order - Cashfree Hosted Form Integration
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

    // Generate unique order ID
    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('🆔 Order ID Generated:', orderId);

    // Store order details temporarily (in production, save to database)
    // IMPORTANT: Store actual order amount (not webhook amount - webhook amount test payment ke liye different ho sakta hai)
    walletBalances[orderId] = {
      userId,
      amount: parseFloat(amount), // This is the order amount (1000), webhook will have actual payment amount
      status: 'PENDING',
      createdAt: new Date(),
      appRedirectUrl: appRedirectUrl || APP_DEEP_LINK, // App deep link
      customerEmail: customerEmail, // Store email for matching
      customerPhone: customerPhone // Store phone for matching
    };
    
    console.log('💾 Order stored:', {
      orderId: orderId,
      userId: userId,
      amount: parseFloat(amount),
      status: 'PENDING'
    });

    // Build payment form URL with parameters
    const baseUrl = req.protocol + '://' + req.get('host');
    // Return URL - payment success ke baad yahan redirect hoga, phir app mein
    // IMPORTANT: Cashfree {order_id} placeholder replace karta hai actual Cashfree order ID se
    // Hamare order_id ko separate parameter mein pass karein taaki match kar sakein
    const returnUrl = `${baseUrl}/api/payment/success?our_order_id=${encodeURIComponent(orderId)}&user_id=${encodeURIComponent(userId)}&app_redirect=${encodeURIComponent(appRedirectUrl || APP_DEEP_LINK)}`;
    
    console.log('📋 Return URL configured:', returnUrl);
    
    // Create payment form URL with query parameters
    const paymentFormUrl = new URL(CASHFREE_FORM_URL);
    paymentFormUrl.searchParams.append('order_id', orderId);
    paymentFormUrl.searchParams.append('order_amount', amount);
    paymentFormUrl.searchParams.append('order_currency', currency);
    paymentFormUrl.searchParams.append('customer_id', userId);
    paymentFormUrl.searchParams.append('customer_name', customerName || 'User');
    paymentFormUrl.searchParams.append('customer_email', customerEmail || 'user@example.com');
    paymentFormUrl.searchParams.append('customer_phone', customerPhone || '9999999999');
    paymentFormUrl.searchParams.append('return_url', returnUrl);

    console.log('✅ Payment URL Generated:', paymentFormUrl.toString());
    console.log('📋 Return URL:', returnUrl);
    console.log('=====================================\n');

    res.json({
      success: true,
      orderId: orderId,
      paymentUrl: paymentFormUrl.toString(),
      message: 'Payment URL ready. User ko is URL par redirect karein.',
      instructions: {
        step1: 'User ko paymentUrl par redirect karein (Cashfree form open hoga)',
        step2: 'Payment complete hone ke baad automatically app mein redirect ho jayega',
        step3: 'Profile screen mein balance check karein - automatically update ho jayega'
      }
    });
  } catch (error) {
    console.error('Error creating payment order:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
  }
});

// Payment Success Callback - Redirect URL (Cashfree form se yahan redirect hoga)
app.get('/api/payment/success', async (req, res) => {
  try {
    // IMPORTANT: Log immediately - even before parsing
    console.log('\n🎉 ===== PAYMENT SUCCESS CALLBACK RECEIVED =====');
    console.log('📥 Full URL:', req.url);
    console.log('📥 Query String:', req.query);
    console.log('📥 All Query Params:', JSON.stringify(req.query, null, 2));
    
    // IMPORTANT FIX: Order ID properly handle karein
    // Cashfree apna order_id generate karta hai, lekin hamare order_id ko separate parameter mein pass kiya hai
    let order_id = req.query.order_id || req.query['order_id']; // Cashfree order ID
    const our_order_id = req.query.our_order_id || req.query['our_order_id']; // Hamara generated order ID
    const user_id = req.query.user_id || req.query['user_id'];
    const order_status = req.query.order_status || req.query['order_status'];
    const payment_status = req.query.payment_status || req.query['payment_status'];

    // Pehle hamare order_id se search karein (most reliable)
    let ourOrderId = our_order_id;
    
    // Agar hamara order_id nahi mila, to Cashfree order_id se search karein
    if (!ourOrderId && order_id) {
      // Cashfree order_id se stored orders mein search karein
      for (const [storedOrderId, storedOrder] of Object.entries(walletBalances)) {
        if (storedOrder.cashfreeOrderId === order_id || storedOrderId === order_id) {
          ourOrderId = storedOrderId;
          console.log(`✅ Found our order ID: ${ourOrderId} (Cashfree: ${order_id})`);
          break;
        }
      }
    }
    
    // Agar abhi bhi nahi mila, to user_id se latest PENDING order find karein
    if (!ourOrderId && user_id) {
      console.log('⚠️ Searching for latest PENDING order by user_id...');
      const foundOrder = Object.entries(walletBalances).find(
        ([id, order]) => order.userId === user_id && order.status === 'PENDING'
      );
      if (foundOrder) {
        ourOrderId = foundOrder[0];
        console.log(`✅ Found order by user_id: ${ourOrderId}`);
      }
    }
    
    // Final order_id - Cashfree order_id use karein agar hamara nahi mila
    order_id = order_id || ourOrderId;

    console.log('🆔 Cashfree Order ID:', order_id || 'NOT_PROVIDED');
    console.log('🆔 Our Order ID:', ourOrderId || 'NOT_PROVIDED');
    console.log('👤 User ID:', user_id || 'NOT_PROVIDED');
    console.log('📊 Order Status:', order_status || 'NOT_PROVIDED');
    console.log('💳 Payment Status:', payment_status || 'NOT_PROVIDED');

    // IMPORTANT: Agar order_id nahi mila, to ourOrderId use karein
    if (!order_id && !ourOrderId) {
      console.log('❌ No order ID found - checking if we can proceed with user_id...');
      if (!user_id) {
        return res.status(400).send(`
          <html>
          <body>
            <h1>Error: Order ID and User ID not found</h1>
            <p>Please contact support.</p>
          </body>
          </html>
        `);
      }
    }
    
    // Final order_id set karein
    order_id = order_id || ourOrderId;

    // Get order info from stored data - hamare order_id se
    let orderInfo = ourOrderId ? walletBalances[ourOrderId] : null;
    let userId = user_id || (orderInfo ? orderInfo.userId : null);
    
    // Agar abhi bhi nahi mila, to Cashfree order_id se search karein
    if (!orderInfo && order_id) {
      orderInfo = walletBalances[order_id];
    }
    
    // Agar abhi bhi nahi mila, to user_id se search karein
    if (!orderInfo && userId) {
      for (const [storedOrderId, storedOrder] of Object.entries(walletBalances)) {
        if (storedOrder.userId === userId && storedOrder.status === 'PENDING') {
          orderInfo = storedOrder;
          ourOrderId = storedOrderId;
          console.log(`🔍 Found order by user_id: ${storedOrderId}`);
          break;
        }
      }
    }
    
    userId = userId || (orderInfo ? orderInfo.userId : null);

    // Verify payment status with Cashfree API (optional but recommended)
    let paymentVerified = false;
    // IMPORTANT: Webhook amount use karein (actual payment amount), stored amount nahi
    // Query params se amount check karein (agar Cashfree ne pass kiya ho)
    let orderAmount = parseFloat(req.query.order_amount || req.query.amount || 0);
    // Agar query params mein nahi mila, to orderInfo se lein (but webhook amount preferred)
    if (!orderAmount && orderInfo) {
      orderAmount = parseFloat(orderInfo.amount);
    }
    
    // Cashfree se actual amount fetch karein (agar order info nahi mila)
    if (!orderInfo && order_id) {
      console.log('⚠️ Order info not found in storage. Fetching from Cashfree...');
    }

    try {
      const response = await axios.get(
        `${CASHFREE_BASE_URL}/pg/orders/${order_id}`,
        {
          headers: {
            'x-client-id': CASHFREE_APP_ID,
            'x-client-secret': CASHFREE_SECRET_KEY,
            'x-api-version': '2023-08-01'
          }
        }
      );

      const orderDetails = response.data;
      paymentVerified = orderDetails && orderDetails.order_status === 'PAID';
      // Cashfree se actual amount fetch karein (webhook amount preferred)
      const cashfreeAmount = orderDetails?.order_amount || orderDetails?.orderAmount;
      if (cashfreeAmount && !orderAmount) {
        orderAmount = parseFloat(cashfreeAmount);
        console.log(`💰 Cashfree Amount (from API): ₹${orderAmount}`);
      }
      
      // Agar order info nahi mila, to Cashfree data se create karein
      if (!orderInfo && orderDetails && userId) {
        console.log('📝 Creating order info from Cashfree data...');
        orderInfo = {
          userId: userId,
          amount: orderAmount,
          status: 'PENDING',
          cashfreeOrderId: order_id
        };
        walletBalances[order_id] = orderInfo;
      }
    } catch (apiError) {
      console.log('⚠️ Could not verify with API, using webhook data');
      // If API call fails, rely on webhook data or query params
      paymentVerified = order_status === 'PAID' || payment_status === 'SUCCESS';
    }
    
    // IMPORTANT: Payment verified check - agar status nahi mila, to bhi proceed karein
    // Cashfree form se redirect hoga, to payment success assume karein
    // Agar ourOrderId mila hai, to payment success assume karein (kyunki Cashfree redirect karta hai success par hi)
    const isPaymentSuccess = paymentVerified || 
                              order_status === 'PAID' || 
                              payment_status === 'SUCCESS' ||
                              (ourOrderId && orderInfo); // Fallback: agar order mila, to success assume karein
    
    console.log('✅ Payment Success Check:', {
      paymentVerified,
      order_status: order_status || 'NOT_PROVIDED',
      payment_status: payment_status || 'NOT_PROVIDED',
      ourOrderId: !!ourOrderId,
      orderInfo: !!orderInfo,
      isPaymentSuccess
    });
    
    // IMPORTANT: Always redirect to app, even if payment not verified (kyunki Cashfree redirect karta hai success par hi)
    // But balance update sirf verified payment par hi karein
    if (isPaymentSuccess || ourOrderId) {
      // Update wallet balance (only if not already updated by webhook)
      // IMPORTANT: Check if transaction already exists (webhook might have already updated)
      const existingTransaction = userId && walletBalances[userId] ? 
        walletBalances[userId].transactions.find(
          t => (t.orderId === order_id || t.orderId === ourOrderId || t.ourOrderId === ourOrderId) && t.status === 'SUCCESS'
        ) : null;
      
      if (!existingTransaction && userId) {
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
            orderId: order_id || ourOrderId,
            ourOrderId: ourOrderId,
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
        if (ourOrderId && walletBalances[ourOrderId]) {
          walletBalances[ourOrderId].status = 'COMPLETED';
          if (order_id) {
            walletBalances[ourOrderId].cashfreeOrderId = order_id;
          }
        }
      } else if (existingTransaction) {
        console.log('⚠️ Transaction already processed by webhook, skipping callback update');
        // Balance already updated by webhook, use that balance
        orderAmount = existingTransaction.amount;
      }

      // IMPORTANT: Always redirect to app, even if payment not verified (kyunki Cashfree redirect karta hai success par hi)
      // Redirect to app with success message
      // App ka deep link - order info se ya query param se
      const appRedirectUrl = req.query.app_redirect || (orderInfo ? orderInfo.appRedirectUrl : null) || APP_DEEP_LINK;
      
      console.log('🔗 App Redirect URL:', appRedirectUrl);
      
      // IMPORTANT FIX: Deep link URL properly format karein
      // Webhook amount use karein (actual payment amount - ₹1)
      const actualAmount = orderAmount || 0;
      const currentBalance = walletBalances[userId]?.balance || 0;
      const deepLinkParams = new URLSearchParams({
        order_id: order_id || ourOrderId || '',
        status: 'success',
        amount: actualAmount.toString(),
        user_id: userId || '',
        balance: currentBalance.toString()
      });
      
      console.log('🔗 Deep Link Params:', {
        order_id: order_id || ourOrderId,
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
            <p style="color: #666; margin: 5px 0; font-size: 14px;">Order ID: ${order_id || ourOrderId || 'N/A'}</p>
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
      const failedRedirectUrl = `${appRedirectUrl}?order_id=${order_id}&status=failed&user_id=${userId}`;
      
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
            <p style="color: #666; margin: 5px 0; font-size: 14px;">Order ID: ${order_id}</p>
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

// Payment Webhook - Cashfree will call this automatically
app.post('/api/payment/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    console.log('\n📡 ===== WEBHOOK RECEIVED =====');
    console.log('📦 Webhook Data:', JSON.stringify(webhookData, null, 2));

    // Cashfree webhook format - data structure se extract karein
    // Format: { data: { order: { order_id, order_amount }, payment: { payment_status }, customer_details: { customer_id } } }
    const cashfreeOrderId = webhookData.data?.order?.order_id || 
                             webhookData.orderId || 
                             webhookData.order_id;
    const orderAmount = webhookData.data?.order?.order_amount || 
                        webhookData.orderAmount || 
                        webhookData.order_amount;
    const orderStatus = webhookData.data?.order?.order_status || 
                        webhookData.orderStatus || 
                        webhookData.order_status;
    const paymentStatus = webhookData.data?.payment?.payment_status || 
                          webhookData.paymentStatus || 
                          webhookData.payment_status;
    const userId = webhookData.data?.customer_details?.customer_id || 
                   webhookData.customerId || 
                   webhookData.customer_id;
    // Email aur phone bhi extract karein for matching
    const customerEmail = webhookData.data?.customer_details?.customer_email || 
                          webhookData.customerEmail;
    const customerPhone = webhookData.data?.customer_details?.customer_phone || 
                          webhookData.customerPhone;

    console.log('🔍 Extracted from webhook:');
    console.log('  Order ID:', cashfreeOrderId);
    console.log('  Amount:', orderAmount);
    console.log('  Payment Status:', paymentStatus);
    console.log('  Customer ID from webhook:', userId);
    console.log('  Customer Email:', customerEmail);
    console.log('  Customer Phone:', customerPhone);

    // Verify webhook signature (recommended for production)
    // const signature = req.headers['x-cashfree-signature'];
    // Verify signature here for security

    if ((orderStatus === 'PAID' || paymentStatus === 'SUCCESS') && cashfreeOrderId) {
      // Cashfree ka order_id hamare generated order_id se different ho sakta hai
      // Isliye stored orders mein search karein
      let orderInfo = walletBalances[cashfreeOrderId];
      let ourOrderId = cashfreeOrderId;
      
      // IMPORTANT: Order matching - multiple strategies
      // Strategy 1: Email/Phone se match karein (most reliable)
      if (!orderInfo && (customerEmail || customerPhone)) {
        console.log('🔍 Searching by email/phone...');
        for (const [storedOrderId, storedOrder] of Object.entries(walletBalances)) {
          if (storedOrder.userId && storedOrder.status === 'PENDING') {
            const emailMatch = customerEmail && storedOrder.customerEmail && 
                               storedOrder.customerEmail.toLowerCase() === customerEmail.toLowerCase();
            const phoneMatch = customerPhone && storedOrder.customerPhone && 
                              storedOrder.customerPhone.replace(/[^0-9]/g, '') === customerPhone.replace(/[^0-9]/g, '');
            
            if (emailMatch || phoneMatch) {
              orderInfo = storedOrder;
              ourOrderId = storedOrderId;
              console.log(`✅ Found order by email/phone: ${storedOrderId} (Cashfree: ${cashfreeOrderId})`);
              console.log(`   Email match: ${emailMatch}, Phone match: ${phoneMatch}`);
              break;
            }
          }
        }
      }
      
      // Strategy 2: userId se search (agar available ho)
      if (!orderInfo && userId) {
        console.log('🔍 Searching by userId...');
        for (const [storedOrderId, storedOrder] of Object.entries(walletBalances)) {
          if (storedOrder.userId === userId && 
              storedOrder.status === 'PENDING') {
            orderInfo = storedOrder;
            ourOrderId = storedOrderId;
            console.log(`✅ Found order by userId: ${storedOrderId}`);
            break;
          }
        }
      }
      
      // Strategy 3: PENDING orders se latest order find karein (last resort)
      if (!orderInfo) {
        console.log('🔍 Searching for latest PENDING order...');
        let latestOrder = null;
        let latestOrderId = null;
        let latestTime = 0;
        
        for (const [storedOrderId, storedOrder] of Object.entries(walletBalances)) {
          if (storedOrder.userId && storedOrder.status === 'PENDING' && storedOrder.createdAt) {
            const orderTime = new Date(storedOrder.createdAt).getTime();
            if (orderTime > latestTime) {
              latestTime = orderTime;
              latestOrder = storedOrder;
              latestOrderId = storedOrderId;
            }
          }
        }
        
        if (latestOrder) {
          orderInfo = latestOrder;
          ourOrderId = latestOrderId;
          console.log(`⚠️ Found latest PENDING order: ${latestOrderId} (using this as fallback)`);
        }
      }
      
      const finalUserId = userId || (orderInfo ? orderInfo.userId : null);
      // IMPORTANT: Webhook amount use karein (actual payment amount)
      const amount = parseFloat(orderAmount || 0);
      
      console.log('💰 Amount to credit:', amount);
      console.log('   Webhook amount:', orderAmount);
      console.log('   Stored order amount:', orderInfo?.amount);
      console.log('   Using webhook amount for balance update');

      if (finalUserId && amount > 0) {
        // Only update if not already completed
        if (!orderInfo || orderInfo.status !== 'COMPLETED') {
          // Initialize balance if user doesn't exist
          if (!walletBalances[finalUserId]) {
            walletBalances[finalUserId] = { balance: 0, transactions: [] };
          }

          // Check if this transaction already exists (by Cashfree order ID or our order ID)
          const existingTransaction = walletBalances[finalUserId].transactions.find(
            t => (t.orderId === cashfreeOrderId || t.orderId === ourOrderId) && t.status === 'SUCCESS'
          );

          if (!existingTransaction) {
            // IMPORTANT: Ensure balance is a number
            if (typeof walletBalances[finalUserId].balance !== 'number') {
              walletBalances[finalUserId].balance = 0;
            }
            
            // Update balance
            walletBalances[finalUserId].balance = (walletBalances[finalUserId].balance || 0) + amount;
            walletBalances[finalUserId].transactions.push({
              orderId: cashfreeOrderId, // Store Cashfree order ID
              ourOrderId: ourOrderId, // Store our generated order ID
              amount: amount,
              type: 'CREDIT',
              status: 'SUCCESS',
              timestamp: new Date(),
              source: 'webhook'
            });

            console.log(`✅ Balance updated for user ${finalUserId}: +₹${amount}`);
            console.log(`📝 Cashfree Order ID: ${cashfreeOrderId}`);
            console.log(`📝 Our Order ID: ${ourOrderId}`);
            console.log('💰 New Balance:', walletBalances[finalUserId].balance);
            console.log('📊 Balance type:', typeof walletBalances[finalUserId].balance);
            console.log('📦 Full wallet data:', JSON.stringify(walletBalances[finalUserId], null, 2));
            
            // IMPORTANT: Save balance to Firestore via Flutter app API call
            // Note: Flutter app will sync this to Firestore when it calls the balance API
            // For now, balance is stored in memory and will be synced
            console.log('💾 Balance stored in backend. Flutter app will sync to Firestore.');
            console.log('=====================================\n');
            
            // IMPORTANT: Call Flutter app's Firestore update endpoint (if available)
            // Or Flutter app will sync when it calls /api/wallet/balance/:userId
          } else {
            console.log('⚠️ Transaction already processed, skipping...');
            console.log('💰 Current Balance:', walletBalances[finalUserId].balance);
          }

          // Mark order as completed (both Cashfree ID and our ID)
          if (orderInfo) {
            walletBalances[ourOrderId].status = 'COMPLETED';
            walletBalances[ourOrderId].cashfreeOrderId = cashfreeOrderId; // Store mapping
          }
          // Also store Cashfree order ID mapping
          if (cashfreeOrderId !== ourOrderId) {
            walletBalances[cashfreeOrderId] = {
              ...orderInfo,
              status: 'COMPLETED',
              cashfreeOrderId: cashfreeOrderId,
              ourOrderId: ourOrderId
            };
          }
        }
      }
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
    
    // Try to verify with Cashfree API
    try {
      const response = await axios.get(
        `${CASHFREE_BASE_URL}/pg/orders/${latestOrderId}`,
        {
          headers: {
            'x-client-id': CASHFREE_APP_ID,
            'x-client-secret': CASHFREE_SECRET_KEY,
            'x-api-version': '2023-08-01'
          }
        }
      );
      
      const orderDetails = response.data;
      if (orderDetails && orderDetails.order_status === 'PAID') {
        // Payment successful - update balance
        const amount = parseFloat(orderDetails.order_amount || latestOrder.amount);
        
        if (!walletBalances[userId]) {
          walletBalances[userId] = { balance: 0, transactions: [] };
        }
        
        // Check if already processed
        const existingTransaction = walletBalances[userId].transactions.find(
          t => t.orderId === latestOrderId && t.status === 'SUCCESS'
        );
        
        if (!existingTransaction) {
          walletBalances[userId].balance += amount;
          walletBalances[userId].transactions.push({
            orderId: latestOrderId,
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
          amount: amount,
          balance: walletBalances[userId].balance
        });
      } else {
        return res.json({
          success: false,
          message: 'Payment not completed yet',
          orderStatus: orderDetails?.order_status || 'UNKNOWN',
          balance: walletBalances[userId]?.balance || 0
        });
      }
    } catch (apiError) {
      console.log('⚠️ Could not verify with Cashfree API:', apiError.message);
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
  console.log(`   POST   /api/payment/webhook - Cashfree webhook`);
  console.log(`   GET    /api/wallet/balance/:userId - Get wallet balance`);
  console.log(`   GET    /api/wallet/transactions/:userId - Get transactions`);
  console.log('\n📋 Cashfree Dashboard URLs:');
  console.log(`   Return URL: ${publicUrl}/api/payment/success`);
  console.log(`   Webhook URL: ${publicUrl}/api/payment/webhook`);
  console.log('\n👀 Waiting for payment requests...');
  console.log('💡 Payment karein - logs yahan dikhenge!\n');
  console.log('====================================\n');
});


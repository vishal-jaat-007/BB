# 🚀 Render Deployment Guide - Razorpay Integration

## ✅ Code GitHub Pe Push Ho Gaya!

Repository: `https://github.com/vishal-jaat-007/BB.git`

---

## 📋 Step 1: Render Dashboard Setup

1. **Render.com pe login karo**: https://render.com
2. **"New +" button click karo**
3. **"Web Service" select karo**
4. **GitHub repository connect karo**: `vishal-jaat-007/BB`

---

## ⚙️ Step 2: Render Configuration

### Basic Settings:
- **Name**: `razorpay-wallet-backend` (ya kuch bhi)
- **Environment**: `Node`
- **Region**: Singapore (ya closest)
- **Branch**: `main`
- **Root Directory**: (blank rakho)
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Free ya Paid (apne hisab se)

---

## 🔑 Step 3: Environment Variables (IMPORTANT!)

Render dashboard mein **Environment** section mein ye variables add karo:

### Required Variables:

```
RAZORPAY_KEY_ID=rzp_live_RsiXvkO1ULNiTn
RAZORPAY_KEY_SECRET=Upl6w0gzUCxF4f6PJVw1So7D
RAZORPAY_WEBHOOK_SECRET=d29add2425aa4fc37e0ed3691324882e06f91060c74cc231f476ac9fb5a8a8c7
PORT=10000
NODE_ENV=production
```

**⚠️ Important:**
- `RAZORPAY_KEY_SECRET` ko **Secret** mark karo (eye icon click karo)
- `RAZORPAY_WEBHOOK_SECRET` ko **Secret** mark karo
- Sab values properly add karo

---

## 🚀 Step 4: Deploy

1. **"Create Web Service" button click karo**
2. Render automatically deploy start kar dega
3. **Logs dekho** - deployment status check karo
4. Deployment complete hone ke baad **URL mil jayega**

---

## 🌐 Step 5: Get Your Render URL

Deployment complete hone ke baad:
- Render dashboard mein **Settings** section mein
- **"Service URL"** mil jayega, jaise: `https://razorpay-wallet-backend.onrender.com`

**Example URL:**
```
https://razorpay-wallet-backend.onrender.com
```

---

## 🔔 Step 6: Razorpay Dashboard - Webhook Setup

Render URL milne ke baad, Razorpay Dashboard mein webhook add karo:

1. **Razorpay Dashboard** → **Developers** → **Webhooks**
2. **"Add New Webhook"** click karo
3. **Webhook URL** add karo:
   ```
   https://YOUR_RENDER_URL.onrender.com/api/payment/webhook
   ```
   Example:
   ```
   https://razorpay-wallet-backend.onrender.com/api/payment/webhook
   ```
4. **Secret** field mein ye value paste karo:
   ```
   d29add2425aa4fc37e0ed3691324882e06f91060c74cc231f476ac9fb5a8a8c7
   ```
5. **Active Events** mein **`payment.captured`** select karo
6. **"Create Webhook"** click karo

---

## 📱 Step 7: Flutter App Update

Flutter app mein backend URL update karo:

```dart
// PaymentService.dart
static const String baseUrl = 'https://YOUR_RENDER_URL.onrender.com';
```

Example:
```dart
static const String baseUrl = 'https://razorpay-wallet-backend.onrender.com';
```

---

## ✅ Deployment Checklist

- [ ] Render account setup kiya
- [ ] GitHub repository connect kiya
- [ ] Environment variables add kiye (3 Razorpay keys)
- [ ] Deploy button click kiya
- [ ] Deployment successful (logs check kiye)
- [ ] Render URL mil gaya
- [ ] Razorpay Dashboard mein webhook add kiya
- [ ] Flutter app mein backend URL update kiya

---

## 🧪 Testing

### 1. Server Health Check:
```
GET https://YOUR_RENDER_URL.onrender.com/
```
Response: `{"message":"Razorpay Wallet Backend is running!"}`

### 2. Test Payment Order:
```bash
POST https://YOUR_RENDER_URL.onrender.com/api/payment/create-order
Content-Type: application/json

{
  "userId": "test123",
  "amount": "100",
  "currency": "INR",
  "customerName": "Test User",
  "customerEmail": "test@example.com",
  "customerPhone": "9999999999"
}
```

### 3. Check Wallet Balance:
```
GET https://YOUR_RENDER_URL.onrender.com/api/wallet/balance/test123
```

---

## 🆘 Troubleshooting

### Server crash ho raha hai?
- **Logs check karo** Render dashboard mein
- Environment variables sahi hai ya nahi verify karo
- `RAZORPAY_KEY_ID` aur `RAZORPAY_KEY_SECRET` properly set hai ya nahi

### Webhook nahi aa raha?
- Render URL Razorpay Dashboard mein sahi add kiya hai ya nahi check karo
- Webhook Secret same hai ya nahi verify karo (dashboard aur backend dono mein)
- Render free plan pe **sleep mode** hota hai - pehla request slow ho sakta hai
- Webhook logs Render dashboard mein check karo

### Payment order create nahi ho raha?
- Razorpay keys sahi hai ya nahi check karo
- Backend logs check karo Render dashboard mein
- Razorpay Dashboard mein Live Mode ON hai ya nahi verify karo

### Free Plan Limitations:
- **Sleep Mode**: 15 minutes inactivity ke baad server sleep ho jata hai
- **First Request**: Sleep ke baad pehla request slow ho sakta hai (30-60 seconds)
- **Solution**: Paid plan le lo ya uptime monitoring service use karo

---

## 🔄 Code Update Kaise Karein?

Agar code update karna ho:

```bash
# Local changes karo
git add .
git commit -m "Update description"
git push origin main
```

Render automatically redeploy kar dega! 🚀

---

## 📞 Support

Agar koi issue ho:
1. Render logs check karo
2. Razorpay Dashboard mein webhook status check karo
3. Backend API endpoints test karo
4. Environment variables verify karo

---

## ✅ Done!

Ab aapka server Render pe live hai with Razorpay integration! 🎉

**Next Steps:**
1. Flutter app mein backend URL update karo
2. Test payment karo
3. Production mein use karo!


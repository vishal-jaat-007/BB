# 🚀 Render Deployment Guide

## Step 1: GitHub Repository Setup

1. **GitHub pe repository banao** (agar nahi hai):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/cashfree-wallet-backend.git
   git push -u origin main
   ```

## Step 2: Render Account Setup

1. **Render.com pe account banao**: https://render.com
2. **"New +" button click karo**
3. **"Web Service" select karo**
4. **GitHub repository connect karo**

## Step 3: Render Configuration

### Basic Settings:
- **Name**: `cashfree-wallet-backend` (ya kuch bhi)
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Free ya Paid (apne hisab se)

### Environment Variables (IMPORTANT!):

Render dashboard mein **Environment** section mein ye variables add karo:

```
CASHFREE_APP_ID=your_app_id_here
CASHFREE_SECRET_KEY=your_secret_key_here
CASHFREE_MODE=PRODUCTION
CASHFREE_FORM_URL=https://payments.cashfree.com/forms/bbequity
PORT=10000
NODE_ENV=production
```

**Note**: `CASHFREE_APP_ID` aur `CASHFREE_SECRET_KEY` ko **Secret** mark karo (eye icon click karo)

## Step 4: Deploy

1. **"Create Web Service" button click karo**
2. Render automatically deploy start kar dega
3. **Logs dekho** - deployment status check karo
4. Deployment complete hone ke baad **URL mil jayega**

## Step 5: Get Your Render URL

Deployment complete hone ke baad:
- Render dashboard mein **Settings** section mein
- **"Service URL"** mil jayega, jaise: `https://cashfree-wallet-backend.onrender.com`

## Step 6: Update Cashfree Dashboard

Render URL milne ke baad, Cashfree Dashboard mein update karo:

### Return URL:
```
https://YOUR_RENDER_URL.onrender.com/api/payment/success
```

### Webhook URL:
```
https://YOUR_RENDER_URL.onrender.com/api/payment/webhook
```

## Step 7: Update Flutter App

`PaymentService.dart` mein baseUrl update karo:

```dart
static const String baseUrl = 'https://YOUR_RENDER_URL.onrender.com';
```

## ✅ Done!

Ab aapka server Render pe live hai! 🎉

## Troubleshooting

### Server crash ho raha hai?
- **Logs check karo** Render dashboard mein
- Environment variables sahi hai ya nahi verify karo
- `CASHFREE_MODE` check karo (TEST ya PRODUCTION)

### Webhook nahi aa raha?
- Render URL Cashfree Dashboard mein sahi add kiya hai ya nahi check karo
- Render free plan pe **sleep mode** hota hai - pehla request slow ho sakta hai
- Webhook logs Render dashboard mein check karo

### Free Plan Limitations:
- **Sleep Mode**: 15 minutes inactivity ke baad server sleep ho jata hai
- **First Request**: Sleep ke baad pehla request slow ho sakta hai (30-60 seconds)
- **Solution**: Paid plan le lo ya uptime monitoring service use karo

## Quick Commands

### Local Testing (Render deploy karne se pehle):
```bash
npm install
npm start
```

### Git Push (code update ke liye):
```bash
git add .
git commit -m "Update code"
git push
```

Render automatically redeploy kar dega! 🚀


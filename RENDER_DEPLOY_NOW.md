# 🚀 Render Par Deploy Karo - Step by Step

## ⚡ Quick Deploy Steps

### Step 1: Render Dashboard Mein Jao
1. Browser mein jao: **https://dashboard.render.com**
2. Login karo (ya sign up karo agar account nahi hai)

### Step 2: New Web Service Create Karo
1. Dashboard mein **"New +"** button click karo (top right)
2. **"Web Service"** select karo
3. **"Connect account"** se GitHub connect karo (agar pehle se nahi hai)
4. Repository select karo: **`vishal-jaat-007/BB`**
5. **"Connect"** click karo

### Step 3: Service Configuration
Yeh settings fill karo:

```
Name: razorpay-wallet-backend
Environment: Node
Region: Singapore (ya closest)
Branch: main
Root Directory: (blank rakho)
Build Command: npm install
Start Command: npm start
Plan: Free (ya Paid)
```

### Step 4: Environment Variables Add Karo (IMPORTANT!)

**"Environment"** section mein ye variables add karo:

| Key | Value | Secret? |
|-----|-------|---------|
| `RAZORPAY_KEY_ID` | `rzp_live_RsiXvkO1ULNiTn` | No |
| `RAZORPAY_KEY_SECRET` | `Upl6w0gzUCxF4f6PJVw1So7D` | ✅ Yes |
| `RAZORPAY_WEBHOOK_SECRET` | `d29add2425aa4fc37e0ed3691324882e06f91060c74cc231f476ac9fb5a8a8c7` | ✅ Yes |
| `PORT` | `10000` | No |
| `NODE_ENV` | `production` | No |

**⚠️ Important:** 
- `RAZORPAY_KEY_SECRET` ko **Secret** mark karo (eye icon click karo)
- `RAZORPAY_WEBHOOK_SECRET` ko **Secret** mark karo

### Step 5: Deploy!
1. **"Create Web Service"** button click karo
2. Deployment start ho jayega
3. **2-3 minutes wait karo**
4. **"Live"** status dikhne tak wait karo

### Step 6: Get Your URL
Deployment complete hone ke baad:
- Settings section mein **"Service URL"** mil jayega
- Example: `https://razorpay-wallet-backend.onrender.com`

---

## 🔔 Step 7: Razorpay Webhook Setup

Apne Render URL ke saath:

1. **Razorpay Dashboard** → **Developers** → **Webhooks**
2. **"Add New Webhook"** click karo
3. **Webhook URL** add karo:
   ```
   https://YOUR_RENDER_URL.onrender.com/api/payment/webhook
   ```
4. **Secret** field mein:
   ```
   d29add2425aa4fc37e0ed3691324882e06f91060c74cc231f476ac9fb5a8a8c7
   ```
5. **Active Events** mein **`payment.captured`** select karo
6. **"Create Webhook"** click karo

---

## ✅ Testing

Deployment ke baad test karo:

### 1. Health Check:
```
https://YOUR_RENDER_URL.onrender.com/
```
Response: `{"message":"Razorpay Wallet Backend is running!"}`

### 2. Test Order:
```bash
curl -X POST https://YOUR_RENDER_URL.onrender.com/api/payment/create-order \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "amount": "100",
    "currency": "INR"
  }'
```

---

## 🎯 Quick Copy-Paste Values

### Environment Variables:
```
RAZORPAY_KEY_ID=rzp_live_RsiXvkO1ULNiTn
RAZORPAY_KEY_SECRET=Upl6w0gzUCxF4f6PJVw1So7D
RAZORPAY_WEBHOOK_SECRET=d29add2425aa4fc37e0ed3691324882e06f91060c74cc231f476ac9fb5a8a8c7
PORT=10000
NODE_ENV=production
```

### Webhook Secret:
```
d29add2425aa4fc37e0ed3691324882e06f91060c74cc231f476ac9fb5a8a8c7
```

---

## 🆘 Troubleshooting

### Deployment fail ho raha hai?
- Logs check karo Render dashboard mein
- Environment variables sahi add kiye hain ya nahi verify karo
- Build command: `npm install` hai ya nahi check karo

### Server start nahi ho raha?
- Start command: `npm start` hai ya nahi check karo
- Logs mein error message dekho
- Environment variables properly set hain ya nahi

### Webhook nahi aa raha?
- Render URL sahi hai ya nahi check karo
- Webhook Secret same hai ya nahi (dashboard aur backend dono mein)
- Free plan pe sleep mode hota hai - pehla request slow ho sakta hai

---

## 🚀 Done!

Ab aapka server Render pe live hai! 🎉

**Next:** Flutter app mein backend URL update karo!


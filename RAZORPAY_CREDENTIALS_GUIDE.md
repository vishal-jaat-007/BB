# 🔑 Razorpay Credentials Guide - Kahan Se Milegi

## 📋 Chahiye Kya?

Razorpay integration ke liye **3 credentials** chahiye:

1. **RAZORPAY_KEY_ID** (Key ID)
2. **RAZORPAY_KEY_SECRET** (Key Secret)  
3. **RAZORPAY_WEBHOOK_SECRET** (Webhook Secret - humne generate kiya hai)

---

## 🎯 Razorpay Dashboard Mein Kahan Milegi?

### Step 1: Razorpay Dashboard Login
1. https://dashboard.razorpay.com pe jao
2. Apna account se login karo
3. **Test Mode** ya **Live Mode** select karo (pehle Test Mode use karo)

### Step 2: API Keys Milne Ka Location

#### **Option A: Settings Se (Easiest)**
1. Left sidebar mein **"Settings"** (⚙️) click karo
2. **"API Keys"** section mein jao
3. Yahan **Key ID** aur **Key Secret** dikhega

#### **Option B: Developers Section Se**
1. Left sidebar mein **"Developers"** click karo
2. **"API Keys"** tab select karo
3. Yahan **Key ID** aur **Key Secret** mil jayega

---

## 🔐 Key ID aur Key Secret Kaise Lein?

### Test Mode (Development ke liye):
1. Dashboard ke top pe **"Test Mode"** toggle check karo (ON hona chahiye)
2. **Settings → API Keys** pe jao
3. **"Generate Test Key"** button click karo (agar pehle se nahi hai)
4. Yahan dikhega:
   - **Key ID**: `rzp_test_xxxxxxxxxxxxx` (jaise `rzp_test_1234567890`)
   - **Key Secret**: `xxxxxxxxxxxxxxxxxxxxx` (long string)

### Live Mode (Production ke liye):
1. Dashboard ke top pe **"Live Mode"** toggle karo
2. **Settings → API Keys** pe jao
3. **"Generate Live Key"** button click karo
4. Yahan dikhega:
   - **Key ID**: `rzp_live_xxxxxxxxxxxxx`
   - **Key Secret**: `xxxxxxxxxxxxxxxxxxxxx`

**⚠️ Important:** 
- Test Mode keys: `rzp_test_` se start hote hain
- Live Mode keys: `rzp_live_` se start hote hain
- Key Secret sirf ek baar dikhta hai - copy kar lo!

---

## 🔔 Webhook Secret Kahan Milega?

Webhook Secret **aapko khud generate karna hoga**:

1. Razorpay Dashboard → **Developers** → **Webhooks**
2. **"Add New Webhook"** click karo
3. **"Secret"** field mein ye value paste karo:
   ```
   d29add2425aa4fc37e0ed3691324882e06f91060c74cc231f476ac9fb5a8a8c7
   ```
4. Webhook URL add karo: `https://your-domain.com/api/payment/webhook`
5. **"Create Webhook"** click karo

**Ya phir:** Agar aapne pehle se webhook banaya hai, to:
- Webhook list mein jao
- Apne webhook pe click karo
- **"Secret"** field mein value dikhegi (agar set ki hai)

---

## 📝 Environment Variables Setup

### Local Development (.env file):
```bash
# Razorpay Test Mode Keys (Development)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=d29add2425aa4fc37e0ed3691324882e06f91060c74cc231f476ac9fb5a8a8c7

# Server
PORT=3000
```

### Production (Render/Heroku/etc):
Environment Variables section mein add karo:
- `RAZORPAY_KEY_ID` = `rzp_live_xxxxxxxxxxxxx`
- `RAZORPAY_KEY_SECRET` = `xxxxxxxxxxxxxxxxxxxxx`
- `RAZORPAY_WEBHOOK_SECRET` = `d29add2425aa4fc37e0ed3691324882e06f91060c74cc231f476ac9fb5a8a8c7`

---

## ✅ Quick Checklist

- [ ] Razorpay Dashboard login kiya
- [ ] Test Mode ON kiya (development ke liye)
- [ ] Settings → API Keys se Key ID copy kiya
- [ ] Settings → API Keys se Key Secret copy kiya
- [ ] Webhook create kiya aur Secret set kiya
- [ ] .env file mein sab credentials add kiye
- [ ] Backend server restart kiya

---

## 🆘 Help

Agar keys nahi mil rahi:
1. **Test Mode** check karo - Test Mode ON hona chahiye
2. **Generate Test Key** button click karo
3. Key Secret sirf ek baar dikhta hai - immediately copy kar lo
4. Agar lost ho gaya, to **Regenerate** karo (purana key kaam nahi karega)

---

## 📸 Screenshot Locations

Razorpay Dashboard mein ye locations check karo:

1. **Top Right**: Test Mode / Live Mode toggle
2. **Left Sidebar**: Settings → API Keys
3. **Left Sidebar**: Developers → API Keys
4. **Left Sidebar**: Developers → Webhooks

---

**Note:** Pehle **Test Mode** mein test karo, phir production mein **Live Mode** keys use karo!

# 🔧 Troubleshooting 500 Error - Payment Order Creation

## ❌ Error:
```
Response status: 500
Response body: {"success":false,"message":"Failed to create payment order"}
```

## 🔍 Possible Causes:

### 1. **Razorpay Credentials Not Set on Render** (Most Common)

**Problem:** Environment variables Render pe properly set nahi hain.

**Solution:**
1. Render Dashboard → Your Service → Environment
2. Check karo ki ye variables hain:
   - `RAZORPAY_KEY_ID=rzp_live_RsiXvkO1ULNiTn`
   - `RAZORPAY_KEY_SECRET=Upl6w0gzUCxF4f6PJVw1So7D`
   - `RAZORPAY_WEBHOOK_SECRET=d29add2425aa4fc37e0ed3691324882e06f91060c74cc231f476ac9fb5a8a8c7`

3. Agar nahi hain, to add karo:
   - "Add Environment Variable" click karo
   - Key aur Value add karo
   - `RAZORPAY_KEY_SECRET` aur `RAZORPAY_WEBHOOK_SECRET` ko **Secret** mark karo

4. **Service restart karo** after adding variables

### 2. **Razorpay Keys Invalid**

**Problem:** Keys sahi nahi hain ya expired hain.

**Solution:**
1. Razorpay Dashboard → Settings → API Keys
2. Verify karo ki keys sahi hain
3. Agar needed ho, to regenerate karo
4. Render pe update karo

### 3. **Razorpay SDK Initialization Error**

**Problem:** Razorpay SDK properly initialize nahi ho raha.

**Solution:**
1. Render logs check karo
2. Look for: "Razorpay initialized" message
3. Agar error dikhe, to credentials check karo

### 4. **Network/API Error**

**Problem:** Razorpay API se connection issue.

**Solution:**
1. Render logs check karo
2. Razorpay API status check karo
3. Network connectivity verify karo

---

## 🔍 How to Debug:

### Step 1: Check Render Logs

1. Render Dashboard → Your Service → Logs
2. Look for error messages
3. Check karo ki Razorpay initialized ho raha hai ya nahi

### Step 2: Check Environment Variables

Render Dashboard mein verify karo:
```
RAZORPAY_KEY_ID=rzp_live_RsiXvkO1ULNiTn
RAZORPAY_KEY_SECRET=Upl6w0gzUCxF4f6PJVw1So7D
```

### Step 3: Test API Directly

```bash
curl -X POST https://bb-fybm.onrender.com/api/payment/create-order \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "amount": "100",
    "currency": "INR"
  }'
```

### Step 4: Check Server Response

Response mein ab detailed error aayega:
```json
{
  "success": false,
  "message": "Failed to create payment order",
  "error": "...",
  "razorpayError": {
    "description": "...",
    "code": "..."
  }
}
```

---

## ✅ Quick Fix Checklist:

- [ ] Render Dashboard mein environment variables check kiye
- [ ] `RAZORPAY_KEY_ID` properly set hai
- [ ] `RAZORPAY_KEY_SECRET` properly set hai (Secret marked)
- [ ] Service restart kiya after adding variables
- [ ] Render logs check kiye
- [ ] Razorpay Dashboard mein keys verify kiye

---

## 🚀 Most Likely Fix:

**Render pe environment variables add karo:**

1. Render Dashboard → Your Service → Environment
2. Add these variables:
   ```
   RAZORPAY_KEY_ID=rzp_live_RsiXvkO1ULNiTn
   RAZORPAY_KEY_SECRET=Upl6w0gzUCxF4f6PJVw1So7D
   RAZORPAY_WEBHOOK_SECRET=d29add2425aa4fc37e0ed3691324882e06f91060c74cc231f476ac9fb5a8a8c7
   ```
3. **Save** karo
4. **Service restart** karo (Manual Deploy → Clear build cache & deploy)

---

## 📞 Still Not Working?

1. Render logs share karo
2. Error response details share karo
3. Environment variables screenshot share karo (keys hide karke)


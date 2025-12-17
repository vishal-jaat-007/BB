# 📱 Flutter App Developer Guide - Razorpay Integration

## 🎯 Kya Karna Hai?

Backend Razorpay ke saath ready hai. Ab Flutter app mein Razorpay Checkout integrate karna hai.

---

## 📋 Prerequisites

1. **Razorpay Flutter Package** install karo
2. **Backend API** se order create karo
3. **Razorpay Checkout** open karo
4. **Payment Success** handle karo
5. **Wallet Balance** update karo

---

## 🔧 Step 1: Dependencies Add Karo

`pubspec.yaml` mein ye package add karo:

```yaml
dependencies:
  flutter:
    sdk: flutter
  razorpay_flutter: ^1.3.0  # Latest version check karo
  http: ^1.1.0
```

Phir run karo:
```bash
flutter pub get
```

---

## 🔑 Step 2: Razorpay Key ID Setup

Backend se `keyId` mil jayega, lekin agar directly use karna ho to:

**Option A: Backend se lein (Recommended)**
- Backend API call se `keyId` response mein aayega

**Option B: Direct use karo**
- Razorpay Dashboard se Live Key ID: `rzp_live_RsiXvkO1ULNiTn`
- Ya Test Key ID: `rzp_test_xxxxxxxxxxxxx`

---

## 💻 Step 3: Payment Service Code

### 3.1 Razorpay Initialization

```dart
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class PaymentService {
  static const String baseUrl = 'https://your-backend-url.com'; // Backend URL
  static const String razorpayKeyId = 'rzp_live_RsiXvkO1ULNiTn'; // Live Key ID
  
  late Razorpay _razorpay;
  
  PaymentService() {
    _razorpay = Razorpay();
    _setupEventHandlers();
  }
  
  void _setupEventHandlers() {
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
  }
}
```

### 3.2 Create Order & Open Checkout

```dart
Future<void> initiatePayment({
  required String userId,
  required double amount,
  String? customerName,
  String? customerEmail,
  String? customerPhone,
}) async {
  try {
    // Step 1: Backend se order create karo
    final orderResponse = await http.post(
      Uri.parse('$baseUrl/api/payment/create-order'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'userId': userId,
        'amount': amount.toString(),
        'currency': 'INR',
        'customerName': customerName ?? 'User',
        'customerEmail': customerEmail ?? 'user@example.com',
        'customerPhone': customerPhone ?? '9999999999',
        'appRedirectUrl': 'equityapp://payment-success', // Your deep link
      }),
    );

    if (orderResponse.statusCode == 200) {
      final responseData = json.decode(orderResponse.body);
      
      if (responseData['success'] == true) {
        // Step 2: Razorpay Checkout open karo
        final options = {
          'key': responseData['keyId'] ?? razorpayKeyId, // Backend se keyId
          'amount': responseData['amount'], // Amount in paise (already multiplied by 100)
          'name': responseData['name'] ?? 'Wallet Recharge',
          'description': responseData['description'] ?? 'Wallet Recharge',
          'prefill': responseData['prefill'] ?? {},
          'notes': responseData['notes'] ?? {},
          'order_id': responseData['orderId'], // Razorpay order ID
        };

        _razorpay.open(options);
      } else {
        throw Exception('Failed to create order: ${responseData['message']}');
      }
    } else {
      throw Exception('Backend error: ${orderResponse.statusCode}');
    }
  } catch (e) {
    print('Payment initiation error: $e');
    rethrow;
  }
}
```

### 3.3 Payment Success Handler

```dart
void _handlePaymentSuccess(PaymentSuccessResponse response) async {
  try {
    print('Payment Success!');
    print('Payment ID: ${response.paymentId}');
    print('Order ID: ${response.orderId}');
    print('Signature: ${response.signature}');
    
    // Step 1: Backend ko payment success notify karo (optional - webhook already handle karega)
    // Step 2: Wallet balance refresh karo
    await refreshWalletBalance();
    
    // Step 3: User ko success screen dikhao
    // Navigator.push(...) ya showDialog(...)
    
  } catch (e) {
    print('Payment success handler error: $e');
  }
}
```

### 3.4 Payment Error Handler

```dart
void _handlePaymentError(PaymentFailureResponse response) {
  print('Payment Error!');
  print('Code: ${response.code}');
  print('Message: ${response.message}');
  print('Error: ${response.error}');
  
  // User ko error message dikhao
  // showDialog(...) ya SnackBar(...)
}
```

### 3.5 External Wallet Handler

```dart
void _handleExternalWallet(ExternalWalletResponse response) {
  print('External Wallet: ${response.walletName}');
  // External wallet (Paytm, PhonePe, etc.) handle karo
}
```

### 3.6 Wallet Balance Refresh

```dart
Future<Map<String, dynamic>> getWalletBalance(String userId) async {
  try {
    final response = await http.get(
      Uri.parse('$baseUrl/api/wallet/balance/$userId'),
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return {
        'success': true,
        'balance': data['balance'] ?? 0.0,
        'transactions': data['transactions'] ?? [],
      };
    } else {
      throw Exception('Failed to fetch balance');
    }
  } catch (e) {
    print('Get balance error: $e');
    return {
      'success': false,
      'balance': 0.0,
      'transactions': [],
    };
  }
}

Future<void> refreshWalletBalance() async {
  // Get current user ID
  final userId = await getCurrentUserId(); // Your method to get user ID
  
  final balanceData = await getWalletBalance(userId);
  
  if (balanceData['success']) {
    // Update UI with new balance
    // setState(() { balance = balanceData['balance']; })
    // ya Provider/Bloc se update karo
  }
}
```

### 3.7 Cleanup

```dart
void dispose() {
  _razorpay.clear(); // Event handlers clear karo
}
```

---

## 🎨 Step 4: UI Integration Example

### 4.1 Payment Button Widget

```dart
class RechargeButton extends StatefulWidget {
  final String userId;
  final double amount;
  
  const RechargeButton({
    Key? key,
    required this.userId,
    required this.amount,
  }) : super(key: key);

  @override
  State<RechargeButton> createState() => _RechargeButtonState();
}

class _RechargeButtonState extends State<RechargeButton> {
  final PaymentService _paymentService = PaymentService();
  bool _isLoading = false;

  @override
  void dispose() {
    _paymentService.dispose();
    super.dispose();
  }

  Future<void> _handleRecharge() async {
    setState(() => _isLoading = true);
    
    try {
      await _paymentService.initiatePayment(
        userId: widget.userId,
        amount: widget.amount,
        customerName: 'User Name', // Get from user profile
        customerEmail: 'user@example.com', // Get from user profile
        customerPhone: '9999999999', // Get from user profile
      );
    } catch (e) {
      // Show error message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Payment failed: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: _isLoading ? null : _handleRecharge,
      child: _isLoading
          ? CircularProgressIndicator()
          : Text('Recharge ₹${widget.amount}'),
    );
  }
}
```

### 4.2 Profile Screen with Balance

```dart
class ProfileScreen extends StatefulWidget {
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  double _balance = 0.0;
  bool _isLoading = true;
  final PaymentService _paymentService = PaymentService();

  @override
  void initState() {
    super.initState();
    _loadBalance();
  }

  Future<void> _loadBalance() async {
    final userId = await getCurrentUserId();
    final balanceData = await _paymentService.getWalletBalance(userId);
    
    setState(() {
      _balance = balanceData['balance'] ?? 0.0;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Profile')),
      body: Column(
        children: [
          // Wallet Balance Card
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                children: [
                  Text('Wallet Balance', style: TextStyle(fontSize: 16)),
                  SizedBox(height: 8),
                  Text(
                    '₹${_balance.toStringAsFixed(2)}',
                    style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      // Show recharge dialog
                      _showRechargeDialog();
                    },
                    child: Text('Recharge Wallet'),
                  ),
                ],
              ),
            ),
          ),
          // Other profile content...
        ],
      ),
    );
  }

  void _showRechargeDialog() {
    // Show dialog with recharge amount options
    // Then call _paymentService.initiatePayment()
  }
}
```

---

## 🔗 Step 5: Deep Link Handling

Payment success ke baad app mein redirect handle karo:

### Android (AndroidManifest.xml)

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="equityapp" android:host="payment-success" />
</intent-filter>
```

### iOS (Info.plist)

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>equityapp</string>
        </array>
    </dict>
</array>
```

### Deep Link Handler

```dart
import 'package:uni_links/uni_links.dart'; // Package add karo

void initDeepLinkHandler() {
  getInitialUri().then((uri) {
    if (uri != null) {
      _handleDeepLink(uri);
    }
  });

  uriLinkStream.listen((uri) {
    _handleDeepLink(uri);
  });
}

void _handleDeepLink(Uri uri) {
  if (uri.scheme == 'equityapp' && uri.host == 'payment-success') {
    final status = uri.queryParameters['status'];
    final amount = uri.queryParameters['amount'];
    final orderId = uri.queryParameters['order_id'];
    
    if (status == 'success') {
      // Refresh wallet balance
      refreshWalletBalance();
      // Show success message
      showSuccessDialog(amount: amount);
    }
  }
}
```

---

## ✅ Complete PaymentService Class Example

```dart
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class PaymentService {
  static const String baseUrl = 'YOUR_BACKEND_URL'; // Update this
  static const String razorpayKeyId = 'rzp_live_RsiXvkO1ULNiTn';
  
  late Razorpay _razorpay;
  
  PaymentService() {
    _razorpay = Razorpay();
    _setupEventHandlers();
  }
  
  void _setupEventHandlers() {
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
  }
  
  Future<void> initiatePayment({
    required String userId,
    required double amount,
    String? customerName,
    String? customerEmail,
    String? customerPhone,
  }) async {
    try {
      final orderResponse = await http.post(
        Uri.parse('$baseUrl/api/payment/create-order'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'userId': userId,
          'amount': amount.toString(),
          'currency': 'INR',
          'customerName': customerName,
          'customerEmail': customerEmail,
          'customerPhone': customerPhone,
          'appRedirectUrl': 'equityapp://payment-success',
        }),
      );

      if (orderResponse.statusCode == 200) {
        final responseData = json.decode(orderResponse.body);
        
        if (responseData['success'] == true) {
          final options = {
            'key': responseData['keyId'] ?? razorpayKeyId,
            'amount': responseData['amount'],
            'name': responseData['name'] ?? 'Wallet Recharge',
            'description': responseData['description'] ?? 'Wallet Recharge',
            'prefill': responseData['prefill'] ?? {},
            'notes': responseData['notes'] ?? {},
            'order_id': responseData['orderId'],
          };

          _razorpay.open(options);
        } else {
          throw Exception('Failed to create order: ${responseData['message']}');
        }
      } else {
        throw Exception('Backend error: ${orderResponse.statusCode}');
      }
    } catch (e) {
      print('Payment initiation error: $e');
      rethrow;
    }
  }
  
  void _handlePaymentSuccess(PaymentSuccessResponse response) async {
    print('Payment Success! Payment ID: ${response.paymentId}');
    // Refresh balance, show success, etc.
  }
  
  void _handlePaymentError(PaymentFailureResponse response) {
    print('Payment Error: ${response.message}');
    // Show error to user
  }
  
  void _handleExternalWallet(ExternalWalletResponse response) {
    print('External Wallet: ${response.walletName}');
  }
  
  Future<Map<String, dynamic>> getWalletBalance(String userId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/wallet/balance/$userId'),
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Failed to fetch balance');
      }
    } catch (e) {
      print('Get balance error: $e');
      return {'success': false, 'balance': 0.0};
    }
  }
  
  void dispose() {
    _razorpay.clear();
  }
}
```

---

## 📝 Important Notes

1. **Backend URL Update Karo**: `baseUrl` ko apne backend URL se replace karo
2. **Key ID**: Backend se `keyId` automatically aayega, lekin fallback ke liye direct bhi use kar sakte ho
3. **Error Handling**: Proper error handling add karo
4. **Loading States**: Payment process mein loading indicators dikhao
5. **Balance Refresh**: Payment success ke baad balance refresh karo
6. **Deep Links**: Deep link handling properly setup karo

---

## 🧪 Testing

1. **Test Mode**: Pehle Test Mode mein test karo
2. **Test Cards**: Razorpay test cards use karo
3. **Success Flow**: Payment success ke baad balance update check karo
4. **Error Flow**: Payment cancel/fail scenarios test karo

---

## 🆘 Troubleshooting

- **Payment not opening**: Check karo ki Razorpay package properly installed hai
- **Order creation fails**: Backend URL aur API endpoints check karo
- **Balance not updating**: Webhook setup check karo backend mein
- **Deep link not working**: AndroidManifest.xml aur Info.plist check karo

---

**Backend URL Update Karo Aur Test Karo!** 🚀

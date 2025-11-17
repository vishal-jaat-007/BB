// // ============================================
// // PAYMENT_SERVICE.DART - Updated with Deep Link Support
// // ============================================

// import 'package:cloud_firestore/cloud_firestore.dart';
// import 'dart:convert';
// import 'package:http/http.dart' as http;

// class PaymentService {
//   // Local API URL - ACTUAL SERVER URL
//   static const String baseUrl = 'https://bb-fybm.onrender.com';
//   // For local testing: 'http://localhost:3000'
//   // For production: 'https://yourdomain.com'

//   // App Deep Link - APNA APP NAME USE KAREIN
//   static const String appDeepLink = 'equityapp://payment-success';

//   // Create payment order via API
//   static Future<Map<String, dynamic>> createPaymentOrder({
//     required String userId,
//     required double amount,
//     required String customerName,
//     required String customerEmail,
//     String? customerPhone,
//   }) async {
//     try {
//       print('🔄 Creating payment order...');
//       print('URL: $baseUrl/api/payment/create-order');
//       print('Amount: $amount, UserId: $userId');

//       final response = await http.post(
//         Uri.parse('$baseUrl/api/payment/create-order'),
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: jsonEncode({
//           'userId': userId,
//           'amount': amount,
//           'appRedirectUrl': appDeepLink, // Deep link for app redirect
//           'customerName': customerName,
//           'customerEmail': customerEmail,
//           'customerPhone': customerPhone ?? '',
//         }),
//       );

//       print('📡 Response status: ${response.statusCode}');
//       print('📡 Response body: ${response.body}');

//       if (response.statusCode == 200) {
//         final data = jsonDecode(response.body);
//         if (data['success'] == true) {
//           print('✅ Payment order created: ${data['paymentUrl']}');
//           return {
//             'success': true,
//             'paymentUrl': data['paymentUrl'],
//             'orderId': data['orderId'] ?? '',
//           };
//         } else {
//           throw Exception(data['message'] ?? 'Failed to create payment order');
//         }
//       } else {
//         throw Exception('Server error: ${response.statusCode}');
//       }
//     } catch (e) {
//       print('❌ Error creating payment order: $e');
//       return {
//         'success': false,
//         'error': e.toString(),
//       };
//     }
//   }

//   // Get wallet balance from API
//   static Future<double> getWalletBalance(String userId) async {
//     try {
//       print('🔄 Fetching wallet balance for: $userId');

//       final response = await http.get(
//         Uri.parse('$baseUrl/api/wallet/balance/$userId'),
//       );

//       if (response.statusCode == 200) {
//         final data = jsonDecode(response.body);
//         if (data['success'] == true) {
//           final balance = (data['balance'] ?? 0.0) as double;
//           print('✅ Wallet balance: $balance');
//           return balance;
//         }
//       }
//       return 0.0;
//     } catch (e) {
//       print('❌ Error fetching balance: $e');
//       return 0.0;
//     }
//   }

//   // Update wallet balance in Firestore (after payment success)
//   static Future<void> updateWalletBalance({
//     required String userId,
//     required double amount,
//   }) async {
//     try {
//       final userRef = FirebaseFirestore.instance.collection('users').doc(userId);
//       await userRef.update({
//         'walletBalance': FieldValue.increment(amount),
//         'updatedAt': FieldValue.serverTimestamp(),
//       });
//       print('✅ Wallet balance updated: +$amount');
//     } catch (e) {
//       print('❌ Error updating wallet balance: $e');
//       rethrow;
//     }
//   }

//   // Save transaction to Firestore
//   static Future<void> saveTransaction({
//     required String userId,
//     required String paymentId,
//     required double amount,
//     required String type, // 'investment', 'withdrawal', etc.
//     required String status,
//   }) async {
//     await FirebaseFirestore.instance.collection('transactions').add({
//       'userId': userId,
//       'paymentId': paymentId,
//       'amount': amount,
//       'type': type,
//       'status': status,
//       'timestamp': FieldValue.serverTimestamp(),
//     });
//   }

//   // Update user investment - Webhook se call hoga
//   static Future<void> updateUserInvestment({
//     required String userId,
//     required double amount,
//   }) async {
//     try {
//       final userRef = FirebaseFirestore.instance.collection('users').doc(userId);
//       await userRef.update({
//         'totalInvested': FieldValue.increment(amount),
//         'updatedAt': FieldValue.serverTimestamp(),
//       });
//       print('✅ Investment updated: +$amount');
//     } catch (e) {
//       print('❌ Error updating investment: $e');
//       rethrow;
//     }
//   }
// }


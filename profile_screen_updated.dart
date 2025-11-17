// // ============================================
// // UPDATED PROFILE_SCREEN.DART - With Deep Link & Payment Integration
// // ============================================

// import 'dart:async';
// import 'package:equityapp/features/home/views/profile/editprofile.dart';
// import 'package:equityapp/features/home/views/profile/referralscreen.dart';
// import 'package:equityapp/features/home/views/saleview.dart';
// import 'package:equityapp/routes/app_router.dart';
// import 'package:flutter/material.dart';
// import 'package:cloud_firestore/cloud_firestore.dart';
// import 'package:url_launcher/url_launcher.dart';
// import 'package:uni_links/uni_links.dart'; // Deep link package
// import '../../../../core/theme/app_colors.dart';
// import '../../../../core/theme/app_text_styles.dart';
// import '../../../../data/models/user_profile.dart';
// import '../../../../data/repositories/paymentservice.dart';

// // ============================================
// // INVESTMENT SERVICE
// // ============================================
// class InvestmentService {
//   final FirebaseFirestore _firestore = FirebaseFirestore.instance;

//   Future<double> getUserTotalInvestment(String userId) async {
//     try {
//       final userDoc = await _firestore.collection('users').doc(userId).get();
//       if (userDoc.exists) {
//         return (userDoc.data()?['totalInvested'] ?? 0.0) as double;
//       }
//       return 0.0;
//     } catch (e) {
//       print('Error getting total investment: $e');
//       return 0.0;
//     }
//   }

//   Future<bool> resetInvestment(String userId) async {
//     try {
//       await _firestore.collection('users').doc(userId).update({
//         'totalInvested': 0.0,
//         'updatedAt': FieldValue.serverTimestamp(),
//       });
//       return true;
//     } catch (e) {
//       print('Error resetting investment: $e');
//       return false;
//     }
//   }

//   Future<bool> saveInvestment({
//     required String userId,
//     required String userName,
//     required double amount,
//     String? referredByCode,
//   }) async {
//     try {
//       final batch = _firestore.batch();
//       final timestamp = FieldValue.serverTimestamp();

//       // Save investment record
//       final investmentRef = _firestore.collection('investments').doc();
//       batch.set(investmentRef, {
//         'userId': userId,
//         'userName': userName,
//         'amount': amount,
//         'status': 'completed',
//         'createdAt': timestamp,
//       });

//       // Update user's total investment
//       final userRef = _firestore.collection('users').doc(userId);
//       batch.update(userRef, {
//         'totalInvested': FieldValue.increment(amount),
//         'lastInvestmentAt': timestamp,
//       });

//       // Get user's referredBy code to give bonus to referrer
//       final userDoc = await _firestore.collection('users').doc(userId).get();
//       final referredByCode = userDoc.data()?['referredBy'] as String?;

//       if (referredByCode != null && referredByCode.isNotEmpty) {
//         // Find the referrer by their referral code
//         final referrerQuery = await _firestore
//             .collection('users')
//             .where('referralCode', isEqualTo: referredByCode)
//             .limit(1)
//             .get();

//         if (referrerQuery.docs.isNotEmpty) {
//           final referrerId = referrerQuery.docs.first.id;
//           final bonusAmount = amount * 0.10; // 10% bonus

//           // Find or create referral record
//           final referralQuery = await _firestore
//               .collection('referrals')
//               .where('referrerId', isEqualTo: referrerId)
//               .where('referredUserId', isEqualTo: userId)
//               .limit(1)
//               .get();

//           if (referralQuery.docs.isNotEmpty) {
//             // Update existing referral record
//             final referralRef = referralQuery.docs.first.reference;
//             batch.update(referralRef, {
//               'totalInvested': FieldValue.increment(amount),
//               'signupBonusAmount': FieldValue.increment(bonusAmount),
//               'totalPaid': FieldValue.increment(bonusAmount),
//               'lastInvestmentAt': timestamp,
//               'status': 'active',
//             });
//           } else {
//             // Create new referral record if doesn't exist
//             final newReferralRef = _firestore.collection('referrals').doc();
//             batch.set(newReferralRef, {
//               'referrerId': referrerId,
//               'referredUserId': userId,
//               'referredUserName': userName,
//               'totalInvested': amount,
//               'signupBonusAmount': bonusAmount,
//               'totalPaid': bonusAmount,
//               'monthlyCommission': 0.0,
//               'createdAt': timestamp,
//               'lastInvestmentAt': timestamp,
//               'status': 'active',
//             });
//           }

//           // Update referrer's total earnings
//           final referrerRef = _firestore.collection('users').doc(referrerId);
//           batch.update(referrerRef, {
//             'totalReferralEarnings': FieldValue.increment(bonusAmount),
//           });
//         }
//       }

//       await batch.commit();
//       return true;
//     } catch (e) {
//       print('Error saving investment: $e');
//       return false;
//     }
//   }
// }

// // ============================================
// // UPDATED PROFILE SCREEN - With Deep Link Support
// // ============================================
// class ProfileScreen extends StatefulWidget {
//   const ProfileScreen({super.key, this.profile});
//   final UserProfile? profile;

//   @override
//   State<ProfileScreen> createState() => _ProfileScreenState();
// }

// class _ProfileScreenState extends State<ProfileScreen> with WidgetsBindingObserver {
//   late UserProfile? currentProfile;
//   final InvestmentService _investmentService = InvestmentService();
//   double totalInvested = 0.0;
//   bool isLoadingInvestment = true;
//   bool isProcessingPayment = false;
//   bool _waitingForPaymentConfirmation = false;
//   StreamSubscription<DocumentSnapshot>? _investmentStream;
//   StreamSubscription<String>? _linkStream; // Deep link stream
//   String equityBonusRange = '4% - 8%';

//   @override
//   void initState() {
//     super.initState();
//     WidgetsBinding.instance.addObserver(this);
//     currentProfile = widget.profile;
    
//     // Load initial data
//     _loadInvestmentData();
//     _loadEquityBonus();
    
//     // Real-time listener for Firestore updates
//     _setupRealTimeListener();
    
//     // Deep link listener - Payment success ke baad app redirect
//     _initDeepLinkListener();
    
//     // Check if app opened from deep link
//     _checkInitialLink();
//   }

//   // ✅ DEEP LINK LISTENER - Payment success ke baad yahan aayega
//   void _initDeepLinkListener() {
//     _linkStream = linkStream.listen((String? link) {
//       if (link != null) {
//         print('🔗 Deep link received: $link');
//         _handleDeepLink(link);
//       }
//     }, onError: (err) {
//       print('❌ Deep link error: $err');
//     });
//   }

//   // ✅ CHECK INITIAL LINK - App open hote hi check karein
//   Future<void> _checkInitialLink() async {
//     try {
//       final initialLink = await getInitialLink();
//       if (initialLink != null) {
//         print('🔗 Initial deep link: $initialLink');
//         _handleDeepLink(initialLink);
//       }
//     } catch (e) {
//       print('❌ Error getting initial link: $e');
//     }
//   }

//   // ✅ HANDLE DEEP LINK - Payment success URL parse karein
//   void _handleDeepLink(String url) {
//     print('🔗 Handling deep link: $url');
    
//     if (url.contains('payment-success')) {
//       // URL parse karein: equityapp://payment-success?order_id=...&status=success&amount=100&user_id=user123&balance=100
//       final uri = Uri.parse(url);
//       final orderId = uri.queryParameters['order_id'];
//       final status = uri.queryParameters['status'];
//       final amountStr = uri.queryParameters['amount'];
//       final userId = uri.queryParameters['user_id'];
//       final balanceStr = uri.queryParameters['balance'];
      
//       print('📊 Payment Success Details:');
//       print('   Order ID: $orderId');
//       print('   Status: $status');
//       print('   Amount: $amountStr');
//       print('   User ID: $userId');
//       print('   Balance: $balanceStr');
      
//       if (status == 'success' && amountStr != null) {
//         final amount = double.tryParse(amountStr) ?? 0.0;
//         final balance = double.tryParse(balanceStr ?? '0') ?? 0.0;
        
//         // Wait for webhook to update Firestore (2-3 seconds)
//         Future.delayed(const Duration(seconds: 3), () {
//           if (mounted) {
//             // Refresh investment data
//             _loadInvestmentData();
            
//             // Show success dialog
//             _showPaymentSuccessDialog(amount);
//           }
//         });
//       }
//     } else if (url.contains('payment-failed')) {
//       // Payment failed
//       if (mounted) {
//         ScaffoldMessenger.of(context).showSnackBar(
//           const SnackBar(
//             content: Text('Payment failed. Please try again.'),
//             backgroundColor: Colors.red,
//           ),
//         );
//       }
//     }
//   }

//   Future<void> _loadEquityBonus() async {
//     try {
//       final doc = await FirebaseFirestore.instance
//           .collection('settings')
//           .doc('app_settings')
//           .get();
//       if (doc.exists) {
//         final data = doc.data();
//         final min = data?['equityBonusMin'] ?? '4';
//         final max = data?['equityBonusMax'] ?? '8';
//         setState(() {
//           equityBonusRange = '$min% - $max%';
//         });
//       }
//     } catch (e) {
//       print('Error loading equity bonus: $e');
//     }
//   }

//   // Real-time listener - Firestore update hone par automatically UI update hoga
//   void _setupRealTimeListener() {
//     if (currentProfile?.uid != null) {
//       _investmentStream = FirebaseFirestore.instance
//           .collection('users')
//           .doc(currentProfile!.uid)
//           .snapshots()
//           .listen((snapshot) {
//         if (snapshot.exists && mounted) {
//           final amount = (snapshot.data()?['totalInvested'] ?? 0.0) as double;
//           setState(() {
//             totalInvested = amount;
//             isLoadingInvestment = false;
//           });
//         }
//       });
//     }
//   }

//   @override
//   void dispose() {
//     WidgetsBinding.instance.removeObserver(this);
//     _investmentStream?.cancel();
//     _linkStream?.cancel();
//     super.dispose();
//   }

//   @override
//   void didChangeAppLifecycleState(AppLifecycleState state) {
//     super.didChangeAppLifecycleState(state);
//     // Jab app resume ho (payment gateway se wapas aane par)
//     if (state == AppLifecycleState.resumed && _waitingForPaymentConfirmation) {
//       _waitingForPaymentConfirmation = false;
//       // Payment gateway se wapas aane par check karein
//       Future.delayed(const Duration(milliseconds: 500), () {
//         if (mounted) {
//           _loadInvestmentData();
//         }
//       });
//     }
//   }

//   // Payment success dialog - amount ke saath
//   Future<void> _showPaymentSuccessDialog(double amount) async {
//     if (!mounted) return;

//     await showDialog(
//       context: context,
//       barrierDismissible: false,
//       builder: (context) => AlertDialog(
//         backgroundColor: const Color(0xFF1A1A1A),
//         shape: RoundedRectangleBorder(
//           borderRadius: BorderRadius.circular(20),
//         ),
//         content: Column(
//           mainAxisSize: MainAxisSize.min,
//           children: [
//             // Success icon
//             Container(
//               width: 80,
//               height: 80,
//               decoration: BoxDecoration(
//                 color: Colors.green.withOpacity(0.2),
//                 shape: BoxShape.circle,
//               ),
//               child: const Icon(
//                 Icons.check_circle,
//                 color: Colors.green,
//                 size: 50,
//               ),
//             ),
//             const SizedBox(height: 20),
//             // Success message
//             const Text(
//               'Payment Successful! 🎉',
//               style: TextStyle(
//                 color: Colors.green,
//                 fontSize: 22,
//                 fontWeight: FontWeight.bold,
//               ),
//             ),
//             const SizedBox(height: 16),
//             // Amount
//             Text(
//               '₹${amount.toStringAsFixed(0)}',
//               style: const TextStyle(
//                 color: Colors.white,
//                 fontSize: 32,
//                 fontWeight: FontWeight.bold,
//               ),
//             ),
//             const SizedBox(height: 8),
//             const Text(
//               'Payment recorded successfully',
//               style: TextStyle(
//                 color: Colors.white70,
//                 fontSize: 14,
//               ),
//             ),
//           ],
//         ),
//         actions: [
//           ElevatedButton(
//             onPressed: () {
//               Navigator.pop(context);
//             },
//             style: ElevatedButton.styleFrom(
//               backgroundColor: Colors.green,
//               padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 12),
//             ),
//             child: const Text(
//               'OK',
//               style: TextStyle(
//                 color: Colors.white,
//                 fontSize: 16,
//                 fontWeight: FontWeight.bold,
//               ),
//             ),
//           ),
//         ],
//       ),
//     );
//   }

//   Future<void> _loadInvestmentData() async {
//     if (currentProfile?.uid != null) {
//       setState(() => isLoadingInvestment = true);
//       final amount = await _investmentService.getUserTotalInvestment(
//         currentProfile!.uid,
//       );
//       if (mounted) {
//         setState(() {
//           totalInvested = amount;
//           isLoadingInvestment = false;
//         });
//       }
//     }
//   }

//   // ✅ Payment via API - Updated
//   Future<void> _initiatePayment() async {
//     if (isProcessingPayment || currentProfile == null) return;

//     const double amount = 1000.0; // Default amount
//     setState(() {
//       isProcessingPayment = true;
//       _waitingForPaymentConfirmation = true;
//     });

//     try {
//       // Create payment order via API
//       final result = await PaymentService.createPaymentOrder(
//         userId: currentProfile!.uid,
//         amount: amount,
//         customerName: currentProfile!.name,
//         customerEmail: currentProfile!.email,
//         customerPhone: currentProfile!.phoneNumber,
//       );

//       if (!mounted) return;

//       if (result['success'] == true) {
//         final paymentUrl = result['paymentUrl'] as String;
//         print('✅ Payment URL received: $paymentUrl');

//         // Open payment URL in browser
//         final uri = Uri.parse(paymentUrl);
//         final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);

//         if (!launched) {
//           throw Exception('Could not launch payment URL');
//         }

//         // Payment gateway open ho gaya
//         // Deep link se wapas aayega payment success par
//         setState(() {
//           isProcessingPayment = false;
//         });
//       } else {
//         throw Exception(result['error'] ?? 'Failed to create payment order');
//       }
//     } catch (e) {
//       print('❌ Payment error: $e');
//       if (mounted) {
//         setState(() {
//           isProcessingPayment = false;
//           _waitingForPaymentConfirmation = false;
//         });

//         ScaffoldMessenger.of(context).showSnackBar(
//           SnackBar(
//             content: Text('Payment Error: ${e.toString()}'),
//             backgroundColor: Colors.red,
//           ),
//         );
//       }
//     }
//   }

//   String _formatCurrency(double value) {
//     return '₹ ${value.toStringAsFixed(0).replaceAllMapped(
//       RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
//       (Match m) => '${m[1]},',
//     )}';
//   }

//   @override
//   Widget build(BuildContext context) {
//     return Scaffold(
//       body: Container(
//         decoration: const BoxDecoration(gradient: AppColors.darkGradient),
//         child: SafeArea(
//           child: Column(
//             children: [
//               // Header with back button
//               Padding(
//                 padding: const EdgeInsets.all(16.0),
//                 child: Row(
//                   children: [
//                     IconButton(
//                       onPressed: () => Navigator.pop(context),
//                       icon: const Icon(
//                         Icons.arrow_back,
//                         color: AppColors.white,
//                       ),
//                     ),
//                     const SizedBox(width: 12),
//                     Column(
//                       crossAxisAlignment: CrossAxisAlignment.start,
//                       children: [
//                         Text(
//                           currentProfile?.name ?? 'User Profile',
//                           style: AppTextStyles.heading.copyWith(fontSize: 20),
//                         ),
//                         Text(
//                           currentProfile?.email ?? '',
//                           style: AppTextStyles.subheading.copyWith(
//                             fontSize: 13,
//                           ),
//                         ),
//                       ],
//                     ),
//                     const Spacer(),
//                     GestureDetector(
//                       onTap: () => Navigator.push(
//                         context,
//                         MaterialPageRoute(
//                           builder: (context) =>
//                               ReferralScreen(profile: currentProfile!),
//                         ),
//                       ),
//                       child: CircleAvatar(
//                         radius: 28,
//                         backgroundColor: AppColors.accent.withOpacity(0.2),
//                         child: const Icon(Icons.share),
//                       ),
//                     ),
//                     const SizedBox(width: 10),
//                     GestureDetector(
//                       onTap: () async {
//                         final updatedProfile = await Navigator.push<UserProfile>(
//                           context,
//                           MaterialPageRoute(
//                             builder: (context) =>
//                                 ProfileEditScreen(profile: currentProfile!),
//                           ),
//                         );

//                         if (updatedProfile != null && mounted) {
//                           setState(() {
//                             currentProfile = updatedProfile;
//                           });
//                         }
//                       },
//                       child: CircleAvatar(
//                         radius: 28,
//                         backgroundColor: AppColors.accent.withOpacity(0.2),
//                         child: const Icon(Icons.edit),
//                       ),
//                     ),
//                   ],
//                 ),
//               ),
//               Expanded(
//                 child: SingleChildScrollView(
//                   padding: const EdgeInsets.all(24),
//                   child: Column(
//                     crossAxisAlignment: CrossAxisAlignment.start,
//                     children: [
//                       // Portfolio Overview Card
//                       Container(
//                         padding: const EdgeInsets.all(24),
//                         decoration: BoxDecoration(
//                           gradient: LinearGradient(
//                             colors: [
//                               AppColors.accent.withOpacity(0.2),
//                               AppColors.accent.withOpacity(0.05),
//                             ],
//                             begin: Alignment.topLeft,
//                             end: Alignment.bottomRight,
//                           ),
//                           borderRadius: BorderRadius.circular(20),
//                           border: Border.all(
//                             color: AppColors.accent.withOpacity(0.3),
//                             width: 1,
//                           ),
//                         ),
//                         child: Column(
//                           crossAxisAlignment: CrossAxisAlignment.start,
//                           children: [
//                             Row(
//                               mainAxisAlignment: MainAxisAlignment.spaceBetween,
//                               children: [
//                                 Text(
//                                   'Portfolio Value',
//                                   style: AppTextStyles.subheading,
//                                 ),
//                                 Container(
//                                   padding: const EdgeInsets.symmetric(
//                                     horizontal: 12,
//                                     vertical: 6,
//                                   ),
//                                   decoration: BoxDecoration(
//                                     color: Colors.green.withOpacity(0.2),
//                                     borderRadius: BorderRadius.circular(20),
//                                   ),
//                                   child: const Row(
//                                     children: [
//                                       SizedBox(width: 4),
//                                       Text(
//                                         'PRICE',
//                                         style: TextStyle(
//                                           color: Colors.green,
//                                           fontWeight: FontWeight.w600,
//                                           fontSize: 12,
//                                         ),
//                                       ),
//                                     ],
//                                   ),
//                                 ),
//                               ],
//                             ),
//                             const SizedBox(height: 12),
//                             Text(
//                               isLoadingInvestment
//                                   ? "Loading..."
//                                   : _formatCurrency(totalInvested),
//                               style: AppTextStyles.heading.copyWith(
//                                 fontSize: 32,
//                                 fontWeight: FontWeight.bold,
//                               ),
//                             ),
//                             const SizedBox(height: 8),
//                             // ✅ Buy button with proper flow
//                             Row(
//                               mainAxisAlignment: MainAxisAlignment.spaceAround,
//                               children: [
//                                 Expanded(
//                                   child: TextButton(
//                                     style: TextButton.styleFrom(
//                                       backgroundColor: isProcessingPayment
//                                           ? Colors.grey
//                                           : Colors.green,
//                                       foregroundColor: Colors.white,
//                                       shape: RoundedRectangleBorder(
//                                         borderRadius: BorderRadius.circular(20),
//                                       ),
//                                     ),
//                                     onPressed: isProcessingPayment
//                                         ? null
//                                         : () async {
//                                             await _initiatePayment();
//                                           },
//                                     child: isProcessingPayment
//                                         ? const SizedBox(
//                                             height: 20,
//                                             width: 20,
//                                             child: CircularProgressIndicator(
//                                               color: Colors.white,
//                                               strokeWidth: 2,
//                                             ),
//                                           )
//                                         : const Text(
//                                             "Buy",
//                                             style: TextStyle(
//                                               color: Colors.white,
//                                               fontSize: 20,
//                                               fontWeight: FontWeight.bold,
//                                             ),
//                                           ),
//                                   ),
//                                 ),
//                                 const SizedBox(width: 40),
//                                 Expanded(
//                                   child: TextButton(
//                                     style: TextButton.styleFrom(
//                                       backgroundColor: AppColors.grey,
//                                       foregroundColor: Colors.white,
//                                       shape: RoundedRectangleBorder(
//                                         borderRadius: BorderRadius.circular(20),
//                                       ),
//                                     ),
//                                     onPressed: () {
//                                       Navigator.of(context).push(
//                                         MaterialPageRoute(
//                                           builder: (context) => const SalePaymentScreen(),
//                                         ),
//                                       );
//                                     },
//                                     child: Text(
//                                       "Sale",
//                                       style: AppTextStyles.subheading.copyWith(
//                                         color: AppColors.white,
//                                         fontSize: 20,
//                                         fontWeight: FontWeight.bold,
//                                       ),
//                                     ),
//                                   ),
//                                 ),
//                               ],
//                             ),
//                           ],
//                         ),
//                       ),
//                       const SizedBox(height: 24),
//                       // Performance Graph
//                       Text(
//                         'Performance',
//                         style: AppTextStyles.heading.copyWith(fontSize: 18),
//                       ),
//                       const SizedBox(height: 16),
//                       Image.asset(
//                         "assets/images/bbequity.png",
//                         fit: BoxFit.cover,
//                         height: 200,
//                         width: double.infinity,
//                       ),
//                       const SizedBox(height: 32),
//                       // Stats Grid
//                       Text(
//                         'Investment Details',
//                         style: AppTextStyles.heading.copyWith(fontSize: 18),
//                       ),
//                       const SizedBox(height: 16),
//                       _StatCard(
//                         icon: Icons.account_balance_wallet,
//                         title: 'Total Invested',
//                         value: isLoadingInvestment
//                             ? "Loading..."
//                             : _formatCurrency(totalInvested),
//                         subtitle: 'Total investment amount',
//                         color: Colors.blue,
//                       ),
//                       const SizedBox(height: 12),
//                       _StatCard(
//                         icon: Icons.trending_up,
//                         title: 'Refeerel Equity team Bonus',
//                         value: "10%",
//                         subtitle: 'Present market value',
//                         color: Colors.purple,
//                       ),
//                       const SizedBox(height: 12),
//                       _StatCard(
//                         icon: Icons.attach_money,
//                         title: 'Referrel Equity Bonus',
//                         value: '10%',
//                         subtitle: 'Per Referral profit',
//                         color: Colors.green,
//                       ),
//                       const SizedBox(height: 12),
//                       _StatCard(
//                         icon: Icons.percent,
//                         title: 'Equity Bonus',
//                         value: equityBonusRange,
//                         subtitle: "",
//                         color: Colors.tealAccent,
//                       ),
//                       const SizedBox(height: 32),
//                       // Account Info Section
//                       Text(
//                         'Account Information',
//                         style: AppTextStyles.heading.copyWith(fontSize: 18),
//                       ),
//                       const SizedBox(height: 16),
//                       _InfoTile(
//                         icon: Icons.person,
//                         title: 'Full Name',
//                         value: currentProfile?.name ?? 'N/A',
//                       ),
//                       const SizedBox(height: 12),
//                       _InfoTile(
//                         icon: Icons.email,
//                         title: 'Email Address',
//                         value: currentProfile?.email ?? 'N/A',
//                       ),
//                       const SizedBox(height: 12),
//                       _InfoTile(
//                         icon: Icons.phone,
//                         title: 'Phone Number',
//                         value: currentProfile?.phoneNumber ?? 'N/A',
//                       ),
//                       const SizedBox(height: 12),
//                       _InfoTile(
//                         icon: Icons.credit_card,
//                         title: 'PAN Number',
//                         value: currentProfile?.panNumber ?? 'N/A',
//                       ),
//                       const SizedBox(height: 12),
//                       _InfoTile(
//                         icon: Icons.badge,
//                         title: 'Aadhaar Number',
//                         value: currentProfile?.aadhaarNumber != null
//                             ? 'XXXX XXXX ${currentProfile!.aadhaarNumber.substring(currentProfile!.aadhaarNumber.length - 4)}'
//                             : 'N/A',
//                       ),
//                       const SizedBox(height: 32),
//                       _FooterSection(onContactTap: () {}),
//                     ],
//                   ),
//                 ),
//               ),
//             ],
//           ),
//         ),
//       ),
//     );
//   }
// }

// // Stat Card Widget
// class _StatCard extends StatelessWidget {
//   const _StatCard({
//     required this.icon,
//     required this.title,
//     required this.value,
//     required this.subtitle,
//     required this.color,
//   });

//   final IconData icon;
//   final String title;
//   final String value;
//   final String subtitle;
//   final Color color;

//   @override
//   Widget build(BuildContext context) {
//     return Container(
//       padding: const EdgeInsets.all(20),
//       decoration: BoxDecoration(
//         color: const Color(0xFF1A1A1A),
//         borderRadius: BorderRadius.circular(16),
//         border: Border.all(color: color.withOpacity(0.3), width: 1),
//       ),
//       child: Row(
//         children: [
//           Container(
//             padding: const EdgeInsets.all(12),
//             decoration: BoxDecoration(
//               color: color.withOpacity(0.2),
//               borderRadius: BorderRadius.circular(12),
//             ),
//             child: Icon(icon, color: color, size: 24),
//           ),
//           const SizedBox(width: 16),
//           Expanded(
//             child: Column(
//               crossAxisAlignment: CrossAxisAlignment.start,
//               children: [
//                 Text(
//                   title,
//                   style: AppTextStyles.subheading.copyWith(fontSize: 13),
//                 ),
//                 const SizedBox(height: 4),
//                 Text(
//                   value,
//                   style: AppTextStyles.heading.copyWith(
//                     fontSize: 20,
//                     fontWeight: FontWeight.bold,
//                   ),
//                 ),
//                 const SizedBox(height: 2),
//                 Text(
//                   subtitle,
//                   style: TextStyle(
//                     color: color,
//                     fontSize: 12,
//                     fontWeight: FontWeight.w500,
//                   ),
//                 ),
//               ],
//             ),
//           ),
//         ],
//       ),
//     );
//   }
// }

// // Info Tile Widget
// class _InfoTile extends StatelessWidget {
//   const _InfoTile({
//     required this.icon,
//     required this.title,
//     required this.value,
//   });

//   final IconData icon;
//   final String title;
//   final String value;

//   @override
//   Widget build(BuildContext context) {
//     return Container(
//       padding: const EdgeInsets.all(16),
//       decoration: BoxDecoration(
//         color: const Color(0xFF1A1A1A),
//         borderRadius: BorderRadius.circular(12),
//         border: Border.all(color: const Color(0xFF2A2A2A), width: 1),
//       ),
//       child: Row(
//         children: [
//           Icon(icon, color: AppColors.accent, size: 22),
//           const SizedBox(width: 16),
//           Expanded(
//             child: Column(
//               crossAxisAlignment: CrossAxisAlignment.start,
//               children: [
//                 Text(
//                   title,
//                   style: AppTextStyles.subheading.copyWith(fontSize: 12),
//                 ),
//                 const SizedBox(height: 4),
//                 Text(
//                   value,
//                   style: const TextStyle(
//                     color: AppColors.white,
//                     fontSize: 15,
//                     fontWeight: FontWeight.w600,
//                   ),
//                 ),
//               ],
//             ),
//           ),
//         ],
//       ),
//     );
//   }
// }

// class _FooterSection extends StatelessWidget {
//   const _FooterSection({required this.onContactTap});
//   final VoidCallback onContactTap;

//   @override
//   Widget build(BuildContext context) {
//     return Column(
//       crossAxisAlignment: CrossAxisAlignment.start,
//       children: [
//         Row(
//           children: [
//             TextButton(
//               onPressed: () => Navigator.of(context).pushNamed(AppRouter.terms),
//               child: const Text('Terms & Conditions'),
//             ),
//             TextButton(
//               onPressed: () => Navigator.of(context).pushNamed(AppRouter.privacy),
//               child: const Text('Privacy Policy'),
//             ),
//           ],
//         ),
//         const SizedBox(height: 4),
//         GestureDetector(
//           onTap: onContactTap,
//           child: Text(
//             'Contact: manish@gmail.com',
//             style: AppTextStyles.subheading.copyWith(
//               color: AppColors.accent,
//               decoration: TextDecoration.underline,
//             ),
//           ),
//         ),
//       ],
//     );
//   }
// }


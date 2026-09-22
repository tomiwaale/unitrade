import 'dart:convert';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:go_router/go_router.dart';

import '../router/app_router.dart';
import 'device_token_repository.dart';

/// Push notification wiring — Firebase Cloud Messaging for delivery,
/// flutter_local_notifications to actually show a banner while the app is
/// foregrounded (FCM doesn't surface notification-type messages itself when
/// the app is active). Delivery is server-driven: the send-push Edge
/// Function (supabase/functions/send-push) fires on every INSERT into
/// `notifications`, so nothing here needs to know about individual features
/// — it just registers this device and reacts to whatever arrives.
///
/// Android is configured: the Google Services Gradle plugin turns
/// android/app/google-services.json into resources at build time, which is
/// what lets the argument-less Firebase.initializeApp() below resolve — no
/// firebase_options.dart is needed on that platform.
///
/// iOS is not: GoogleService-Info.plist is on disk but isn't referenced in
/// the Xcode project, so it never gets bundled and initializeApp() throws
/// there. Delivery additionally needs the FCM_* secrets set on the send-push
/// function and the notifications-Insert webhook wired up — see
/// mobile/PUSH_SETUP.md for both.
///
/// [init] fails soft on all of the above: it logs and returns, so push is
/// simply off rather than breaking the app, and nothing else depends on it.
/// The tradeoff is that a misconfiguration is silent — when push "just
/// doesn't arrive", check the debugPrint below before suspecting the server.
class PushService {
  PushService._();

  static final _localNotifications = FlutterLocalNotificationsPlugin();
  static bool _initialized = false;

  /// Android notification channels. Vibration is a per-channel setting that
  /// the OS freezes the first time the channel is created — [enableVibration]
  /// and [vibrationPattern] on a channel (or on the per-notification details)
  /// are ignored on every later build, so a pattern can only be changed by
  /// shipping a new channel id. That's why orders live on their own channel
  /// rather than a tweaked `default`: a sale gets a long double-buzz that's
  /// felt through a pocket, while everything else keeps the stock buzz.
  ///
  /// [ordersChannelId] is also what supabase/functions/send-push puts in
  /// `android.notification.channel_id` for `order` notifications, so a push
  /// that arrives while the app is backgrounded vibrates the same way as one
  /// that arrives in the foreground. Keep the two in sync.
  static const defaultChannelId = 'default';
  static const ordersChannelId = 'orders';

  /// Wait 0ms, buzz 500ms, pause 250ms, buzz 500ms.
  static final _ordersVibrationPattern = Int64List.fromList([0, 500, 250, 500]);

  static Future<void> init() async {
    if (_initialized) return;

    try {
      await Firebase.initializeApp();
    } catch (e) {
      debugPrint('[push] Firebase not configured yet — push notifications disabled. ($e)');
      return;
    }

    _initialized = true;
    FirebaseMessaging.onBackgroundMessage(_firebaseBackgroundHandler);

    await _initLocalNotifications();

    final messaging = FirebaseMessaging.instance;
    await messaging.requestPermission(alert: true, badge: true, sound: true);

    await registerTokenForCurrentUser();
    messaging.onTokenRefresh.listen(
      (token) => DeviceTokenRepository().registerToken(token, Platform.isIOS ? 'ios' : 'android'),
    );

    FirebaseMessaging.onMessage.listen(_showForegroundNotification);
    FirebaseMessaging.onMessageOpenedApp.listen((message) => _navigateForData(message.data));

    final initialMessage = await messaging.getInitialMessage();
    if (initialMessage != null) _navigateForData(initialMessage.data);
  }

  /// Registers the current FCM token against whoever is signed in right
  /// now. Called from [init] and again after every sign-in — a token
  /// fetched before login would otherwise never get associated with the
  /// user who then signs in on the same install.
  static Future<void> registerTokenForCurrentUser() async {
    if (!_initialized) return;
    final token = await FirebaseMessaging.instance.getToken();
    if (token != null) {
      await DeviceTokenRepository().registerToken(token, Platform.isIOS ? 'ios' : 'android');
    }
  }

  static Future<void> _initLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    await _localNotifications.initialize(
      settings: const InitializationSettings(android: androidSettings, iOS: iosSettings),
      onDidReceiveNotificationResponse: (response) {
        final payload = response.payload;
        if (payload == null) return;
        _navigateForData(Map<String, dynamic>.from(jsonDecode(payload) as Map));
      },
    );
    final android = _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    await android?.createNotificationChannel(const AndroidNotificationChannel(
      defaultChannelId,
      'General',
      description: 'Messages, swaps, and other KolejSwap activity',
      importance: Importance.high,
      enableVibration: true,
    ));
    await android?.createNotificationChannel(AndroidNotificationChannel(
      ordersChannelId,
      'Orders',
      description: 'New orders, escrow updates, disputes, and payouts',
      importance: Importance.high,
      enableVibration: true,
      vibrationPattern: _ordersVibrationPattern,
    ));
  }

  static Future<void> _showForegroundNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    final isOrder = message.data['type'] == 'order';

    // iOS has no channel concept, so a foreground banner there is silent
    // unless we ask for the buzz ourselves. Android is deliberately left
    // out: posting to the channel below already vibrates, and doing both
    // would buzz twice for the same notification.
    if (Platform.isIOS && isOrder) {
      await HapticFeedback.heavyImpact();
    }

    await _localNotifications.show(
      id: notification.hashCode,
      title: notification.title,
      body: notification.body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          isOrder ? ordersChannelId : defaultChannelId,
          isOrder ? 'Orders' : 'General',
          importance: Importance.high,
          enableVibration: true,
          vibrationPattern: isOrder ? _ordersVibrationPattern : null,
        ),
        iOS: const DarwinNotificationDetails(presentAlert: true, presentSound: true, presentBanner: true),
      ),
      payload: jsonEncode(message.data),
    );
  }

  /// Mirrors AppNotification.route (features/notifications/data/models.dart)
  /// — kept as a tiny standalone switch rather than importing that feature
  /// from core, since it's only a couple of cases.
  static void _navigateForData(Map<String, dynamic> data) {
    final type = data['type'] as String?;
    final relatedId = data['related_id'] as String?;
    if (relatedId == null || relatedId.isEmpty) return;

    final route = switch (type) {
      'message' => '/messages/$relatedId',
      'swap' => '/swaps',
      _ => null,
    };
    if (route == null) return;

    final context = rootNavigatorKey.currentContext;
    if (context != null && context.mounted) {
      GoRouter.of(context).push(route);
    }
  }
}

/// Runs in a separate isolate when a message arrives while the app is
/// terminated/backgrounded — must be a top-level function and re-initialize
/// Firebase itself. No-op beyond that: the OS already displays
/// notification-type messages automatically outside the foreground state.
@pragma('vm:entry-point')
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

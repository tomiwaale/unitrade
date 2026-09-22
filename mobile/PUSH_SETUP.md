# Push notification setup

Status: **Android is wired and building. iOS and the server secrets are not
done yet.** Push does not deliver end to end until the "Remaining" section
below is finished.

The Firebase project exists — `kolejswap` (sender ID `647329741707`). Both
config files are committed:

- `android/app/google-services.json` — package `com.kolejswap.kolejswap_mobile`,
  matches `applicationId`
- `ios/Runner/GoogleService-Info.plist` — bundle ID `com.kolejswap.kolejswapMobile`

Code side is complete: `lib/core/push/push_service.dart`,
`supabase/functions/send-push/`, and the `device_tokens` table
(`supabase/migrations/016_mobile_support.sql`).

## Done

### Android Firebase init

`android/settings.gradle.kts` declares the Google Services Gradle plugin and
`android/app/build.gradle.kts` applies it (after the Android/Kotlin plugins,
before the Flutter one). That plugin turns `google-services.json` into string
resources at build time, which is what lets the argument-less
`Firebase.initializeApp()` in `push_service.dart` resolve.

Verified: `flutter build apk --debug` succeeds and the resulting APK contains
`google_app_id = 1:647329741707:android:4080c9845dbe2a74628d8e`.

Note this means **Android does not need `firebase_options.dart`** — the
Gradle plugin covers it. Only iOS still needs `flutterfire configure`.

### Edge Function deployed

`send-push` is deployed to project `gwwznluprzkjpekhexzv`. Deploy from the
**repo root**, not from `mobile/` — the function lives at
`supabase/functions/send-push/` relative to the root, and the CLI resolves
that path relative to the working directory:

```bash
supabase functions deploy send-push --project-ref gwwznluprzkjpekhexzv
```

(Drop `--project-ref` after running `supabase link --project-ref gwwznluprzkjpekhexzv`
from the root — only `mobile/` was ever linked.)

## Remaining

### 1. Set the FCM secrets — blocks everything

Currently unset. The function reads them at module scope with non-null
assertions and calls `.replace()` on the key, so with them missing it throws
a `TypeError` during boot and **every invocation 500s** before any handler
code runs. This blocks Android too, not just iOS.

Firebase Console → Project Settings → Service Accounts → **Generate new
private key**, then from the repo root:

```bash
supabase secrets set FCM_PROJECT_ID=kolejswap --project-ref gwwznluprzkjpekhexzv
supabase secrets set FCM_SERVICE_ACCOUNT_EMAIL='<client_email from the JSON>' --project-ref gwwznluprzkjpekhexzv
supabase secrets set FCM_SERVICE_ACCOUNT_KEY='<private_key from the JSON>' --project-ref gwwznluprzkjpekhexzv
```

Single-quote the key so the shell doesn't eat the `\n` escapes — the function
un-escapes them itself. No redeploy needed; the next invocation picks them up.

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

### 2. Create the database webhook

Supabase Dashboard → Database → Webhooks → **Create a new webhook**:

- Table: `notifications`
- Events: `Insert`
- Type: `Supabase Edge Function`
- Function: `send-push`

Without this the function is deployed but never called. Dashboard-only, so
there's no CLI command to verify it — check it by hand.

### 3. iOS: bundle the plist and generate firebase_options.dart

The plist is on disk but **not referenced in `ios/Runner.xcodeproj/project.pbxproj`**,
so it isn't bundled into the Runner target and won't be found at runtime.

```bash
npm i -g firebase-tools && firebase login
dart pub global activate flutterfire_cli
cd mobile && flutterfire configure --project=kolejswap
```

This generates `lib/firebase_options.dart` and registers the plist with the
Xcode target. Alternatively, open `ios/Runner.xcworkspace` (after `pod install`)
and drag the plist into the `Runner` target by hand.

### 4. iOS: APNs key

Firebase Console → Project Settings → Cloud Messaging → Apple app configuration
→ upload an **APNs Authentication Key** (from https://developer.apple.com/account
→ Certificates, Identifiers & Profiles → Keys). Android push works without
this; iOS does not.

## Testing

Install a fresh build and sign in — `PushService.registerTokenForCurrentUser()`
(called from `main.dart`) is what writes the row into `device_tokens`. An empty
table means there's nothing to send to.

**`init()` fails silently by design.** On any Firebase error it logs and
returns, so a misconfiguration looks like "no notifications arrived," not a
crash. When testing, watch `flutter run` logs for:

```
[push] Firebase not configured yet — push notifications disabled.
```

Server-side failures show up in the Edge Function logs in the dashboard, not
on the device.

## Notification channels

Android decides whether a notification vibrates from its **channel**, not from
the payload, and it freezes a channel's settings the first time that channel is
created — editing `enableVibration` or `vibrationPattern` on an existing id is
silently ignored on every device that has already run the app. So the app ships
two channels, both created in `push_service.dart` on every launch:

| id | name | vibration |
| --- | --- | --- |
| `default` | General | stock buzz |
| `orders` | Orders | double-buzz, 500ms / 250ms pause / 500ms |

`AndroidManifest.xml` points FCM's `default_notification_channel_id` at
`@string/default_notification_channel_id` (`default`) as the fallback, and
`send-push` overrides it per notification with `android.notification.channel_id`
— `order` rows go to `orders`, everything else to `default`. This is what makes
a seller's phone buzz when a sale lands while the app is backgrounded: the OS
builds that notification itself and never runs any Dart, so the channel is the
only lever. In the foreground `_showForegroundNotification` posts to the same
channel, so both paths feel identical.

iOS has no channels. The payload carries `apns.payload.aps.sound = "default"`,
which is what gets the system to buzz on an order in the background, and the
foreground handler fires `HapticFeedback.heavyImpact()` directly (Android is
excluded there — the channel already vibrates, and doing both buzzes twice).

**Changing any of this needs both sides shipped**: redeploy `send-push` from the
repo root, and rebuild the app so the new channel exists before a push names it.
A `channel_id` referring to a channel the install has never created doesn't get
posted at all on Android 8+.

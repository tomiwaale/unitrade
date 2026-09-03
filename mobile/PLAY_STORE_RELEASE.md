# Play Store release (Android)

## What's already set up

- **Signing key**: `android/keystore/upload-keystore.jks`, alias `upload`,
  referenced by `android/key.properties` (both gitignored — never commit
  them). `android/app/build.gradle.kts` reads `key.properties` and signs the
  `release` build type with it. On a machine without these two files,
  `release` falls back to debug signing, which Play Store rejects — so a
  release build only ever produces something uploadable on a machine that
  has them.
- **App icon**: generated from `assets/icon/icon.png` /
  `assets/icon/icon_foreground.png` (matches `.ut-logo-mark` on the website —
  green `#0F8A4F`, white "u", orange `#FF5A1F` accent) via
  `flutter_launcher_icons` (config lives in `pubspec.yaml`). Re-run
  `dart run flutter_launcher_icons` after replacing those source images.
  `assets/icon/play-store-icon-512.png` is the separate 512×512 icon the
  Play Console store listing (not the app itself) asks you to upload.
- **App identity**: applicationId `com.kolejswap.kolejswap_mobile`, display
  name "KolejSwap", version `1.0.0+1` (`pubspec.yaml` — versionName+versionCode).

## The keystore password

Generated once, shown to you in chat when it was created, and never written
to any file in this repo other than the gitignored `key.properties`. **Save
it in a password manager now if you haven't.** Losing both the file and the
password means Google Play support has to reset your upload key before you
can ship another update — annoying, not fatal, since Play App Signing (below)
keeps the certificate users actually trust.

If this repo is ever cloned fresh (new machine, CI, a teammate), release
builds won't work until `android/keystore/upload-keystore.jks` and
`android/key.properties` are copied over out-of-band (e.g. from your password
manager / secrets store) — they're intentionally never in git.

## Building a release

```bash
cd mobile
flutter build appbundle --release
```

Output: `build/app/outputs/bundle/release/app-release.aab`. Play Console
wants this `.aab`, not an `.apk`.

Before each new release, bump the version in `pubspec.yaml`
(`version: 1.0.1+2` — the part after `+` is `versionCode` and must increase
every time; the part before is the user-visible `versionName`).

## First upload to Play Console

1. Create the app in [Play Console](https://play.google.com/console).
2. Enroll in **Play App Signing** when prompted (the default) — you upload
   the `.aab` signed with your upload key above, Google re-signs it with an
   app signing key it manages for distribution. This is what makes an upload
   key recoverable if you ever lose it.
3. **Data safety** / privacy section: point it at your deployed
   `/privacy` page for the Privacy Policy URL, and `/account/delete` for the
   Account Deletion URL (see the account-deletion work done earlier — both
   pages already exist, they just need your production domain to be live).
4. **Store listing** assets you'll need that aren't generated here:
   `assets/icon/play-store-icon-512.png` (icon), a 1024×500 feature graphic,
   and phone screenshots — these need actual product screens/marketing
   design, not something to script from the codebase.
5. **Content rating** questionnaire and **target audience** (KolejSwap is for
   university students 18+ — the Privacy Policy already states this).
6. Push notifications and the NIN verification API are optional at this
   point — see `PUSH_SETUP.md` — the app runs fine without them, just with
   push disabled, and can be wired up in a follow-up update.

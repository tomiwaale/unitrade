# Release notes

Paste into Play Console → **Production** (or whichever track) → your release →
**Release notes**. Max **500 characters per language**; the tracked language is
`en-US`. Play truncates long notes behind a "Read more", so the first two lines
do most of the work.

Keep these user-facing: what changed for the person using the app, not what
changed in the codebase. No internal ticket numbers, no library upgrades.

---

## 1.0.0 (versionCode 1) — first release

442 characters:

```
KolejSwap is live — Nigeria's student marketplace.

• Browse listings from students at your own university
• Sell what you no longer need in minutes, straight from your phone
• Propose a swap instead of paying cash
• Pay through escrow — the seller is paid only after you confirm you got the item
• Chat with buyers and sellers, photos included
• Withdraw your earnings to your bank account

Found a bug or have an idea? support@kolejswap.com
```

---

## Adding the next release

Append a new section above this one — newest first — bump
`version:` in `pubspec.yaml` (the number after `+` is the versionCode and must
increase every upload), then rebuild:

```bash
cd mobile
flutter build appbundle --release
```

If you ever automate uploads with fastlane, these go in
`fastlane/metadata/android/en-US/changelogs/<versionCode>.txt` — one file per
versionCode, same 500-character limit.

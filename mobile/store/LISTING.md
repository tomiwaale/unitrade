# Play Store listing — KolejSwap

Everything Play Console's **Main store listing** page asks for. Graphics that
could be generated from the brand artwork live in this folder; the ones that
need the running app are called out below.

Master artwork for all of it: `../assets/icon/Asset 6.svg`.

## Graphics

| Asset | Spec | Status |
| --- | --- | --- |
| App icon | 512×512, 32-bit PNG, ≤1 MB | ✅ `play-icon-512.png` |
| Feature graphic | 1024×500, PNG/JPEG, no alpha | ✅ `feature-graphic-1024x500.png` |
| Phone screenshots | 2–8, 16:9–9:16, 320–3840 px/side, no alpha | ⬜ needs the running app |
| 7" tablet screenshots | 2–8, same rules | ⬜ only if you distribute to tablets |
| 10" tablet screenshots | 2–8, same rules | ⬜ only if you distribute to tablets |
| Promo video | YouTube URL | ⬜ optional |

Play applies its own rounded mask to the icon, so `play-icon-512.png` is
deliberately a full-bleed square — the same artwork as the launcher icon.

Aim for 4–8 phone screenshots rather than the bare minimum of 2: Play requires
at least 4 to consider an app for promotional placement. Good candidates, in
order: catalog, product detail, propose-swap, chat, checkout/escrow, order
detail with the confirm step, profile with reviews.

## Text

**App name** (max 30) — 29 characters:

```
KolejSwap: Campus Marketplace
```

**Short description** (max 80) — 66 characters:

```
Buy, sell and swap with verified students on your Nigerian campus.
```

**Full description** (max 4000) — 1,974 characters:

```
KolejSwap is Nigeria's student marketplace — buy, sell and swap with verified students on your own campus.

Graduating and clearing out your room? Starting a new session and need a mattress, a textbook or a laptop without paying mall prices? KolejSwap connects you to students at your university, so the person you are buying from is a short walk away.

BUY FROM STUDENTS NEAR YOU
• Browse hostel furniture, textbooks, laptops, phones, electronics, clothing and more
• Filter by university, category and price so pickup is a walk, not a delivery fee
• Save listings to your wishlist and come back to them later

SELL WHAT YOU NO LONGER NEED
• List an item in minutes with photos from your phone
• Set your price and condition, and reach students already looking for it
• Track, edit and remove your items from My Listings any time

SWAP INSTEAD OF PAYING CASH
• Propose a swap with something you already own
• The other student accepts, counters or declines in the app
• Ideal for textbooks between courses and gear between sessions

PAY SAFELY WITH ESCROW
• Payments are held in escrow instead of going straight to the seller
• Funds are released only after you confirm you received the item
• Something wrong? Open a dispute in the app and our team reviews it

KNOW WHO YOU ARE DEALING WITH
• Sellers verify their identity with their NIN before they can list
• Star ratings and written reviews after every completed order
• In-app chat with photo sharing, so you can ask questions before you commit

GET YOUR MONEY OUT
• Add your bank account once and withdraw what you have earned
• Order updates, new messages and offers arrive as push notifications

Built for students at UNILAG, UI, OAU, LASU, FUTA, UNIPORT, ABU, UNIBEN, UNILORIN, UNN, UNIZIK, FUTO, Covenant, Babcock, YABATECH and 50+ other Nigerian universities and polytechnics.

KolejSwap is free to join. Sign up with your email, pick your campus and start browsing.

Questions or problems? support@kolejswap.com
```

Release notes ("What's new in this release") are per-release, not part of the
store listing — they live in `RELEASE-NOTES.md`.

## Store settings

- **App category**: Shopping
- **Tags**: Marketplace, Buying & Selling, Second-hand
- **Contact email**: support@kolejswap.com
- **Website**: https://kolejswap.com
- **Privacy policy URL**: https://kolejswap.com/privacy
- **Account deletion URL**: https://kolejswap.com/account/delete
- **Target audience**: 18+ (stated in the Privacy Policy)

Both URLs above need the production domain live before Play will accept them —
see `PLAY_STORE_RELEASE.md` for the rest of the release checklist.

## Regenerating the graphics

Requires `rsvg-convert` and ImageMagick (`brew install librsvg imagemagick`).
Run from the `mobile/` directory:

```bash
# 512×512 store icon — full-bleed square, no rounded corners
sed 's/rx="14.49" ry="14.49"//' 'assets/icon/Asset 6.svg' > /tmp/ks-square.svg
rsvg-convert -w 512 -h 512 /tmp/ks-square.svg -o /tmp/ks-512.png
magick /tmp/ks-512.png -alpha set -background none -type TrueColorAlpha \
  PNG32:store/play-icon-512.png

# 1024×500 feature graphic
sed '/<rect class="cls-2"/d' 'assets/icon/Asset 6.svg' > /tmp/ks-mark.svg
rsvg-convert -w 1024 -h 1024 /tmp/ks-mark.svg -o /tmp/ks-mark.png
magick -size 1024x500 xc: -sparse-color barycentric \
  '0,0 #12A05C 1023,499 #06371F' PNG24:/tmp/ks-bg.png
magick /tmp/ks-mark.png -trim +repage -resize x180 PNG32:/tmp/ks-m.png
magick -background none -fill white -font assets/fonts/Geist-Bold.ttf \
  -pointsize 74 label:'KolejSwap' -trim +repage PNG32:/tmp/ks-t.png
magick -background none -fill '#DCEFE4' -font assets/fonts/Geist-Medium.ttf \
  -pointsize 28 label:'Buy, sell & swap with students on your campus' \
  -trim +repage PNG32:/tmp/ks-g.png
magick /tmp/ks-bg.png \
  /tmp/ks-m.png -geometry +112+160 -composite \
  /tmp/ks-t.png -geometry +295+198 -composite \
  /tmp/ks-g.png -geometry +295+278 -composite \
  -alpha off -type TrueColor PNG24:store/feature-graphic-1024x500.png
```

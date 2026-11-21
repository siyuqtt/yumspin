# Running YumSpin on iPhone & Android

YumSpin is packaged in two ways:
1. **Installable Offline PWA** — installs straight onto both **iPhone** and **Android** home screens with the custom kawaii app icon, full-screen standalone window, notch safe-area support, and offline caching for all 38 illustrations.
2. **Native Android (`.apk`) & iOS (Xcode) via Capacitor** — automated via GitHub Actions or local build.

---

## Option 1: Install on Both iPhone & Android Today (PWA)

PWAs require **HTTPS** (or `localhost`). The easiest free HTTPS host is GitHub Pages (already wired up in `.github/workflows/deploy-pwa.yml`):

1. Push `/home/cyber/yumspin` to a GitHub repository.
2. In GitHub → **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Open your live `https://<your-username>.github.io/<repo>/` URL on your phone:
   - **iPhone (Safari)**: Tap **Share (`⬆`)** → **Add to Home Screen** → **Add**.
   - **Android (Chrome)**: Tap the **Install** button at the bottom of YumSpin (or Chrome menu `⋮` → **Add to Home screen / Install app**).

Once installed, YumSpin launches full-screen from your home screen and works offline!

---

## Option 2: Download a Compiled Android `.apk` (and iOS Build) via GitHub Actions

No Android Studio or Mac required for Android `.apk`:

1. Push this repo to GitHub (or run **Actions → Build Mobile Apps (Android & iOS) → Run workflow**).
2. Download the **`yumspin-android-apk`** artifact (`yumspin-android-debug.apk`).
3. Transfer `yumspin-android-debug.apk` to your Android phone and tap it to install (allow *Install unknown apps* if prompted).

The `build-ios` job also verifies and builds the Capacitor Xcode project on `macos-latest`. To install a signed native iOS build onto a physical iPhone (instead of using the iOS PWA above), open the project in Xcode on a Mac with your Apple ID (free personal team or Apple Developer account) and press **Run**, or archive for TestFlight.

---

## Option 3: Build Locally with Capacitor

Requires **Node.js 20+** (plus **Android Studio / JDK 17** for Android, or **macOS + Xcode + CocoaPods** for iOS):

```bash
# 1. Install Capacitor dependencies
npm install

# 2. Android (.apk)
npm run android:init
npm run android:open   # Build APK or run on USB-connected Android device

# 3. iOS (macOS + Xcode)
npm run ios:init
npm run ios:open       # Select your iPhone & press Run (⌘R)
```

Whenever you edit HTML/CSS/JS/images, sync changes into the native projects with:

```bash
npm run cap:sync
```

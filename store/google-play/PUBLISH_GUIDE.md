# YumSpin — Google Play Store Publishing Guide

Everything you need to publish **YumSpin** to Google Play without installing Android Studio locally.

---

## Pre-Flight Checklist (5 Minutes)

Before pushing to GitHub, update these two placeholders with your own info:

1. **Unique Android Package ID** in `capacitor.config.json`:
   - Already set to `"appId": "com.bbdeng.yumspin"` (use this exact string in Google Play Console!).
   - **Important:** Once published on Google Play, your `appId` can never be changed!
2. **Your Contact Email** in `privacy.html`:
   - Already set to `gq.mock@gmail.com`.

---

## Step 1: Register Google Play Console Account

1. Go to [play.google.com/console/signup](https://play.google.com/console/signup).
2. Choose **Personal** (or Organization) and pay the **\$25 one-time registration fee**.
3. Complete identity verification (Google usually approves within 1–2 business days).

---

## Step 2: Push YumSpin to GitHub & Enable Privacy Policy URL

1. Create a GitHub repository and push `/home/cyber/yumspin` to the `main` branch.
2. In your GitHub repo: **Settings → Pages → Source → GitHub Actions**.
3. Once the **Deploy Installable PWA (GitHub Pages)** workflow finishes, your live Privacy Policy URL is:
   ```text
   https://<your-github-username>.github.io/<your-repo-name>/privacy.html
   ```
   *(Double-check that URL opens cleanly in a browser—you'll paste it into Play Console.)*

---

## Step 3: Create Your Private Upload Keystore & Add GitHub Secrets

Google Play requires every `.aab` to be signed with your private upload key. **Never commit your keystore file to Git.**

Run this on any computer with `openssl` (macOS / Linux / Git Bash) in a safe folder **outside** the repo (e.g. `~/yumspin-keys/`):

```bash
mkdir -p ~/yumspin-keys && cd ~/yumspin-keys

# 1. Generate a 25-year RSA 2048 signing certificate & key
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout upload-key.pem -out upload-cert.pem -days 9125 \
  -subj "/CN=YumSpin/O=YumSpin/C=US"

# 2. Bundle into a PKCS#12 keystore (pick a strong password and save it!)
openssl pkcs12 -export \
  -in upload-cert.pem -inkey upload-key.pem \
  -out yumspin-upload.p12 -name yumspin

# 3. Print base64 string to copy into GitHub Secrets
base64 -w 0 yumspin-upload.p12 2>/dev/null || base64 -i yumspin-upload.p12 | tr -d '\n'
```

*(Back up `yumspin-upload.p12` and your password safely—e.g. in a password manager!)*

Now in your GitHub repo, go to **Settings → Secrets and variables → Actions → New repository secret** and add these 4 secrets:

| Secret Name | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | The single-line base64 string printed in step 3 above |
| `ANDROID_KEYSTORE_PASSWORD` | The export password you typed in step 2 |
| `ANDROID_KEY_ALIAS` | `yumspin` |
| `ANDROID_KEY_PASSWORD` | Same password as `ANDROID_KEYSTORE_PASSWORD` |

---

## Step 4: Compile Your Signed `.aab` in GitHub Actions

1. Open your GitHub repo → **Actions** tab.
2. Select **Release Android App Bundle (.aab) for Google Play** → click **Run workflow**.
3. Keep `version_name = 1.0.0` and `version_code = 1` (increment `version_code` to `2`, `3`, ... on each future release).
4. Wait ~3–4 minutes, then download the **`yumspin-google-play-aab`** artifact (`yumspin-v1.0.0-release.aab`).

---

## Step 5: Fill Out Google Play Console (Copy-Paste Ready)

In Google Play Console, click **Create app** (`App`, `Free`), then complete each section:

### Store Listing Assets (ready in `store/google-play/`)
- **App Icon (512 × 512 PNG)**: `store/google-play/app-icon-512x512.png`
- **Feature Graphic (1024 × 500 PNG)**: `store/google-play/feature-graphic-1024x500.png`
- **Phone Screenshots**: Take 3–4 vertical screenshots of YumSpin on your phone (or Chrome DevTools mobile view at 1080×2340):
  1. Screen 1 (*Pick Your Meal Trio* — Rice, Broccoli, Egg)
  2. Screen 1 with a Quick-Browse `1 / 10` ingredient grid expanded
  3. Screen 2 (*Guilt-o-Meter* + Complexity/Time steppers)
  4. Screen 2 (*Simple Steps* with cute step illustrations & Final Plate Preview)

### Copy-Paste Store Listing Text

- **App Name** *(27 / 30 chars)*:
  ```text
  YumSpin: What to Eat & Cook
  ```
- **Short Description** *(78 / 80 chars)*:
  ```text
  Swipe 30 staples, tune the Guilt-o-Meter, and cook simple meals with cute art!
  ```
- **Full Description**:
  ```text
  Can't decide what to eat tonight? Let YumSpin turn everyday staples into a delicious meal in seconds!

  1. PICK YOUR MEAL TRIO
  • Swipe through 30 cozy illustrated staples across Carbs, Veggies, and Proteins (1,000 combinations!).
  • Lock any favorite ingredient and tap Reshuffle to spin fresh ideas.
  • Tap the count badge (1/10) on any card to browse all choices at a glance.

  2. TUNE HOW TO COOK IT
  • Guilt-o-Meter: Slide smoothly from Monk Mode (strict & lean) through Balanced and Treat Mode all the way to Deluxe (all for flavor) — live calories, macros, and flavor boosters update instantly.
  • Complexity & Time Controls: Tap − or + to dial cooking effort (1/5 to 5/5) and time (10 to 45 min) to fit your mood.
  • Simple Illustrated Steps: Short, easy kitchen steps paired with cute step illustrations and a live Final Plate preview that builds as you check off each step.

  3. COZY ACOUSTIC SOUNDTRACK
  • Soft, happy acoustic background music adapts smoothly to your Guilt-o-Meter, cooking time, and complexity — with 1-tap mute controls for music and sound effects.

  100% offline-friendly, no account required, no ads, and zero personal data collected.
  ```
- **App Category**: `Food & Drink`
- **Tags**: `Cooking`, `Recipes`, `Meal Planner`

### Questionnaire Quick-Reference
- **Privacy Policy**: Paste your GitHub Pages `privacy.html` URL from Step 2.
- **Ads**: `No, my app does not contain ads`
- **App Access**: `All functionality is available without special access`
- **Content Rating (IARC)**: Select `All Other App Types` → answer `No` to violence, language, sexual content, user interaction, location sharing, and digital purchases → yields **Everyone / PEGI 3**.
- **Target Audience**: `13–15`, `16–17`, `18 and over` *(selecting 13+ avoids extra Families Policy steps while keeping it broadly available)*.
- **Data Safety**: *"Does your app collect or share any of the required user data types?"* → **`No`**.

---

## Step 6: Upload `.aab` & Launch

1. **New Personal Accounts (Google's Closed Testing Rule)**:
   - Go to **Test and release → Testing → Closed testing**, create a track, upload `yumspin-v1.0.0-release.aab`, add at least **12 testers** (friends/family emails), and have them opt in and keep the app installed for **14 continuous days**.
   - After 14 days, click **Apply for production** in Play Console!
2. **Organization Accounts**:
   - Upload `yumspin-v1.0.0-release.aab` directly under **Production → Create new release** and submit for review (typically approved in 1–3 days).

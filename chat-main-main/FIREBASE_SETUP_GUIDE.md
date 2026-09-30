# Complete Firebase & CommUnity Setup Guide

This guide walks you through setting up **Firebase Authentication**, **Firebase Realtime Database**, **Admin Authorization**, and **Google Gemini AI** for the CommUnity application.

---

## 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or select your existing project such as `gen-lang-client-0517379971`).
3. Enter a project name (e.g. `CommUnity Chat`).
4. (Optional) Enable Google Analytics and click **Create Project**.

---

## 2. Register a Web App
1. In your Firebase Project Overview page, click the **Web icon (`</>`)** to add a web application.
2. Enter an App nickname (e.g. `CommUnity Web`).
3. Do not check "Firebase Hosting" unless you want Firebase hosting.
4. Click **Register app**.
5. You will see a `firebaseConfig` object with:
   - `apiKey`
   - `authDomain`
   - `databaseURL` (if already created)
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
6. Keep this open or copy these values.

---

## 3. Enable Authentication Providers
1. In the left navigation menu, click **Build > Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab:
   - **Email/Password**: Click Email/Password, toggle **Enable**, and click **Save**.
   - **Google**: Click Google, toggle **Enable**, choose your support email (e.g. `adnan45amir12@gmail.com`), and click **Save**.
4. In **Settings > Authorized domains**, make sure your application's domain (e.g., `ais-dev-...run.app` or `localhost`) is added to the list.

---

## 4. Create Firebase Realtime Database
1. In the left navigation menu, click **Build > Realtime Database**.
2. Click **Create Database**.
3. Select your preferred database location (e.g., `United States` or closest to your users).
4. For initial security mode, select **Start in locked mode** (we will apply complete rules next).
5. Click **Enable**.
6. Note the database URL at the top (e.g., `https://your-project-id-default-rtdb.firebaseio.com`).

---

## 5. Paste RTDB Security Rules
1. In the Realtime Database page, click the **Rules** tab.
2. Open the file `database.rules.json` included in this repository.
3. Replace the placeholder `"ADMIN_UID_REPLACE_ME"` with your actual Firebase User UID (found in Firebase Auth > Users table after your first sign in).
4. Paste the JSON into the Firebase Rules editor.
5. Click **Publish**.

---

## 6. Configure Environment Variables
In your local environment or AI Studio Secrets / Cloud Run configuration:

```bash
# Gemini AI Configuration
GEMINI_API_KEY="AQ.Ab8RN6LmDjYREiE0pbP15oYmjRdkyi1pxPO3Y65fBm1tVjN4_g"
GEMINI_MODEL="gemini-3.8-flash"

# Admin User Identification (from Firebase Auth UID)
ADMIN_UID="YOUR_FIREBASE_AUTH_UID"

# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_DATABASE_URL="https://your-project-id-default-rtdb.firebaseio.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
```

*Note: In CommUnity, if environment variables are not yet configured or you are testing in preview, you can also paste your Firebase Config directly into the built-in Connection Modal in the app!*

---

## 7. How to Find & Set Your Admin UID
1. Sign up for an account in CommUnity with your email or with Google Sign-In.
2. Go to Firebase Console > **Authentication** > **Users**.
3. Find your user row and copy the **User UID** column (looks like `vB39xLmO012pQrStUv...`).
4. Set `ADMIN_UID` in your environment (or paste it in `database.rules.json`).
5. Now, whenever you log in with that account, the Admin Dashboard badge and `/admin` navigation will automatically become accessible!

---

## 8. Verification & Testing Checklist
- [x] **Sign Up & Login**: Test Email + Password and Google Sign-In.
- [x] **Profile Setup**: Choose Male / Female avatar and display name.
- [x] **Main Community Chat**: Send realtime messages; confirm other users see them instantly.
- [x] **Google Drive Link Card**: Paste any `https://drive.google.com/...` link and check the preview card with the Open File button.
- [x] **1-on-1 Private Messaging**: Search for a member, send a private message, verify other members cannot access it.
- [x] **Personal AI Chat**: Talk to Gemini AI one-on-one; conversations are private to each user.
- [x] **Main Group AI**: Mention the AI `@Community AI` or ask a question in the main room.
- [x] **Admin Controls**: View stats, ban/disable bad actors, moderate messages, resolve reports, and configure AI prompt rules.

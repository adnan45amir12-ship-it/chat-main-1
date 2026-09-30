# CommUnity - Full-Stack Community Chat Web Application

A full-stack, production-grade Community Chat Web Application built with Next.js 15, Firebase Authentication, Firebase Realtime Database, and Google Gemini AI.

---

## 🚀 Quick Vercel Deployment Guide

### Step 1: Push / Import to GitHub
1. Export or push this repository to your GitHub account.
2. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New Project"** ➔ Import your repository.

### Step 2: Configure Environment Variables in Vercel
In your Vercel project **Settings ➔ Environment Variables**, add the following variables:

| Variable Name | Description | Example / Value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API Key | `AIzaSy...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `your-app.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Firebase RTDB URL | `https://your-app-default-rtdb.firebaseio.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID | `your-app-id` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`| Firebase Storage Bucket | `your-app.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID | `1234567890` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID | `1:1234567890:web:abcdef` |
| `ADMIN_UID` | Designated Admin UID | `EqI2wKJjJ0hQ0VWg8SaFssooWk43` |
| `NEXT_PUBLIC_ADMIN_UID` | Public Admin UID | `EqI2wKJjJ0hQ0VWg8SaFssooWk43` |
| `GEMINI_API_KEY` | Google AI Studio Gemini API Key | `AIzaSy...` |
| `GEMINI_MODEL` | Gemini Model (Default) | `gemini-2.5-flash` |

### Step 3: Deploy
Click **Deploy**. Vercel will build and launch your application globally.

---

## 🔥 Firebase Realtime Database Rules

In your **Firebase Console ➔ Build ➔ Realtime Database ➔ Rules**, paste the contents of `database.rules.json`:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "info": {
      "connected": {
        ".read": true
      }
    },
    "users": {
      ".read": "auth != null",
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && (auth.uid === $uid || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')"
      }
    },
    "presence": {
      ".read": "auth != null",
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && (auth.uid === $uid || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')"
      }
    },
    "unblockRequests": {
      ".read": "auth != null",
      "$uid": {
        ".read": "auth != null && (auth.uid === $uid || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')",
        ".write": "auth != null && (auth.uid === $uid || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')"
      }
    },
    "communityMessages": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$messageId": {
        ".read": "auth != null",
        ".write": "auth != null && (newData.child('senderUid').val() === auth.uid || newData.child('senderId').val() === auth.uid || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43' || !newData.exists())"
      }
    },
    "aiChats": {
      "$uid": {
        ".read": "auth != null && (auth.uid === $uid || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')",
        ".write": "auth != null && (auth.uid === $uid || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')",
        "$msgId": {
          ".read": "auth != null && (auth.uid === $uid || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')",
          ".write": "auth != null && (auth.uid === $uid || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')"
        }
      }
    },
    "personalChats": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$chatId": {
        ".read": "auth != null && ($chatId.contains(auth.uid) || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')",
        ".write": "auth != null && ($chatId.contains(auth.uid) || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')",
        "participants": {
          ".read": "auth != null && ($chatId.contains(auth.uid) || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')",
          ".write": "auth != null && ($chatId.contains(auth.uid) || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')"
        },
        "deletedFor": {
          "$uid": {
            ".read": "auth != null && (auth.uid === $uid || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')",
            ".write": "auth != null && (auth.uid === $uid || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')"
          }
        },
        "messages": {
          ".read": "auth != null && ($chatId.contains(auth.uid) || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')",
          ".write": "auth != null && ($chatId.contains(auth.uid) || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')",
          "$messageId": {
            ".read": "auth != null && ($chatId.contains(auth.uid) || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')",
            ".write": "auth != null && ($chatId.contains(auth.uid) || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')"
          }
        }
      }
    },
    "userChats": {
      ".read": "auth != null",
      "$uid": {
        ".read": "auth != null && (auth.uid === $uid || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')",
        ".write": "auth != null && (auth.uid === $uid || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')",
        "$chatId": {
          ".read": "auth != null && (auth.uid === $uid || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')",
          ".write": "auth != null && (auth.uid === $uid || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')"
        }
      }
    },
    "blocks": {
      ".read": "auth != null",
      "$uid": {
        ".read": "auth != null && (auth.uid === $uid || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')",
        ".write": "auth != null && (auth.uid === $uid || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')",
        "$otherUid": {
          ".read": "auth != null && (auth.uid === $uid || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')",
          ".write": "auth != null && (auth.uid === $uid || auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43')"
        }
      }
    },
    "reports": {
      ".read": "auth != null && auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43'",
      ".write": "auth != null",
      "$reportId": {
        ".read": "auth != null && auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43'",
        ".write": "auth != null"
      }
    },
    "settings": {
      ".read": true,
      ".write": "auth != null && auth.uid === 'EqI2wKJjJ0hQ0VWg8SaFssooWk43'"
    }
  }
}
```

---

## 📁 Key File Structure (Explorer Map)

```text
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── appeal-evaluate/route.ts  # Fast 1-min AI unblock & 5-mistakes policy evaluator
│   │   │   ├── group/route.ts            # Main Community AI Assistant (@community & @close)
│   │   │   ├── personal/route.ts         # Dedicated Personal AI Assistant chat API
│   │   │   └── test/route.ts             # Admin AI prompt testing
│   │   └── admin/
│   │       └── check/route.ts            # Server-side Admin UID check (EqI2wKJjJ0hQ0VWg8SaFssooWk43)
│   ├── globals.css                       # Modern Tailwind CSS styling & animations
│   ├── layout.tsx                        # Root layout with ThemeProvider & AuthProvider
│   └── page.tsx                          # App Entry Point rendering CommunityApp
├── components/
│   ├── AdminDashboard.tsx                # Complete Admin Panel (Users, 1-Click Ban/Unban, Appeals, Moderation)
│   ├── AuthScreen.tsx                    # Email/Password + Google Sign-In with Drag-and-Drop Avatars
│   ├── BlockedAccountScreen.tsx          # Account Suspended UI with Fast AI 1-Min Review & Auto-Unblock
│   ├── CommunityApp.tsx                  # Core app view router (Group, AI, Private Chat, Admin, Blocked)
│   ├── MainGroupChat.tsx                 # Real-time Community Chat with @community AI Commands & Google Drive cards
│   ├── Navbar.tsx                        # Glassmorphism Top Navigation Bar & Live Online Presence
│   ├── PersonalAiChat.tsx                # Independent Personal AI Assistant Chat with Local Storage backup
│   ├── PrivateChat.tsx                   # 1-to-1 Human Chat with offline delivery & per-user delete
│   ├── ProfileModal.tsx                  # User Profile management & gender/avatar update
│   ├── SetupProfileModal.tsx             # Interactive Drag-and-Drop Onboarding Modal
│   └── Sidebar.tsx                       # Dynamic sidebar for Group, AI Assistant, and Direct Messages
├── context/
│   ├── AuthContext.tsx                   # Firebase Auth State, Realtime presence, & Admin validation
│   └── ThemeContext.tsx                  # Dark/Light theme provider
├── lib/
│   ├── firebase.ts                       # Dual Firebase client (Env vars + in-app config modal fallback)
│   ├── gemini-server.ts                  # Server-side Google GenAI client with automatic model fallback
│   ├── types.ts                          # Comprehensive TypeScript definitions
│   └── utils.ts                          # Storage wrappers, date formatters, and helpers
├── database.rules.json                   # Tested Realtime Database Security Rules
├── next.config.ts                        # Next.js configuration optimized for Vercel and AI Studio
└── package.json                          # Dependencies & build scripts
```

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getDatabase, Database } from 'firebase/database';
import { FirebaseClientConfig } from './types';

const STORAGE_KEY = 'community_firebase_client_config';

export function getStoredFirebaseConfig(): FirebaseClientConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.apiKey && parsed.projectId && parsed.databaseURL) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading stored Firebase config', err);
  }
  return null;
}

export function saveStoredFirebaseConfig(config: FirebaseClientConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getActiveFirebaseConfig(): FirebaseClientConfig {
  const stored = getStoredFirebaseConfig();
  if (stored) return stored;

  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDNlURd1v-OPsBKHA615iRaFR-8PuD-9UQ',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'code-chat-791b6.firebaseapp.com',
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://code-chat-791b6-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'code-chat-791b6',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'code-chat-791b6.firebasestorage.app',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '471654350174',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:471654350174:web:a8fe1c96d6ff12d54823cf',
  };
}

export function isFirebaseConfigured(): boolean {
  const config = getActiveFirebaseConfig();
  return Boolean(
    config.apiKey &&
    config.apiKey !== 'your-firebase-api-key' &&
    config.apiKey !== 'MY_API_KEY' &&
    config.databaseURL &&
    config.databaseURL.startsWith('https://')
  );
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let rtdb: Database | null = null;

export function getFirebaseInstances(): {
  app: FirebaseApp | null;
  auth: Auth | null;
  rtdb: Database | null;
  configured: boolean;
} {
  const configured = isFirebaseConfigured();
  if (!configured) {
    return { app: null, auth: null, rtdb: null, configured: false };
  }

  try {
    if (!getApps().length) {
      const config = getActiveFirebaseConfig();
      app = initializeApp(config);
    } else {
      app = getApp();
    }

    if (!auth && app) {
      auth = getAuth(app);
    }
    if (!rtdb && app) {
      rtdb = getDatabase(app);
    }

    return { app, auth, rtdb, configured: true };
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return { app: null, auth: null, rtdb: null, configured: false };
  }
}

// Reset instances if user updates config in the UI
export function resetFirebaseInstance(newConfig?: FirebaseClientConfig) {
  if (newConfig) {
    saveStoredFirebaseConfig(newConfig);
  }
  app = null;
  auth = null;
  rtdb = null;
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

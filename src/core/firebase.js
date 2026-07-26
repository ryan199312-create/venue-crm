import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// 🛑 PREVENT CRASH: Only initialize if no app exists
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// --- App Check (anti-abuse) ---
// Attests that requests come from THIS app (not a bot/script) before Firestore,
// Storage and callable Functions will honour them. This is a no-op until a
// reCAPTCHA v3 site key is provided via VITE_APPCHECK_RECAPTCHA_KEY, so the app
// keeps working before the key is registered. Do NOT turn on backend enforcement
// until this is live and tokens are flowing (see console App Check metrics).
const appCheckSiteKey = import.meta.env.VITE_APPCHECK_RECAPTCHA_KEY;
if (appCheckSiteKey && typeof window !== 'undefined') {
  // Optional: allow a debug token in local dev (set in the browser console).
  if (import.meta.env.DEV && typeof self !== 'undefined') {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = self.FIREBASE_APPCHECK_DEBUG_TOKEN ?? true;
  }
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (e) {
    console.warn('[AppCheck] init skipped:', e?.message || e);
  }
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'asia-east2');
export default app;

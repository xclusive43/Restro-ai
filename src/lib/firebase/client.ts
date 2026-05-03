import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getDatabase, type Database } from "firebase/database";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// ---------------------------------------------------------------------------
// Environment variable validation
// ---------------------------------------------------------------------------
const requiredEnvVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

// Check for missing env vars at module load time (dev-friendly)
if (process.env.NODE_ENV !== "production") {
  const missing = Object.entries(requiredEnvVars)
    .filter(([, value]) => !value)
    .map(([key]) => `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, "_$1").toUpperCase()}`);

  if (missing.length > 0) {
    console.warn(
      `[Firebase Client] Missing environment variables:\n  ${missing.join("\n  ")}\n` +
        `  Please check your .env.local file.`
    );
  }
}

// ---------------------------------------------------------------------------
// Firebase config
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey,
  authDomain: requiredEnvVars.authDomain,
  projectId: requiredEnvVars.projectId,
  storageBucket: requiredEnvVars.storageBucket,
  messagingSenderId: requiredEnvVars.messagingSenderId,
  appId: requiredEnvVars.appId,
  // Optional: Realtime Database URL (required only if using Realtime DB)
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// ---------------------------------------------------------------------------
// Singleton initialisation — prevents re-initialising on hot reload (Next.js)
// ---------------------------------------------------------------------------
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ---------------------------------------------------------------------------
// Service exports — lazily bound to the singleton app
// ---------------------------------------------------------------------------
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const realtimeDb: Database = getDatabase(app);
export const storage: FirebaseStorage = getStorage(app);

export default app;

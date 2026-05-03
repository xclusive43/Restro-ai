/**
 * Firebase Admin SDK — SERVER ONLY
 *
 * ⚠️  Never import this file in Client Components or any file that runs in
 *     the browser. It relies on secret env vars (no NEXT_PUBLIC_ prefix) and
 *     the `firebase-admin` package which is Node.js-only.
 *
 * Usage:
 *   import { adminAuth, adminDb, adminStorage } from "@/lib/firebase/admin";
 */

import { cert, getApps, getApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { getDatabase, type Database } from "firebase-admin/database";

// ---------------------------------------------------------------------------
// Environment variable validation (server-side only)
// ---------------------------------------------------------------------------
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[Firebase Admin] Missing required environment variable: "${key}". ` +
        `Please add it to your .env.local file.`
    );
  }
  return value;
}

// ---------------------------------------------------------------------------
// Build the service-account credential from env vars
// (avoids committing a service account JSON file to version control)
// ---------------------------------------------------------------------------
function buildCredential() {
  const privateKey = getRequiredEnv("FIREBASE_PRIVATE_KEY")
    // Handle escaped newlines that can occur when passing keys via env vars
    .replace(/\\n/g, "\n");

  return cert({
    projectId: getRequiredEnv("FIREBASE_PROJECT_ID"),
    clientEmail: getRequiredEnv("FIREBASE_CLIENT_EMAIL"),
    privateKey,
  });
}

// ---------------------------------------------------------------------------
// Singleton initialisation — safe across Next.js hot reloads in dev
// ---------------------------------------------------------------------------
function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp({
    credential: buildCredential(),
    // Optional: Realtime Database URL
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    // Optional: default Storage bucket
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const adminApp: App = getAdminApp();

// ---------------------------------------------------------------------------
// Service exports
// ---------------------------------------------------------------------------

/** Firebase Admin Auth — verify ID tokens, manage users server-side */
export const adminAuth: Auth = getAuth(adminApp);

/** Firebase Admin Firestore — full read/write, bypasses Security Rules */
export const adminDb: Firestore = getFirestore(adminApp);

/** Firebase Admin Storage — server-side file access */
export const adminStorage: Storage = getStorage(adminApp);

/** Firebase Admin Realtime Database — fast live updates */
export const adminRealtimeDb: Database = getDatabase(adminApp);

export default adminApp;

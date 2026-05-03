/**
 * Firebase Auth helpers — Client Side
 *
 * Centralises all authentication logic so components stay thin.
 * Import from here, never call firebase/auth directly in components.
 *
 * Usage:
 *   import { loginWithEmail, loginWithGoogle, getCurrentUser } from "@/lib/firebase/auth"
 */

import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInAnonymously,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile,
    getIdToken,
    getIdTokenResult,
    type User,
    type UserCredential,
    type IdTokenResult,
} from "firebase/auth";

import { auth } from "./client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Roles used across the restaurant app — mirrors Firestore custom claims */
export type UserRole = "admin" | "staff" | "customer" | "guest";

export interface AuthUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: UserRole;
    isAnonymous: boolean;
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

const googleProvider = new GoogleAuthProvider();
// Request email + profile scope so we always get displayName & photoURL
googleProvider.addScope("profile");
googleProvider.addScope("email");

// ---------------------------------------------------------------------------
// Sign-in / Sign-up
// ---------------------------------------------------------------------------

/** Email + password login */
export const loginWithEmail = (
    email: string,
    password: string
): Promise<UserCredential> => signInWithEmailAndPassword(auth, email, password);

/** Email + password sign-up (creates a new account) */
export const registerWithEmail = (
    email: string,
    password: string
): Promise<UserCredential> =>
    createUserWithEmailAndPassword(auth, email, password);

/** Google OAuth popup */
export const loginWithGoogle = (): Promise<UserCredential> =>
    signInWithPopup(auth, googleProvider);

/** Anonymous / guest sign-in */
export const loginAsGuest = (): Promise<UserCredential> =>
    signInAnonymously(auth);

// ---------------------------------------------------------------------------
// Sign-out
// ---------------------------------------------------------------------------

export const logout = (): Promise<void> => signOut(auth);

// ---------------------------------------------------------------------------
// Auth state observer
// ---------------------------------------------------------------------------

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function — call it in useEffect cleanup.
 *
 * @example
 * useEffect(() => {
 *   const unsub = onAuthChange((user) => setUser(user));
 *   return unsub;
 * }, []);
 */
export const onAuthChange = (
    callback: (user: User | null) => void
): (() => void) => onAuthStateChanged(auth, callback);

// ---------------------------------------------------------------------------
// Current user helpers
// ---------------------------------------------------------------------------

/** Returns the currently signed-in user (null if not authenticated) */
export const getCurrentUser = (): User | null => auth.currentUser;

/**
 * Returns the Firebase ID token for the current user.
 * Pass this as a Bearer token to your API routes for server-side verification.
 *
 * @param forceRefresh — set true to always fetch a fresh token (default: false)
 */
export const getAuthToken = async (forceRefresh = false): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) return null;
    return getIdToken(user, forceRefresh);
};

/**
 * Returns the decoded ID token including custom claims (e.g. role).
 * Useful for client-side role checks without an extra Firestore read.
 */
export const getTokenClaims = async (): Promise<IdTokenResult | null> => {
    const user = auth.currentUser;
    if (!user) return null;
    return getIdTokenResult(user);
};

/**
 * Extract the user's role from custom claims set by the Admin SDK.
 * Falls back to "customer" if no role claim exists.
 */
export const getUserRole = async (): Promise<UserRole> => {
    const token = await getTokenClaims();
    return (token?.claims?.role as UserRole) ?? "customer";
};

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/**
 * Update the current user's display name and/or photo URL.
 *
 * @example
 * await updateUserProfile({ displayName: "Ajay" });
 */
export const updateUserProfile = (updates: {
    displayName?: string;
    photoURL?: string;
}): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("[Auth] No authenticated user to update.");
    return updateProfile(user, updates);
};

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

/**
 * Sends a password-reset email to the given address.
 * Silently succeeds even if the email is not registered (Firebase behaviour)
 * to prevent user enumeration.
 */
export const sendPasswordReset = (email: string): Promise<void> =>
    sendPasswordResetEmail(auth, email);

// ---------------------------------------------------------------------------
// Serialisation helper
// ---------------------------------------------------------------------------

/**
 * Converts a Firebase User object into a plain serialisable AuthUser.
 * Safe to store in Zustand / pass as props.
 */
export const toAuthUser = async (user: User): Promise<AuthUser> => {
    const role = await getUserRole();
    return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role,
        isAnonymous: user.isAnonymous,
    };
};
"use client";

/**
 * useAuth — Global authentication hook
 *
 * - Listens to Firebase Auth state in real time
 * - Auto-creates a Firestore user document on first login / sign-up
 * - Exposes the serialisable AuthUser, loading state, and role helpers
 *
 * Usage:
 *   const { user, role, loading, isAdmin, isStaff } = useAuth()
 */

import { useEffect, useState } from "react";
import { type User } from "firebase/auth";
import { toast } from "sonner";

import { onAuthChange, logout, type UserRole, type AuthUser } from "@/lib/firebase/auth";
import { createUserDoc, getUserRole, getDocById, Collections } from "@/lib/firebase/firestore";
import { type UserDoc } from "@/types/index";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseAuthReturn {
    /** Raw Firebase User object — null if signed out */
    firebaseUser: User | null;
    /** Serialisable user ready for Zustand / props */
    user: AuthUser | null;
    /** Role from Firestore — null while loading or signed out */
    role: UserRole | null;
    /** True while the initial auth state is being determined */
    loading: boolean;
    /** True if account has been blocked by admin */
    isBlocked: boolean;
    /** Convenience role checks */
    isAdmin: boolean;
    isStaff: boolean;
    isCustomer: boolean;
    isGuest: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): UseAuthReturn {
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [isBlocked, setIsBlocked] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Subscribe to Firebase Auth state
        const unsubscribe = onAuthChange(async (fbUser: User | null) => {
            if (!fbUser) {
                setFirebaseUser(null);
                setUser(null);
                setRole(null);
                setIsBlocked(false);
                setLoading(false);
                return;
            }

            setFirebaseUser(fbUser);

            try {
                // Auto-create user document on first login (no-op if already exists)
                await createUserDoc(fbUser.uid, {
                    displayName: fbUser.displayName ?? fbUser.email ?? "Guest",
                    email: fbUser.email ?? "",
                    photoURL: fbUser.photoURL,
                });

                // Read full user doc to check role + blocked status
                const userDoc = await getDocById<UserDoc>(Collections.USERS, fbUser.uid);
                const rawRole = userDoc?.role ?? "customer";
                const resolvedRole: UserRole = (rawRole.toLowerCase() as UserRole);
                const blocked = userDoc?.isBlocked === true;

                // Blocked → sign out immediately
                if (blocked) {
                    setIsBlocked(true);
                    setLoading(false);
                    await logout();
                    return;
                }

                setRole(resolvedRole);
                setIsBlocked(false);

                setUser({
                    uid: fbUser.uid,
                    email: fbUser.email,
                    displayName: fbUser.displayName,
                    photoURL: fbUser.photoURL,
                    isAnonymous: fbUser.isAnonymous,
                    role: resolvedRole,
                });
            } catch (err: any) {
                console.error("[useAuth] Failed to sync user document:", err);
                toast.error(`Auth Error: ${err.message}`);
                setUser({
                    uid: fbUser.uid,
                    email: fbUser.email,
                    displayName: fbUser.displayName,
                    photoURL: fbUser.photoURL,
                    isAnonymous: fbUser.isAnonymous,
                    role: "customer",
                });
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    return {
        firebaseUser,
        user,
        role,
        loading,
        isBlocked,
        isAdmin: role === "admin",
        isStaff: role === "staff",
        isCustomer: role === "customer",
        isGuest: role === "guest" || firebaseUser?.isAnonymous === true,
    };
}

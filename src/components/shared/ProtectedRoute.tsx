"use client";

/**
 * ProtectedRoute — Role-aware route guard
 *
 * Wraps any page/layout to enforce authentication and optional role access.
 * Redirects unauthenticated users to /login and unauthorised roles to /unauthorized.
 *
 * Usage:
 *   // Auth only (any signed-in user)
 *   <ProtectedRoute>{children}</ProtectedRoute>
 *
 *   // Restrict to specific roles
 *   <ProtectedRoute allowedRoles={["admin"]}>{children}</ProtectedRoute>
 *   <ProtectedRoute allowedRoles={["admin", "staff"]}>{children}</ProtectedRoute>
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { type UserRole } from "@/lib/firebase/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProtectedRouteProps {
    /** Page / layout content to render when access is granted */
    children: React.ReactNode;
    /**
     * Roles allowed to access this route.
     * If omitted, any authenticated user (including guests) can access.
     */
    allowedRoles?: UserRole[];
    /** Override the redirect path for unauthenticated users (default: /login) */
    redirectTo?: string;
    /** Override the redirect path for unauthorised roles (default: /unauthorized) */
    unauthorizedRedirect?: string;
    /** Custom loading UI. Defaults to a centered full-screen spinner. */
    fallback?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Loading spinner (default fallback)
// ---------------------------------------------------------------------------

function DefaultLoader() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div
                    className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"
                    role="status"
                    aria-label="Loading"
                />
                <p className="text-sm text-muted-foreground">Verifying access…</p>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// ProtectedRoute
// ---------------------------------------------------------------------------

export default function ProtectedRoute({
    children,
    allowedRoles,
    redirectTo = "/login",
    unauthorizedRedirect = "/unauthorized",
    fallback,
}: ProtectedRouteProps) {
    const { user, role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Still resolving auth state — wait
        if (loading) return;

        // Not signed in → redirect to login
        if (!user) {
            router.replace(redirectTo);
            return;
        }

        // Role restriction specified — check access
        if (allowedRoles && allowedRoles.length > 0) {
            const hasAccess = role !== null && allowedRoles.includes(role);
            if (!hasAccess) {
                router.replace(unauthorizedRedirect);
            }
        }
    }, [loading, user, role, allowedRoles, redirectTo, unauthorizedRedirect, router]);

    // Show loader while resolving auth
    if (loading) {
        return <>{fallback ?? <DefaultLoader />}</>;
    }

    // Not signed in — render nothing while redirect is in progress
    if (!user) return null;

    // Role check failed — render nothing while redirect is in progress
    if (allowedRoles && allowedRoles.length > 0) {
        const hasAccess = role !== null && allowedRoles.includes(role);
        if (!hasAccess) return null;
    }

    // Access granted ✓
    return <>{children}</>;
}

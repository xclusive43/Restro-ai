"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import {
    loginWithEmail,
    loginWithGoogle,
    loginAsGuest,
} from "@/lib/firebase/auth";
import { getDocById, Collections } from "@/lib/firebase/firestore";
import { type UserDoc } from "@/types/index";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Google icon (inline SVG — no extra dep)
// ---------------------------------------------------------------------------

function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LoginPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<"email" | "google" | "guest" | null>(null);

    // Redirect if already signed in (handles page refresh while logged in)
    useEffect(() => {
        if (!authLoading && user) {
            router.replace(getRoleRedirect(user.role));
        }
    }, [user, authLoading, router]);

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    function getRoleRedirect(role: string) {
        console.log(role);
        const normalizedRole = (role ?? "").toLowerCase();
        if (normalizedRole === "admin") return "/admin";
        if (normalizedRole === "staff") return "/staff/dashboard";
        return "/menu";
    }

    /** After a successful Firebase Auth call, fetch role from Firestore and redirect */
    async function redirectAfterLogin(uid: string) {
        // Brief pause to let Firebase Auth token propagate to Firestore security rules
        await new Promise((r) => setTimeout(r, 400));
        try {
            const userDoc = await getDocById<UserDoc>(Collections.USERS, uid);
            const role = (userDoc?.role ?? "customer").toLowerCase();
            const dest = getRoleRedirect(role);
            // Hard navigation — bypasses any Next.js router caching/redirect issues
            window.location.href = dest;
        } catch (err: unknown) {
            const msg = (err as Error)?.message ?? "Unknown error";
            toast.error(`Login redirect failed: ${msg}`);
            setLoading(null);
        }
    }

    function getErrorMessage(code: string): string {
        const map: Record<string, string> = {
            "auth/invalid-credential": "Incorrect email or password.",
            "auth/user-not-found": "No account found with this email.",
            "auth/wrong-password": "Incorrect password.",
            "auth/too-many-requests": "Too many attempts. Please try again later.",
            "auth/user-disabled": "This account has been disabled.",
            "auth/popup-closed-by-user": "Google sign-in was cancelled.",
            "auth/network-request-failed": "Network error. Check your connection.",
        };
        return map[code] ?? "Something went wrong. Please try again.";
    }

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------

    async function handleEmailLogin(e: React.FormEvent) {
        e.preventDefault();
        if (!email || !password) return;

        setError(null);
        setLoading("email");
        try {
            const cred = await loginWithEmail(email, password);
            // Fetch role directly from Firestore and redirect immediately
            await redirectAfterLogin(cred.user.uid);
        } catch (err: unknown) {
            const code = (err as { code?: string }).code ?? "";
            setError(getErrorMessage(code));
            setLoading(null);
        }
    }

    async function handleGoogleLogin() {
        setError(null);
        setLoading("google");
        try {
            const cred = await loginWithGoogle();
            // Fetch role directly from Firestore and redirect immediately
            await redirectAfterLogin(cred.user.uid);
        } catch (err: unknown) {
            const code = (err as { code?: string }).code ?? "";
            setError(getErrorMessage(code));
            setLoading(null);
        }
    }

    async function handleGuestLogin() {
        setError(null);
        setLoading("guest");
        try {
            await loginAsGuest();
            router.replace("/menu");
        } catch (err: unknown) {
            const code = (err as { code?: string }).code ?? "";
            setError(getErrorMessage(code));
        } finally {
            setLoading(null);
        }
    }

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    const isAnyLoading = loading !== null;

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
            {/* Background decorative blobs */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-orange-500/10 blur-3xl"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-orange-400/10 blur-3xl"
            />

            <div className="relative z-10 w-full max-w-md">
                {/* Logo / brand */}
                <div className="mb-8 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 shadow-xl shadow-orange-500/20 animate-bounce">
                            <span className="text-3xl">🍽️</span>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        Welcome Back
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Sign in to continue to the admin dashboard
                    </p>
                </div>

                <Card className="border-border/60 shadow-2xl shadow-black/5">
                    <CardHeader className="space-y-1 pb-4">
                        <CardTitle className="text-xl font-semibold">Welcome back</CardTitle>
                        <CardDescription>Sign in to your account to continue</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-5">
                        {/* Google */}
                        <Button
                            id="btn-google-login"
                            type="button"
                            variant="outline"
                            className="w-full gap-2 font-medium"
                            onClick={handleGoogleLogin}
                            disabled={isAnyLoading}
                            aria-label="Sign in with Google"
                        >
                            {loading === "google" ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                                <GoogleIcon />
                            )}
                            Continue with Google
                        </Button>

                        {/* Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-card px-2 text-muted-foreground">or sign in with email</span>
                            </div>
                        </div>

                        {/* Email form */}
                        <form onSubmit={handleEmailLogin} className="space-y-4" noValidate>
                            <div className="space-y-1">
                                <label htmlFor="email" className="text-sm font-medium text-foreground">
                                    Email
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isAnyLoading}
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="password" className="text-sm font-medium text-foreground">
                                        Password
                                    </label>
                                    <Link
                                        href="/forgot-password"
                                        className="text-xs text-orange-500 hover:text-orange-600 transition-colors"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isAnyLoading}
                                        required
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Error message */}
                            {error && (
                                <div
                                    role="alert"
                                    className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                    {error}
                                </div>
                            )}

                            <Button
                                id="btn-email-login"
                                type="submit"
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium shadow-sm shadow-orange-500/20 transition-all"
                                disabled={isAnyLoading || !email || !password}
                            >
                                {loading === "email" ? (
                                    <span className="flex items-center gap-2">
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Signing in…
                                    </span>
                                ) : (
                                    "Sign in"
                                )}
                            </Button>
                        </form>

                        {/* Guest access */}
                        <Button
                            id="btn-guest-login"
                            type="button"
                            variant="ghost"
                            className="w-full text-muted-foreground hover:text-foreground text-sm"
                            onClick={handleGuestLogin}
                            disabled={isAnyLoading}
                        >
                            {loading === "guest" ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Entering as guest…
                                </span>
                            ) : (
                                "Browse menu as guest →"
                            )}
                        </Button>

                        {/* Sign-up link */}
                        <p className="text-center text-sm text-muted-foreground">
                            Don&apos;t have an account?{" "}
                            <Link
                                href="/register"
                                className="font-medium text-orange-500 hover:text-orange-600 transition-colors"
                            >
                                Create one
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}

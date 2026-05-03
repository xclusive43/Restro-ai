"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function NotFound() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [redirecting, setRedirecting] = useState(false);

    useEffect(() => {
        // Wait until auth state is loaded before deciding where to redirect
        if (!loading && !redirecting) {
            setRedirecting(true);
            
            // Allow a small delay so the user understands they hit a bad URL
            const timer = setTimeout(() => {
                const normalizedRole = user?.role?.toLowerCase();
                if (normalizedRole === "admin") {
                    router.replace("/admin");
                } else if (normalizedRole === "staff") {
                    router.replace("/staff/dashboard");
                } else {
                    router.replace("/");
                }
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, [user, loading, router, redirecting]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
            <div className="text-6xl mb-4">🧭</div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Page Not Found</h1>
            <p className="text-muted-foreground max-w-md">
                Looks like you've wandered into an unknown area. Don't worry, we are redirecting you back to your dashboard...
            </p>
            
            <div className="mt-8">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                    <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                        Loading...
                    </span>
                </div>
            </div>
        </div>
    );
}

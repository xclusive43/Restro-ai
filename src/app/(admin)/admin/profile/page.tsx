"use client";

import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/firebase/auth";

export default function AdminProfilePage() {
    const { user } = useAuth();

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Admin Profile</h1>
                <p className="text-sm text-muted-foreground">Manage your account and credentials</p>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
                    {/* Avatar */}
                    <div className="shrink-0">
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="Admin" className="w-24 h-24 rounded-full border-4 border-muted shadow-sm" />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 text-4xl font-bold border-4 border-muted shadow-sm">
                                {user?.displayName?.[0]?.toUpperCase() || "A"}
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-4 w-full">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">{user?.displayName || "Super Admin"}</h2>
                            <p className="text-muted-foreground">{user?.email}</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                            <span className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-bold uppercase tracking-wider">
                                Active
                            </span>
                            <span className="px-3 py-1 bg-orange-500/10 text-orange-600 rounded-full text-xs font-bold uppercase tracking-wider">
                                Root Access
                            </span>
                        </div>

                        <div className="pt-4 mt-4 border-t border-border">
                            <h3 className="text-sm font-semibold text-foreground mb-2">Account Details</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">User ID</p>
                                    <p className="font-mono text-xs mt-0.5 truncate">{user?.uid || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Provider</p>
                                    <p className="font-medium mt-0.5 capitalize">{user?.providerData?.[0]?.providerId.replace('.com', '') || "Email/Password"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="text-red-500 font-semibold">Danger Zone</h3>
                    <p className="text-sm text-muted-foreground">Sign out of the admin panel</p>
                </div>
                <button 
                    onClick={logout}
                    className="px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors shrink-0"
                >
                    Sign Out Now
                </button>
            </div>
        </div>
    );
}

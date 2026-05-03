"use client";

/**
 * Admin Layout
 * Protected — only "admin" role can access.
 * Renders a responsive sidebar + top-bar shell around admin pages.
 */

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import ProtectedRoute from "@/components/shared/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/firebase/auth";
import { useSettingsStore } from "@/store/settingsStore";

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
    {
        label: "Dashboard",
        href: "/admin",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
        ),
    },
    {
        label: "Orders",
        href: "/admin/orders",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>
            </svg>
        ),
    },
    {
        label: "Menu Items",
        href: "/admin/menu",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
            </svg>
        ),
    },
    {
        label: "Categories",
        href: "/admin/categories",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/>
            </svg>
        ),
    },
    {
        label: "Staff",
        href: "/admin/staff",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
        ),
    },
    {
        label: "Settings",
        href: "/admin/settings",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
            </svg>
        ),
    },
    {
        label: "Offers",
        href: "/admin/offers",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
        ),
    },
    {
        label: "Audit Logs",
        href: "/admin/audit",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
        ),
    },
] as const;

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
    const pathname = usePathname();
    const { user } = useAuth();

    const settings = useSettingsStore(s => s.settings) || { restaurantName: "RestroAI", restaurantIcon: "🍽️" };
    const settingsLoading = useSettingsStore(s => s.loading);

    const handleLogout = async () => {
        await logout();
    };

    return (
        <>
            {/* Mobile overlay */}
            {open && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar panel */}
            <aside
                className={[
                    "fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-zinc-900 transition-transform duration-300 ease-in-out",
                    "lg:static lg:translate-x-0",
                    open ? "translate-x-0" : "-translate-x-full",
                ].join(" ")}
                aria-label="Admin navigation"
            >
                {/* Brand */}
                <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
                    {settingsLoading ? (
                        <div className="flex items-center gap-3 animate-pulse w-full">
                            <div className="h-8 w-8 rounded-lg bg-white/10"></div>
                            <div className="h-4 w-24 bg-white/10 rounded"></div>
                            <div className="ml-auto h-4 w-10 rounded-full bg-white/10"></div>
                        </div>
                    ) : (
                        <>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-sm shadow-md shadow-orange-500/30">
                                {settings.restaurantIcon}
                            </div>
                            <span className="text-base font-semibold tracking-tight text-white truncate max-w-[120px]">
                                {settings.restaurantName}
                            </span>
                            <span className="ml-auto rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-orange-400">
                                Admin
                            </span>
                        </>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
                    {NAV_ITEMS.map((item) => {
                        const isActive =
                            item.href === "/admin"
                                ? pathname === "/admin"
                                : pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={[
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                                    isActive
                                        ? "bg-orange-500/15 text-orange-400"
                                        : "text-zinc-400 hover:bg-white/5 hover:text-white",
                                ].join(" ")}
                                aria-current={isActive ? "page" : undefined}
                            >
                                <span className={isActive ? "text-orange-400" : "text-zinc-500"}>
                                    {item.icon}
                                </span>
                                {item.label}

                                {isActive && (
                                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-orange-400" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User + logout */}
                <div className="border-t border-white/10 p-4">
                    <Link href="/admin/profile" onClick={onClose} className="mb-3 flex items-center gap-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors px-3 py-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-sm font-semibold text-orange-400">
                            {user?.displayName?.[0]?.toUpperCase() ?? "A"}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                                {user?.displayName ?? "Admin"}
                            </p>
                            <p className="truncate text-xs text-zinc-500">{user?.email}</p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </Link>

                    <Link
                        href="/"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-all hover:bg-white/5 hover:text-white mb-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                        Back to Website
                    </Link>

                    <button
                        id="btn-admin-logout"
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-all hover:bg-red-500/10 hover:text-red-400"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Sign out
                    </button>
                </div>
            </aside>
        </>
    );
}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
    const pathname = usePathname();

    const currentLabel =
        NAV_ITEMS.find((item) =>
            item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href)
        )?.label ?? "Admin";

    return (
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background px-4 lg:px-6">
            {/* Mobile hamburger */}
            <button
                id="btn-admin-mobile-menu"
                type="button"
                onClick={onMenuClick}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors lg:hidden"
                aria-label="Open menu"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
            </button>

            {/* Page title */}
            <h1 className="text-base font-semibold text-foreground">{currentLabel}</h1>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Live indicator */}
            <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600 dark:text-green-400">
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                Live
            </div>
        </header>
    );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <div className="flex h-screen overflow-hidden bg-background">
                {/* Sidebar */}
                <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                {/* Main content area */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    <TopBar onMenuClick={() => setSidebarOpen(true)} />

                    <main
                        id="admin-main-content"
                        className="flex-1 overflow-y-auto p-4 lg:p-6"
                    >
                        {children}
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}

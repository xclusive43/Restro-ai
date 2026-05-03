"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import CategoryTabs from "@/components/menu/CategoryTabs";
import MenuGrid from "@/components/menu/MenuGrid";
import BannerSlider from "@/components/menu/BannerSlider";
import CartDrawer from "@/components/cart/CartDrawer";
import { useCartStore } from "@/store/cartStore";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { loginWithGoogle } from "@/lib/firebase/auth";
import { useSettingsStore } from "@/store/settingsStore";

function TableTracker() {
    const searchParams = useSearchParams();
    const tableId = searchParams.get("tableId");
    const setTableId = useCartStore((s) => s.setTableId);

    useEffect(() => {
        if (tableId) {
            setTableId(tableId);
            console.log("Table ID captured:", tableId);
        }
    }, [tableId, setTableId]);

    return null;
}

export default function CustomerPage() {
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const itemCount = useCartStore((s) => s.itemCount());
    const openCart = useCartStore((s) => s.openCart);
    const activeOrderId = useCartStore((s) => s.activeOrderId);
    const { user, isGuest, loading: authLoading } = useAuth();
    const searchInputRef = useRef<HTMLInputElement>(null);

    const settings = useSettingsStore(s => s.settings) || { restaurantName: "RestroAI", restaurantIcon: "🍽️", isOpen: true };
    const settingsLoading = useSettingsStore(s => s.loading);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Safety net: if an admin or staff lands on the customer root, redirect them
    useEffect(() => {
        if (authLoading) return;
        const role = (user?.role ?? "").toLowerCase();
        if (role === "admin") {
            window.location.href = "/admin";
        } else if (role === "staff") {
            window.location.href = "/staff/dashboard";
        }
    }, [user, authLoading]);


    return (
        <div className="min-h-screen bg-background pb-24 md:pb-0">
            <Suspense fallback={null}>
                <TableTracker />
            </Suspense>
            {/* Header */}
            <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
                <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
                    {settingsLoading ? (
                        <div className="flex items-center gap-3 animate-pulse">
                            <div className="w-8 h-8 rounded-full bg-muted"></div>
                            <div className="space-y-2">
                                <div className="h-4 w-24 bg-muted rounded"></div>
                                <div className="h-3 w-32 bg-muted rounded"></div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">{settings.restaurantIcon}</span>
                            <div>
                                <h1 className="text-xl font-bold text-foreground">{settings.restaurantName}</h1>
                                <p className="text-xs text-muted-foreground">Order to your table instantly</p>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                        {/* Live Tracker Button */}
                        {isMounted && activeOrderId && (
                            <Link 
                                href={`/track/${activeOrderId}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 transition-colors text-xs font-bold"
                            >
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                </span>
                                Track Order
                            </Link>
                        )}

                        {/* Account / Login Button */}
                        {isMounted && (!user || isGuest ? (
                            <button
                                onClick={() => loginWithGoogle()}
                                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                            >
                                Login
                            </button>
                        ) : (
                            <Link
                                href="/account"
                                className="text-xs font-semibold flex items-center gap-2 px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                            >
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="Profile" className="w-6 h-6 rounded-full" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        {user.displayName?.[0]?.toUpperCase() || "U"}
                                    </div>
                                )}
                            </Link>
                        ))}

                        {/* Cart button */}
                        <button
                            onClick={openCart}
                        className="relative p-2 rounded-full bg-muted text-foreground hover:bg-muted/80 transition-colors"
                        aria-label="Open cart"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        {isMounted && itemCount > 0 && (
                            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-orange-500 rounded-full">
                                {itemCount}
                            </span>
                        )}
                    </button>
                </div>
                </div>

                {/* Search bar row */}
                <div className="px-3 pb-2 max-w-7xl mx-auto">
                    {searchOpen ? (
                        <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 ring-1 ring-orange-400/40 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            <input
                                ref={searchInputRef}
                                id="menu-search-input"
                                type="search"
                                placeholder="Search dishes, drinks…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                                autoFocus
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                                    aria-label="Clear search"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                    </svg>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => { setSearchOpen(false); setSearch(""); }}
                                className="text-xs font-medium text-muted-foreground hover:text-foreground ml-1 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="flex-1 overflow-hidden">
                                <CategoryTabs selected={categoryId} onSelect={setCategoryId} />
                            </div>
                            <button
                                id="btn-open-search"
                                type="button"
                                onClick={() => setSearchOpen(true)}
                                className="shrink-0 flex items-center justify-center h-9 w-9 rounded-full bg-muted hover:bg-orange-500/10 hover:text-orange-600 text-muted-foreground transition-all"
                                aria-label="Search menu"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Banner Slider — shows active promotional offers */}
            <BannerSlider />

            {/* Main Menu Grid */}
            <main className="px-4 py-6 max-w-7xl mx-auto">
                {/* Search context label */}
                {search.trim() && (
                    <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        Results for <span className="font-semibold text-foreground">&ldquo;{search.trim()}&rdquo;</span>
                    </div>
                )}
                <MenuGrid categoryId={categoryId} search={search} />
            </main>

            {/* Cart Drawer Component */}
            <CartDrawer />
        </div>
    );
}

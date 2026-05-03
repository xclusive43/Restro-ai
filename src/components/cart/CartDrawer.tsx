"use client";

/**
 * CartDrawer — Mobile bottom sheet + Desktop side panel
 *
 * Mobile (<md): slides up from bottom, draggable handle
 * Desktop (≥md): slides in from right as fixed panel
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useCartStore } from "@/store/cartStore";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { loginWithGoogle, getCurrentUser } from "@/lib/firebase/auth";

function formatPrice(n: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(n);
}

// Constants removed in favor of useSettingsStore

export default function CartDrawer() {
    const items = useCartStore((s) => s.items);
    const isOpen = useCartStore((s) => s.isOpen);
    const closeCart = useCartStore((s) => s.closeCart);
    const updateQty = useCartStore((s) => s.updateQty);
    const removeItem = useCartStore((s) => s.removeItem);
    const clearCart = useCartStore((s) => s.clearCart);
    const total = useCartStore((s) => s.total);
    const itemCount = useCartStore((s) => s.itemCount);
    const setActiveOrderId = useCartStore((s) => s.setActiveOrderId);
    const getCartTotal = useCartStore((s) => s.getCartTotal);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const overlayRef = useRef<HTMLDivElement>(null);

    // Close on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeCart(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [closeCart]);

    // Prevent body scroll when open
    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    const { subtotal, gst, platformFee, total: grandTotal } = getCartTotal();
    const count = itemCount();
    const tableId = useCartStore((s) => s.tableId);

    return (
        <>
            {/* Backdrop */}
            <div
                ref={overlayRef}
                aria-hidden="true"
                onClick={closeCart}
                className={[
                    "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
                ].join(" ")}
            />

            {/* ── MOBILE: bottom sheet ─────────────────────────────────────── */}
            <div
                role="dialog"
                aria-label="Your cart"
                aria-modal="true"
                className={[
                    "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl bg-background shadow-2xl transition-transform duration-300 ease-out md:hidden",
                    "max-h-[85dvh]",
                    isOpen ? "translate-y-0" : "translate-y-full",
                ].join(" ")}
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="h-1 w-10 rounded-full bg-border" />
                </div>
                {isMounted && (
                    <CartContent
                        items={items}
                        count={count}
                        subtotal={subtotal}
                        gst={gst}
                        platformFee={platformFee}
                        grandTotal={grandTotal}
                        tableId={tableId}
                        onUpdateQty={updateQty}
                        onRemove={removeItem}
                        onClear={clearCart}
                        onClose={closeCart}
                        onSetActiveOrder={setActiveOrderId}
                    />
                )}
            </div>

            {/* ── DESKTOP: right panel ────────────────────────────────────── */}
            <div
                role="dialog"
                aria-label="Your cart"
                aria-modal="true"
                className={[
                    "fixed inset-y-0 right-0 z-50 hidden md:flex flex-col w-96 bg-background shadow-2xl transition-transform duration-300 ease-out",
                    isOpen ? "translate-x-0" : "translate-x-full",
                ].join(" ")}
            >
                {isMounted && (
                    <CartContent
                        items={items}
                        count={count}
                        subtotal={subtotal}
                        gst={gst}
                        platformFee={platformFee}
                        grandTotal={grandTotal}
                        tableId={tableId}
                        onUpdateQty={updateQty}
                        onRemove={removeItem}
                        onClear={clearCart}
                        onClose={closeCart}
                        onSetActiveOrder={setActiveOrderId}
                    />
                )}
            </div>
        </>
    );
}

// ---------------------------------------------------------------------------
// Inner content (shared between mobile + desktop)
// ---------------------------------------------------------------------------

interface ContentProps {
    items: ReturnType<typeof useCartStore>["items"];
    count: number;
    subtotal: number;
    gst: number;
    platformFee: number;
    grandTotal: number;
    tableId: string | null;
    onUpdateQty: (id: string, qty: number) => void;
    onRemove: (id: string) => void;
    onClear: () => void;
    onClose: () => void;
    onSetActiveOrder: (id: string) => void;
}

function CartContent({
    items, count, subtotal, gst, platformFee, grandTotal, tableId,
    onUpdateQty, onRemove, onClear, onClose, onSetActiveOrder
}: ContentProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [isPlacing, setIsPlacing] = useState(false);

    const handleCheckout = async () => {
        if (items.length === 0) return;

        let currentUid = user?.uid;

        // Enforce login
        if (!user || user.isAnonymous) {
            try {
                const cred = await loginWithGoogle();
                currentUid = cred.user.uid;
                toast.success("Logged in successfully! Processing order...");
            } catch (err: any) {
                toast.error("Google Login failed or was cancelled.");
                return;
            }
        }

        setIsPlacing(true);
        try {
            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: currentUid,
                    tableId,
                    items,
                    subtotal,
                    gst,
                    sgst: 0,
                    platformFee,
                    total: grandTotal,
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success("Order placed successfully!");
            onSetActiveOrder(data.orderId);
            onClear();
            onClose();
            router.push(`/track/${data.orderId}`);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to place order.");
        } finally {
            setIsPlacing(false);
        }
    };

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                    <h2 className="text-base font-semibold text-foreground">Your Cart</h2>
                    <p className="text-xs text-muted-foreground">
                        {count} item{count !== 1 ? "s" : ""}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {items.length > 0 && (
                        <button
                            type="button"
                            onClick={onClear}
                            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                        >
                            Clear all
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close cart"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="mb-4 text-5xl">🛒</div>
                        <p className="font-medium text-foreground">Cart is empty</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Add items from the menu to get started.
                        </p>
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.itemId} className="flex items-center gap-3">
                            {/* Image */}
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                                {item.image ? (
                                    <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" unoptimized />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-xl">🍽️</div>
                                )}
                            </div>

                            {/* Name + price */}
                            <div className="flex-1 min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatPrice(item.price)} × {item.qty}
                                </p>
                            </div>

                            {/* Qty controls */}
                            <div className="flex items-center gap-1 rounded-full bg-muted px-1 py-1">
                                <button
                                    type="button"
                                    onClick={() => onUpdateQty(item.itemId, item.qty - 1)}
                                    aria-label="Decrease"
                                    className="flex h-6 w-6 items-center justify-center rounded-full text-foreground hover:bg-background transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                </button>
                                <span className="min-w-[18px] text-center text-xs font-bold">{item.qty}</span>
                                <button
                                    type="button"
                                    onClick={() => onUpdateQty(item.itemId, item.qty + 1)}
                                    aria-label="Increase"
                                    className="flex h-6 w-6 items-center justify-center rounded-full text-foreground hover:bg-background transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Bill summary + CTA */}
            {items.length > 0 && (
                <div className="border-t border-border px-5 pb-6 pt-4 space-y-4">
                    {/* Bill breakdown */}
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                            <span>Subtotal</span>
                            <span>{formatPrice(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>GST & Taxes</span>
                            <span>{formatPrice(gst)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Platform fee</span>
                            <span>{formatPrice(platformFee)}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
                            <span>Total</span>
                            <span>{formatPrice(grandTotal)}</span>
                        </div>
                    </div>

                    {/* Place order button */}
                    <button
                        type="button"
                        id="btn-place-order"
                        onClick={handleCheckout}
                        disabled={isPlacing}
                        className="flex w-full items-center justify-between rounded-2xl bg-orange-500 px-5 py-3.5 text-white shadow-lg shadow-orange-500/30 transition-all hover:bg-orange-600 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
                    >
                        <span className="text-sm font-semibold">
                            {(!user || user.isAnonymous) ? "Login to Place Order" : (isPlacing ? "Processing..." : "Place Order")}
                        </span>
                        <span className="text-sm font-bold">{formatPrice(grandTotal)}</span>
                    </button>
                </div>
            )}
        </>
    );
}

"use client";

/**
 * MenuSection — Real-time menu grid filtered by category
 *
 * Fetches menu items from Firestore, filters by selected categoryId,
 * and renders a responsive card grid with an add-to-cart callback.
 *
 * Usage:
 *   <MenuSection categoryId={activeCategoryId} onAddToCart={handleAdd} />
 */

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { listenToCollection, Collections } from "@/lib/firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { type MenuItemDoc } from "@/types/index";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MenuItemWithId = MenuItemDoc & { id: string };

export interface CartItem {
    itemId: string;
    name: string;
    price: number;
    qty: number;
    image?: string;
}

interface MenuSectionProps {
    /** Filter by category — null = show all */
    categoryId: string | null;
    /** Called when user taps "Add" on an item */
    onAddToCart: (item: CartItem) => void;
}

// ---------------------------------------------------------------------------
// Currency formatter
// ---------------------------------------------------------------------------

function formatPrice(price: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(price);
}

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

function MenuItemSkeleton() {
    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
            <Skeleton className="h-44 w-full rounded-none" />
            <div className="flex flex-col gap-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Menu item card
// ---------------------------------------------------------------------------

interface MenuItemCardProps {
    item: MenuItemWithId;
    onAdd: () => void;
}

function MenuItemCard({ item, onAdd }: MenuItemCardProps) {
    const gstAmount = (item.price * item.gst) / 100;
    const totalPrice = item.price + gstAmount;

    return (
        <article
            className={[
                "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300",
                item.isAvailable
                    ? "hover:border-orange-400/40 hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-0.5"
                    : "opacity-60",
            ].join(" ")}
            aria-label={item.name}
        >
            {/* Image */}
            <div className="relative h-44 w-full overflow-hidden bg-muted">
                {item.image ? (
                    <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl">🍽️</div>
                )}

                {/* GST badge */}
                {item.gst > 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                        +{item.gst}% GST
                    </span>
                )}

                {/* Unavailable overlay */}
                {!item.isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                        <span className="rounded-full bg-background border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                            Unavailable
                        </span>
                    </div>
                )}
            </div>

            {/* Details */}
            <div className="flex flex-1 flex-col gap-1.5 p-4">
                <h3 className="line-clamp-1 font-semibold text-foreground leading-tight">
                    {item.name}
                </h3>

                {item.description && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {item.description}
                    </p>
                )}

                {/* Price + Add */}
                <div className="mt-auto flex items-center justify-between pt-3">
                    <div>
                        <p className="text-base font-bold text-foreground">
                            {formatPrice(totalPrice)}
                        </p>
                        {item.gst > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                                incl. GST
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        id={`btn-add-${item.id}`}
                        onClick={onAdd}
                        disabled={!item.isAvailable}
                        aria-label={`Add ${item.name} to cart`}
                        className={[
                            "flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all active:scale-95",
                            item.isAvailable
                                ? "bg-orange-500 text-white hover:bg-orange-600 shadow-sm shadow-orange-500/25"
                                : "bg-muted text-muted-foreground cursor-not-allowed",
                        ].join(" ")}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add
                    </button>
                </div>
            </div>
        </article>
    );
}

// ---------------------------------------------------------------------------
// MenuSection
// ---------------------------------------------------------------------------

export default function MenuSection({ categoryId, onAddToCart }: MenuSectionProps) {
    const [allItems, setAllItems] = useState<MenuItemWithId[]>([]);
    const [loading, setLoading] = useState(true);

    // Real-time listener — fetch all available items
    useEffect(() => {
        const unsub = listenToCollection<MenuItemDoc>(
            Collections.MENU_ITEMS,
            (docs) => {
                setAllItems(docs as MenuItemWithId[]);
                setLoading(false);
            }
        );
        return unsub;
    }, []);

    // Client-side filter by category (avoids extra Firestore reads on tab switch)
    const items = useMemo(() => {
        if (categoryId === null) return allItems;
        return allItems.filter((i) => i.categoryId === categoryId);
    }, [allItems, categoryId]);

    const available = items.filter((i) => i.isAvailable);
    const unavailable = items.filter((i) => !i.isAvailable);
    const ordered = [...available, ...unavailable]; // available items first

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <section aria-label="Menu items" className="space-y-4">

            {/* Result count */}
            {!loading && (
                <div className="flex items-center justify-between px-1">
                    <p className="text-sm text-muted-foreground">
                        {items.length === 0
                            ? "No items found"
                            : `${available.length} item${available.length !== 1 ? "s" : ""} available`}
                        {unavailable.length > 0 && (
                            <span className="ml-1 text-xs opacity-60">
                                · {unavailable.length} unavailable
                            </span>
                        )}
                    </p>
                </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {loading ? (
                    Array.from({ length: 8 }).map((_, i) => <MenuItemSkeleton key={i} />)
                ) : ordered.length === 0 ? (
                    /* Empty state */
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-3xl">
                            🍽️
                        </div>
                        <p className="font-medium text-foreground">No items in this category</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Try selecting a different category.
                        </p>
                    </div>
                ) : (
                    ordered.map((item) => (
                        <MenuItemCard
                            key={item.id}
                            item={item}
                            onAdd={() =>
                                onAddToCart({
                                    itemId: item.id,
                                    name: item.name,
                                    price: item.price + (item.price * item.gst) / 100,
                                    qty: 1,
                                    image: item.image,
                                })
                            }
                        />
                    ))
                )}
            </div>
        </section>
    );
}

"use client";

/**
 * MenuGrid — Responsive grid of MenuCards filtered by category
 * Fetches all items once, filters client-side for instant tab switching.
 */

import { useEffect, useMemo, useState } from "react";
import { listenToCollection, Collections } from "@/lib/firebase/firestore";
import { type MenuItemDoc } from "@/types/index";
import MenuCard, { type MenuItemWithId } from "./MenuCard";
import { Skeleton } from "@/components/ui/skeleton";

interface MenuGridProps {
    categoryId: string | null;
    search?: string;
}

function CardSkeleton() {
    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
            <Skeleton className="h-44 w-full rounded-none" />
            <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-9 w-9 rounded-full" />
                </div>
            </div>
        </div>
    );
}

export default function MenuGrid({ categoryId, search = "" }: MenuGridProps) {
    const [allItems, setAllItems] = useState<MenuItemWithId[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = listenToCollection<MenuItemDoc>(Collections.MENU_ITEMS, (docs) => {
            setAllItems(docs as MenuItemWithId[]);
            setLoading(false);
        });
        return unsub;
    }, []);

    const items = useMemo(() => {
        const q = search.trim().toLowerCase();

        // When searching, ignore category filter and search across all items
        const base = q
            ? allItems.filter(
                (i) =>
                    i.name.toLowerCase().includes(q) ||
                    i.description?.toLowerCase().includes(q)
              )
            : categoryId
            ? allItems.filter((i) => i.categoryId === categoryId)
            : allItems;

        // Available first, unavailable last
        return [...base.filter((i) => i.isAvailable), ...base.filter((i) => !i.isAvailable)];
    }, [allItems, categoryId, search]);

    if (loading) {
        return (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="mb-4 text-5xl">
                    {search.trim() ? "🔍" : "🍽️"}
                </div>
                <p className="font-semibold text-foreground">
                    {search.trim() ? `No results for "${search.trim()}"` : "Nothing here yet"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    {search.trim()
                        ? "Try a different keyword or browse by category."
                        : "Try a different category or check back later."}
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
                <MenuCard key={item.id} item={item} />
            ))}
        </div>
    );
}

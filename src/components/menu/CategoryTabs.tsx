"use client";

/**
 * CategoryTabs — Horizontally scrollable category filter tabs
 * Active tab has orange pill indicator with smooth transition.
 */

import { useEffect, useRef, useState } from "react";
import { listenToCollection, Collections } from "@/lib/firebase/firestore";
import { type CategoryDoc } from "@/types/index";
import { Skeleton } from "@/components/ui/skeleton";

type CategoryWithId = CategoryDoc & { id: string };

interface CategoryTabsProps {
    selected: string | null;
    onSelect: (id: string | null) => void;
}

export default function CategoryTabs({ selected, onSelect }: CategoryTabsProps) {
    const [categories, setCategories] = useState<CategoryWithId[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsub = listenToCollection<CategoryDoc>(Collections.CATEGORIES, (docs) => {
            setCategories((docs as CategoryWithId[]).filter((c) => c.isActive));
            setLoading(false);
        });
        return unsub;
    }, []);

    // Auto-scroll selected tab into view
    useEffect(() => {
        if (!scrollRef.current) return;
        const activeEl = scrollRef.current.querySelector("[aria-selected='true']");
        activeEl?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }, [selected]);

    const allTabs = [{ id: null, name: "All" }, ...categories.map((c) => ({ id: c.id, name: c.name }))];

    return (
        <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
            style={{ scrollbarWidth: "none" }}
            role="tablist"
            aria-label="Menu categories"
        >
            {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-20 shrink-0 rounded-full" />
                ))
            ) : (
                allTabs.map((tab) => {
                    const isActive = selected === tab.id;
                    return (
                        <button
                            key={tab.id ?? "all"}
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => onSelect(tab.id)}
                            className={[
                                "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap",
                                isActive
                                    ? "bg-orange-500 text-white shadow-sm shadow-orange-500/30"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                            ].join(" ")}
                        >
                            {tab.name}
                        </button>
                    );
                })
            )}
        </div>
    );
}

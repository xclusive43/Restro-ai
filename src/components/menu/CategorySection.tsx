"use client";

/**
 * CategorySection
 *
 * Displays a horizontally scrollable row of category pills/cards.
 * Fetches categories from Firestore in real time.
 * Calls `onSelect(categoryId | null)` when a category is picked.
 *
 * Usage:
 *   <CategorySection selected={activeCategoryId} onSelect={setActiveCategoryId} />
 */

import { useEffect, useState } from "react";
import Image from "next/image";

import { listenToCollection, Collections } from "@/lib/firebase/firestore";
import { type CategoryDoc } from "@/types/index";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CategoryWithId = CategoryDoc & { id: string };

interface CategorySectionProps {
    /** Currently selected category ID — null means "All" */
    selected: string | null;
    onSelect: (id: string | null) => void;
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function CategorySkeleton() {
    return (
        <div className="flex shrink-0 flex-col items-center gap-2">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <Skeleton className="h-3 w-14 rounded" />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Single category pill
// ---------------------------------------------------------------------------

interface CategoryPillProps {
    id: string | null;
    name: string;
    image?: string;
    isActive: boolean;
    onClick: () => void;
}

function CategoryPill({ id, name, image, isActive, onClick }: CategoryPillProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={isActive}
            aria-label={`Filter by ${name}`}
            className={[
                "group flex shrink-0 flex-col items-center gap-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 rounded-2xl",
            ].join(" ")}
        >
            {/* Icon wrapper */}
            <div
                className={[
                    "relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-2 transition-all duration-200",
                    isActive
                        ? "border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/20 scale-105"
                        : "border-border bg-muted hover:border-orange-400/50 hover:bg-orange-500/5 hover:scale-105",
                ].join(" ")}
            >
                {image ? (
                    <Image
                        src={image}
                        alt={name}
                        fill
                        sizes="64px"
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                ) : (
                    <span className="text-2xl" role="img" aria-hidden="true">
                        {id === null ? "🍽️" : "🍴"}
                    </span>
                )}

                {/* Active ring overlay */}
                {isActive && (
                    <div className="absolute inset-0 rounded-2xl ring-2 ring-orange-500 ring-inset" />
                )}
            </div>

            {/* Label */}
            <span
                className={[
                    "text-xs font-medium leading-tight text-center max-w-[72px] truncate transition-colors duration-200",
                    isActive ? "text-orange-500" : "text-muted-foreground group-hover:text-foreground",
                ].join(" ")}
            >
                {name}
            </span>
        </button>
    );
}

// ---------------------------------------------------------------------------
// CategorySection
// ---------------------------------------------------------------------------

export default function CategorySection({ selected, onSelect }: CategorySectionProps) {
    const [categories, setCategories] = useState<CategoryWithId[]>([]);
    const [loading, setLoading] = useState(true);

    // Real-time listener — only active categories
    useEffect(() => {
        const unsub = listenToCollection<CategoryDoc>(
            Collections.CATEGORIES,
            (docs) => {
                // Filter to only active, cast to typed shape
                const active = (docs as CategoryWithId[]).filter((c) => c.isActive);
                setCategories(active);
                setLoading(false);
            }
        );
        return unsub;
    }, []);

    return (
        <section aria-label="Menu categories" className="space-y-3">
            {/* Heading row */}
            <div className="flex items-center justify-between px-1">
                <h2 className="text-base font-semibold text-foreground">Categories</h2>
                {!loading && categories.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                        {categories.length} categories
                    </span>
                )}
            </div>

            {/* Scrollable pill row */}
            <div
                className="flex gap-4 overflow-x-auto pb-2 scrollbar-none"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {loading ? (
                    // Loading skeletons — "All" + 4 placeholders
                    <>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <CategorySkeleton key={i} />
                        ))}
                    </>
                ) : (
                    <>
                        {/* "All" pill — always first */}
                        <CategoryPill
                            id={null}
                            name="All"
                            isActive={selected === null}
                            onClick={() => onSelect(null)}
                        />

                        {/* Category pills */}
                        {categories.map((cat) => (
                            <CategoryPill
                                key={cat.id}
                                id={cat.id}
                                name={cat.name}
                                image={cat.image}
                                isActive={selected === cat.id}
                                onClick={() => onSelect(cat.id)}
                            />
                        ))}
                    </>
                )}
            </div>

            {/* Active category label (subtle breadcrumb) */}
            {!loading && selected !== null && (
                <div className="flex items-center gap-2 px-1">
                    <span className="text-xs text-muted-foreground">Showing:</span>
                    <span className="text-xs font-medium text-orange-500">
                        {categories.find((c) => c.id === selected)?.name ?? ""}
                    </span>
                    <button
                        type="button"
                        onClick={() => onSelect(null)}
                        className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline transition-colors"
                        aria-label="Clear category filter"
                    >
                        Clear
                    </button>
                </div>
            )}
        </section>
    );
}

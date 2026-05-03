"use client";

/**
 * Pagination — Reusable paginator component
 *
 * Usage:
 *   const { page, setPage, pageItems, totalPages } = usePagination(allItems, 10);
 *   <Pagination page={page} totalPages={totalPages} onChange={setPage} total={allItems.length} pageSize={10} />
 */

import { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePagination<T>(items: T[], pageSize: number) {
    const [page, setPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

    // Reset to page 1 whenever items change (e.g. filter / search)
    const safePage = Math.min(page, totalPages);

    const pageItems = useMemo(
        () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
        [items, safePage, pageSize]
    );

    return {
        page: safePage,
        setPage,
        pageItems,
        totalPages,
    };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PaginationProps {
    page: number;
    totalPages: number;
    onChange: (page: number) => void;
    total: number;
    pageSize: number;
    className?: string;
}

export default function Pagination({
    page,
    totalPages,
    onChange,
    total,
    pageSize,
    className = "",
}: PaginationProps) {
    if (totalPages <= 1) return null;

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    // Generate page numbers to show (ellipsis for large ranges)
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push("...");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
            pages.push(i);
        }
        if (page < totalPages - 2) pages.push("...");
        pages.push(totalPages);
    }

    const btnBase =
        "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all h-8 min-w-[32px] px-2 disabled:pointer-events-none disabled:opacity-40";

    return (
        <div className={`flex items-center justify-between gap-4 pt-4 border-t border-border ${className}`}>
            {/* Count label */}
            <p className="text-xs text-muted-foreground shrink-0">
                {from}–{to} of {total} results
            </p>

            {/* Page buttons */}
            <div className="flex items-center gap-1">
                {/* Prev */}
                <button
                    type="button"
                    onClick={() => onChange(page - 1)}
                    disabled={page === 1}
                    className={`${btnBase} border border-border bg-background hover:bg-muted`}
                    aria-label="Previous page"
                >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>

                {pages.map((p, i) =>
                    p === "..." ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm select-none">…</span>
                    ) : (
                        <button
                            key={p}
                            type="button"
                            onClick={() => onChange(p as number)}
                            className={`${btnBase} ${
                                p === page
                                    ? "bg-orange-500 text-white border border-orange-500 shadow-sm"
                                    : "border border-border bg-background hover:bg-muted text-foreground"
                            }`}
                            aria-current={p === page ? "page" : undefined}
                        >
                            {p}
                        </button>
                    )
                )}

                {/* Next */}
                <button
                    type="button"
                    onClick={() => onChange(page + 1)}
                    disabled={page === totalPages}
                    className={`${btnBase} border border-border bg-background hover:bg-muted`}
                    aria-label="Next page"
                >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

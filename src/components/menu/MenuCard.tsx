"use client";

/**
 * MenuCard — Apple-style menu item card
 *
 * Features:
 *  - Large image with parallax-like scale on hover
 *  - Inline qty counter (- qty +) when item is in cart
 *  - Smooth transitions between add and counter states
 *  - GST badge, unavailable overlay
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import { useCartStore } from "@/store/cartStore";
import { type MenuItemDoc } from "@/types/index";

export type MenuItemWithId = MenuItemDoc & { id: string };

function formatPrice(n: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(n);
}

interface MenuCardProps {
    item: MenuItemWithId;
}

export default function MenuCard({ item }: MenuCardProps) {
    const addItem = useCartStore((s) => s.addItem);
    const updateQty = useCartStore((s) => s.updateQty);
    const qty = useCartStore((s) => s.getQty(item.id));
    const openCart = useCartStore((s) => s.openCart);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const totalPrice = item.price + (item.price * item.gst) / 100;

    const handleAdd = () => {
        addItem({
            itemId: item.id,
            name: item.name,
            price: totalPrice,
            image: item.image,
        });
        openCart();
    };

    return (
        <article
            className={[
                "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300",
                item.isAvailable
                    ? "hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10 hover:border-orange-400/30"
                    : "opacity-60",
            ].join(" ")}
        >
            {/* Image */}
            <div className="relative h-44 w-full shrink-0 overflow-hidden bg-muted">
                {item.image ? (
                    <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        unoptimized
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl">🍽️</div>
                )}

                {/* Veg / Non-veg indicator (top-left) */}
                <div className="absolute left-2 top-2 flex h-4 w-4 items-center justify-center rounded-sm border-2 border-green-600 bg-white">
                    <div className="h-2 w-2 rounded-full bg-green-600" />
                </div>

                {/* GST badge */}
                {item.gst > 0 && (
                    <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                        +{item.gst}% GST
                    </span>
                )}

                {/* Unavailable overlay */}
                {!item.isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-[2px]">
                        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                            Currently unavailable
                        </span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col gap-1 p-4">
                <div className="flex justify-between items-start gap-2">
                    <h3 className="line-clamp-1 text-sm font-semibold text-foreground">
                        {item.name}
                    </h3>
                    {item.ratingAverage ? (
                        <div className="flex items-center gap-0.5 shrink-0 bg-orange-500/10 px-1.5 py-0.5 rounded text-xs font-bold text-orange-600">
                            <span className="text-[10px]">★</span>
                            {item.ratingAverage}
                        </div>
                    ) : null}
                </div>
                {item.description && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {item.description}
                    </p>
                )}

                {/* Price + Add */}
                <div className="mt-auto flex items-center justify-between pt-3">
                    <div>
                        <p className="text-base font-bold text-foreground">{formatPrice(totalPrice)}</p>
                        {item.gst > 0 && (
                            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">incl. GST</p>
                        )}
                    </div>

                    {/* Add / Qty counter */}
                    {item.isAvailable && isMounted && (
                        qty === 0 ? (
                            <button
                                type="button"
                                id={`btn-add-${item.id}`}
                                onClick={handleAdd}
                                aria-label={`Add ${item.name} to cart`}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white shadow-md shadow-orange-500/30 transition-all duration-200 hover:bg-orange-600 hover:scale-110 active:scale-95"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            </button>
                        ) : (
                            <div className="flex items-center gap-1 rounded-full bg-orange-500 px-1 py-1 shadow-md shadow-orange-500/30">
                                <button
                                    type="button"
                                    onClick={() => updateQty(item.id, qty - 1)}
                                    aria-label="Decrease quantity"
                                    className="flex h-7 w-7 items-center justify-center rounded-full text-white transition-colors hover:bg-orange-600 active:scale-95"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                </button>
                                <span className="min-w-[20px] text-center text-sm font-bold text-white">
                                    {qty}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => updateQty(item.id, qty + 1)}
                                    aria-label="Increase quantity"
                                    className="flex h-7 w-7 items-center justify-center rounded-full text-white transition-colors hover:bg-orange-600 active:scale-95"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                </button>
                            </div>
                        )
                    )}
                    {item.isAvailable && !isMounted && (
                        <div className="h-9 w-9" />
                    )}
                </div>
            </div>
        </article>
    );
}

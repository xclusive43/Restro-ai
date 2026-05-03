/**
 * Cart Store — Zustand
 *
 * Persists to localStorage so cart survives page refreshes.
 * Drawer open/close state is NOT persisted (UI-only).
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { useSettingsStore } from "./settingsStore";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CartItem {
    itemId: string;
    name: string;
    /** Price per unit including GST */
    price: number;
    qty: number;
    image?: string;
}

interface CartStore {
    items: CartItem[];
    isOpen: boolean;
    activeOrderId: string | null;
    tableId: string | null;

    // Actions
    addItem: (item: Omit<CartItem, "qty">) => void;
    removeItem: (itemId: string) => void;
    updateQty: (itemId: string, qty: number) => void;
    clearCart: () => void;
    openCart: () => void;
    closeCart: () => void;
    toggleCart: () => void;
    
    // Tracking
    setActiveOrderId: (orderId: string | null) => void;
    setTableId: (tableId: string | null) => void;

    // Computed (recalculated inline — zustand doesn't support getters natively)
    total: () => number;
    itemCount: () => number;
    getQty: (itemId: string) => number;
    getCartTotal: () => { subtotal: number, gst: number, platformFee: number, total: number };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],
            isOpen: false,
            activeOrderId: null,
            tableId: null,

            addItem: (item) => {
                set((state) => {
                    const existing = state.items.find((i) => i.itemId === item.itemId);
                    if (existing) {
                        return {
                            items: state.items.map((i) =>
                                i.itemId === item.itemId ? { ...i, qty: i.qty + 1 } : i
                            ),
                        };
                    }
                    return { items: [...state.items, { ...item, qty: 1 }] };
                });
            },

            removeItem: (itemId) => {
                set((state) => ({
                    items: state.items.filter((i) => i.itemId !== itemId),
                }));
            },

            updateQty: (itemId, qty) => {
                if (qty <= 0) {
                    get().removeItem(itemId);
                    return;
                }
                set((state) => ({
                    items: state.items.map((i) =>
                        i.itemId === itemId ? { ...i, qty } : i
                    ),
                }));
            },

            clearCart: () => set({ items: [] }),
            openCart: () => set({ isOpen: true }),
            closeCart: () => set({ isOpen: false }),
            toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
            setActiveOrderId: (id) => set({ activeOrderId: id }),
            setTableId: (id) => set({ tableId: id }),

            getCartTotal: () => {
                const { items } = get();
                // Fallback to defaults if settings are not loaded yet
                const settings = useSettingsStore.getState().settings || { gstRate: 5, platformFee: 3 };

                const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
                const gst = subtotal * (settings.gstRate / 100);
                const platformFee = settings.platformFee;
                const total = subtotal + gst + platformFee;

                return { subtotal, gst, platformFee, total };
            },

            total: () =>
                get().items.reduce((sum, i) => sum + i.price * i.qty, 0),

            itemCount: () =>
                get().items.reduce((sum, i) => sum + i.qty, 0),

            getQty: (itemId) =>
                get().items.find((i) => i.itemId === itemId)?.qty ?? 0,
        }),
        {
            name: "restro-cart",
            storage: createJSONStorage(() => localStorage),
            // Persist items, table and active order tracking
            partialize: (state) => ({ 
                items: state.items, 
                activeOrderId: state.activeOrderId,
                tableId: state.tableId 
            }),
        }
    )
);

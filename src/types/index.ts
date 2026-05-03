/**
 * src/types/index.ts
 * ──────────────────
 * Canonical TypeScript types for every Firestore collection.
 * Import from here everywhere — one source of truth.
 */

import { type Timestamp } from "firebase/firestore";

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export type UserRole = "admin" | "staff" | "customer";
export type StaffRole = "manager" | "cook" | "server";

// ---------------------------------------------------------------------------
// users/{uid}
// ---------------------------------------------------------------------------

export interface UserDoc {
    name: string;
    email: string;
    role: UserRole;
    photoURL?: string | null;
    /** Sub-role for staff members */
    staffRole?: StaffRole;
    /** Admin can block login access without deleting the account */
    isBlocked?: boolean;
    phone?: string;
    createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// categories/{categoryId}
// ---------------------------------------------------------------------------

export interface CategoryDoc {
    name: string;
    image: string;
    isActive: boolean;
    createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// menu_items/{itemId}
// ---------------------------------------------------------------------------

export interface MenuItemDoc {
    name: string;
    description: string;
    price: number;           // base price in ₹
    image: string;
    categoryId: string;
    isAvailable: boolean;
    gst: number;             // GST % (e.g. 5 = 5%)
    
    // Ratings
    ratingSum?: number;
    ratingCount?: number;
    ratingAverage?: number;
    
    createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// orders/{orderId}
// ---------------------------------------------------------------------------

export type OrderStatus = "PLACED" | "PREPARING" | "READY" | "SERVED" | "CANCELLED" | "REJECTED";

export interface OrderItem {
    itemId: string;
    name: string;            // snapshot of name at order time
    qty: number;
    price: number;           // snapshot of price at order time
}

export interface OrderDoc {
    userId: string;
    items: OrderItem[];
    subtotal: number;
    gst: number;             // calculated GST amount in ₹
    sgst: number;            // calculated SGST amount in ₹
    platformFee: number;     // fixed ₹3
    total: number;           // subtotal + gst + sgst + platformFee
    status: OrderStatus;
    tableId?: string;        // QR table system
    customerName?: string;
    customerPhone?: string;
    createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Realtime DB — orders_live/{orderId}
// ---------------------------------------------------------------------------

export interface LiveOrderStatus {
    status: OrderStatus;
    updatedAt: number;       // Unix timestamp (ms)
}

// ---------------------------------------------------------------------------
// audit_logs/{logId}
// ---------------------------------------------------------------------------

export interface AuditLogDoc {
    action: string;          // e.g. "ORDER_CREATED", "STATUS_UPDATED", "FEEDBACK_SUBMITTED"
    details: string;         // Human readable description
    userId: string;          // User who performed the action (or "guest")
    userRole: UserRole | "guest";
    targetId?: string;       // ID of the order/item affected
    createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// offers/{offerId}
// ---------------------------------------------------------------------------

export interface OfferDoc {
    title: string;           // e.g. "20% Off on Weekends"
    description: string;     // Short subtitle / details
    badge?: string;          // e.g. "LIMITED", "HOT", "NEW"
    bgFrom: string;          // Tailwind gradient start colour class
    bgTo: string;            // Tailwind gradient end colour class
    emoji?: string;          // Decorative emoji
    imageUrl?: string;       // Optional background image (covers gradient)
    isActive: boolean;       // Admin can disable without deleting
    order: number;           // Display order (lower = first)
    createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// settings/global
// ---------------------------------------------------------------------------

export interface GlobalSettingsDoc {
    restaurantName: string;
    restaurantIcon: string;
    themeColor: string;
    isOpen: boolean;
    gstRate: number;
    platformFee: number;
    autoAcceptOrders: boolean;
    printReceipts: boolean;
    updatedAt?: Timestamp;
}

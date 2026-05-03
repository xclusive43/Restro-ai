import { NextResponse } from "next/server";
import { adminDb, adminRealtimeDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, tableId, items, subtotal, gst, sgst, platformFee, total } = body;

        // 1. Create order in Firestore
        const orderRef = adminDb.collection("orders").doc();
        await orderRef.set({
            userId: userId || "guest", // Replace with real auth UID if sent
            tableId: tableId || null,
            items,
            subtotal,
            gst,
            sgst,
            platformFee,
            total,
            status: "PLACED",
            createdAt: FieldValue.serverTimestamp(),
        });

        // 2. Set live status in Realtime DB
        const liveOrderRef = adminRealtimeDb.ref(`orders_live/${orderRef.id}`);
        await liveOrderRef.set({
            status: "PLACED",
            updatedAt: Date.now()
        });

        // 3. Write to Audit Log
        await adminDb.collection("audit_logs").add({
            action: "ORDER_CREATED",
            details: `Order placed for ₹${total}${tableId ? ` at Table ${tableId}` : ''}`,
            userId: userId || "guest",
            userRole: userId ? "customer" : "guest",
            targetId: orderRef.id,
            createdAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true, orderId: orderRef.id }, { status: 201 });
    } catch (error: any) {
        console.error("Create order error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

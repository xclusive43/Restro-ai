import { NextResponse } from "next/server";
import { adminDb, adminRealtimeDb } from "@/lib/firebase/admin";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { orderId, status } = body;

        if (!orderId || !status) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Update Firestore
        await adminDb.collection("orders").doc(orderId).update({
            status,
        });

        // 2. Update Realtime DB
        await adminRealtimeDb.ref(`orders_live/${orderId}`).update({
            status,
            updatedAt: Date.now()
        });

        // 3. Write to Audit Log
        const { FieldValue } = require("firebase-admin/firestore");
        await adminDb.collection("audit_logs").add({
            action: "STATUS_UPDATED",
            details: `Order status changed to ${status}`,
            userId: "staff_or_admin", // we don't have session token easily here yet
            userRole: "staff",
            targetId: orderId,
            createdAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        console.error("Update order error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

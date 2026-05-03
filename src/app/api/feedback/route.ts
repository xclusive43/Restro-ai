import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { orderId, rating, feedback } = body;

        if (!orderId || !rating) {
            return NextResponse.json({ error: "Missing orderId or rating" }, { status: 400 });
        }

        const orderRef = adminDb.collection("orders").doc(orderId);
        
        // Use a transaction to safely update order and all items
        await adminDb.runTransaction(async (transaction) => {
            // --- 1. ALL READS FIRST ---
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists) throw new Error("Order not found");
            
            const orderData = orderDoc.data();
            const items = orderData?.items || [];
            const uniqueItemIds = [...new Set(items.map((i: any) => i.itemId))];
            
            const itemDocsMap = new Map();
            for (const itemId of uniqueItemIds) {
                const itemRef = adminDb.collection("menu_items").doc(itemId as string);
                const itemDoc = await transaction.get(itemRef);
                if (itemDoc.exists) {
                    itemDocsMap.set(itemId, { ref: itemRef, data: itemDoc.data() });
                }
            }

            // --- 2. ALL WRITES SECOND ---
            transaction.update(orderRef, {
                rating,
                feedback: feedback || "",
            });

            for (const [itemId, itemInfo] of itemDocsMap.entries()) {
                const data = itemInfo.data;
                const currentSum = data?.ratingSum || 0;
                const currentCount = data?.ratingCount || 0;
                
                const newSum = currentSum + rating;
                const newCount = currentCount + 1;
                const newAverage = +(newSum / newCount).toFixed(1);
                
                transaction.update(itemInfo.ref, {
                    ratingSum: newSum,
                    ratingCount: newCount,
                    ratingAverage: newAverage
                });
            }
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        console.error("Submit feedback error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

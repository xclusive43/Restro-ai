import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET() {
    try {
        console.log("Starting full rating recalculation...");

        // 1. Fetch all orders that have a rating
        const ordersSnapshot = await adminDb.collection("orders").where("rating", ">", 0).get();

        // Map to hold our new aggregated stats: { itemId: { sum: 0, count: 0 } }
        const itemStats = new Map<string, { sum: number, count: number }>();

        // 2. Loop through all rated orders
        for (const orderDoc of ordersSnapshot.docs) {
            const orderData = orderDoc.data();
            const rating = orderData.rating as number;
            const items = orderData.items || [];

            // Deduplicate items per order so an item isn't rated twice in the same order
            const uniqueItemIds: string[] = Array.from(new Set(items.map((i: any) => String(i.itemId))));

            for (const itemId of uniqueItemIds) {
                if (!itemId) continue;

                const stats = itemStats.get(itemId) || { sum: 0, count: 0 };
                stats.sum += rating;
                stats.count += 1;
                itemStats.set(itemId, stats);
            }
        }

        console.log("Aggregated stats from orders:", Object.fromEntries(itemStats));

        // 3. Batch update all menu items with their true calculated ratings
        const batch = adminDb.batch();
        let updatedCount = 0;

        // First, reset all menu items to 0 so unrated items don't keep old mock data
        const allItemsSnapshot = await adminDb.collection("menu_items").get();
        for (const itemDoc of allItemsSnapshot.docs) {
            const itemId = itemDoc.id;
            const itemRef = itemDoc.ref;

            if (itemStats.has(itemId)) {
                // Item has real ratings
                const stats = itemStats.get(itemId)!;
                const avg = +(stats.sum / stats.count).toFixed(1);

                batch.update(itemRef, {
                    ratingSum: stats.sum,
                    ratingCount: stats.count,
                    ratingAverage: Math.min(Math.max(avg, 1.0), 5.0)
                });
                updatedCount++;
            } else {
                // Item has NO real ratings in the orders collection -> Erase it
                batch.update(itemRef, {
                    ratingSum: FieldValue.delete(),
                    ratingCount: FieldValue.delete(),
                    ratingAverage: FieldValue.delete()
                });
            }
        }

        await batch.commit();

        return NextResponse.json({
            success: true,
            message: "Successfully recalculated all ratings from true order history!",
            ordersProcessed: ordersSnapshot.size,
            itemsUpdated: updatedCount,
            stats: Object.fromEntries(itemStats)
        });

    } catch (error: any) {
        console.error("Sync ratings error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { adminDb } from "../src/lib/firebase/admin";

async function addMockRatings() {
    const itemsSnapshot = await adminDb.collection("menu_items").get();
    let updated = 0;

    for (const doc of itemsSnapshot.docs) {
        const item = doc.data();
        // If it doesn't have a rating, give it a random mock rating
        if (item.ratingAverage === undefined) {
            const sum = Math.floor(Math.random() * 20) + 10; // random sum between 10 and 30
            const count = Math.floor(Math.random() * 5) + 2; // random count between 2 and 6
            const avg = +(sum / count).toFixed(1);
            
            // make sure avg is between 1 and 5
            const finalAvg = Math.min(Math.max(avg, 1.0), 5.0);

            await doc.ref.update({
                ratingSum: sum,
                ratingCount: count,
                ratingAverage: finalAvg
            });
            updated++;
        }
    }
    console.log(`Updated ${updated} menu items with mock ratings!`);
}

addMockRatings().catch(console.error);

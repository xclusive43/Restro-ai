import { config } from "dotenv";
config({ path: ".env.local" });
import { adminDb } from "../src/lib/firebase/admin";

async function checkRatings() {
    const itemsSnapshot = await adminDb.collection("menu_items").get();
    for (const doc of itemsSnapshot.docs) {
        const data = doc.data();
        if (data.ratingCount > 0) {
            console.log(`Item: ${data.name} | sum: ${data.ratingSum} | count: ${data.ratingCount} | avg: ${data.ratingAverage}`);
        }
    }
}

checkRatings().catch(console.error);

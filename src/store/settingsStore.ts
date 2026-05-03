import { create } from "zustand";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { type GlobalSettingsDoc } from "@/types/index";

interface SettingsState {
    settings: GlobalSettingsDoc | null;
    loading: boolean;
    initialize: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    settings: null,
    loading: true,
    initialize: () => {
        const docRef = doc(db, "settings", "global");
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                set({ settings: docSnap.data() as GlobalSettingsDoc, loading: false });
            } else {
                // Default settings if document doesn't exist yet
                set({
                    settings: {
                        restaurantName: "RestroAI",
                        restaurantIcon: "🍽️",
                        themeColor: "orange",
                        isOpen: true,
                        gstRate: 5,
                        platformFee: 3,
                        autoAcceptOrders: true,
                        printReceipts: false,
                    },
                    loading: false,
                });
            }
        }, (error) => {
            console.error("Settings error:", error);
            set({ loading: false });
        });

        return unsubscribe;
    }
}));

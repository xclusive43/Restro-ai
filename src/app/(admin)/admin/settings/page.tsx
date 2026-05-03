"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSettingsStore } from "@/store/settingsStore";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function AdminSettingsPage() {
    const globalSettings = useSettingsStore(s => s.settings);
    const [settings, setSettings] = useState({
        restaurantName: "RestroAI",
        restaurantIcon: "🍽️",
        themeColor: "orange",
        isOpen: true,
        gstRate: 5,
        platformFee: 3,
        autoAcceptOrders: true,
        printReceipts: false,
    });

    useEffect(() => {
        if (globalSettings) {
            setSettings(globalSettings);
        }
    }, [globalSettings]);

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setDoc(doc(db, "settings", "global"), {
                ...settings,
                updatedAt: serverTimestamp()
            });
            toast.success("Settings saved successfully!");
        } catch (err: any) {
            toast.error(err.message || "Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Restaurant Settings</h1>
                <p className="text-sm text-muted-foreground">Configure global application parameters</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* General Settings */}
                <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
                    <h2 className="text-lg font-semibold border-b border-border pb-2">General</h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Restaurant Name</label>
                            <input 
                                type="text" 
                                value={settings.restaurantName}
                                onChange={(e) => setSettings({...settings, restaurantName: e.target.value})}
                                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Icon (Emoji)</label>
                            <input 
                                type="text" 
                                value={settings.restaurantIcon}
                                onChange={(e) => setSettings({...settings, restaurantIcon: e.target.value})}
                                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                maxLength={2}
                            />
                        </div>

                        <div className="space-y-2 col-span-2 sm:col-span-1">
                            <label className="text-sm font-medium text-foreground">Theme Color</label>
                            <select 
                                value={settings.themeColor}
                                onChange={(e) => setSettings({...settings, themeColor: e.target.value})}
                                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                                <option value="orange">Orange</option>
                                <option value="blue">Blue</option>
                                <option value="green">Green</option>
                                <option value="red">Red</option>
                                <option value="purple">Purple</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-foreground">Accepting Orders</p>
                            <p className="text-xs text-muted-foreground">Toggle if the restaurant is currently open.</p>
                        </div>
                        <button 
                            onClick={() => setSettings({...settings, isOpen: !settings.isOpen})}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.isOpen ? 'bg-green-500' : 'bg-muted'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.isOpen ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                {/* Billing & Taxes */}
                <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
                    <h2 className="text-lg font-semibold border-b border-border pb-2">Billing & Taxes</h2>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">GST Rate (%)</label>
                        <input 
                            type="number" 
                            value={settings.gstRate}
                            onChange={(e) => setSettings({...settings, gstRate: Number(e.target.value)})}
                            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Platform / Service Fee (₹)</label>
                        <input 
                            type="number" 
                            value={settings.platformFee}
                            onChange={(e) => setSettings({...settings, platformFee: Number(e.target.value)})}
                            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                </div>

                {/* Operations */}
                <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5 md:col-span-2">
                    <h2 className="text-lg font-semibold border-b border-border pb-2">Operations</h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-foreground">Auto-Accept Orders</p>
                                <p className="text-xs text-muted-foreground">Automatically move orders to "Preparing".</p>
                            </div>
                            <button 
                                onClick={() => setSettings({...settings, autoAcceptOrders: !settings.autoAcceptOrders})}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autoAcceptOrders ? 'bg-orange-500' : 'bg-muted'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.autoAcceptOrders ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-foreground">Auto-Print Receipts</p>
                                <p className="text-xs text-muted-foreground">Print KOT when order is placed.</p>
                            </div>
                            <button 
                                onClick={() => setSettings({...settings, printReceipts: !settings.printReceipts})}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.printReceipts ? 'bg-orange-500' : 'bg-muted'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.printReceipts ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all shadow-md disabled:opacity-70"
                >
                    {isSaving ? "Saving..." : "Save Settings"}
                </button>
            </div>
        </div>
    );
}

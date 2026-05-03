"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/store/settingsStore";

export default function GlobalInit() {
    const initialize = useSettingsStore((state) => state.initialize);
    const settings = useSettingsStore((state) => state.settings);

    useEffect(() => {
        const unsubscribe = initialize();
        if (typeof unsubscribe === "function") {
            return () => unsubscribe();
        }
    }, [initialize]);

    useEffect(() => {
        if (!settings?.themeColor) return;

        const palettes: Record<string, { 400: string, 500: string, 600: string }> = {
            orange: { 400: "#fb923c", 500: "#f97316", 600: "#ea580c" },
            blue:   { 400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb" },
            green:  { 400: "#4ade80", 500: "#22c55e", 600: "#16a34a" },
            red:    { 400: "#f87171", 500: "#ef4444", 600: "#dc2626" },
            purple: { 400: "#c084fc", 500: "#a855f7", 600: "#9333ea" },
        };

        const colors = palettes[settings.themeColor] || palettes.orange;
        document.documentElement.style.setProperty("--brand-400", colors[400]);
        document.documentElement.style.setProperty("--brand-500", colors[500]);
        document.documentElement.style.setProperty("--brand-600", colors[600]);
    }, [settings?.themeColor]);

    return null; // This component doesn't render anything
}

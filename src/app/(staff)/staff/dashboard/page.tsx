"use client";

/**
 * Staff Dashboard — /staff/dashboard
 * Real-time shift overview with live charts:
 *  - Hourly order rate for today
 *  - Status breakdown bar
 *  - Orders in last 30 min ticker
 */

import { useEffect, useMemo, useState } from "react";
import { listenToCollection, Collections } from "@/lib/firebase/firestore";
import { type OrderDoc, type OrderStatus } from "@/types/index";
import LineChart, { type ChartPoint } from "@/components/shared/LineChart";

type OrderWithId = OrderDoc & { id: string };

const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function todayMidnight() {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}

function bucketByHour(orders: OrderWithId[]): ChartPoint[] {
    const map: Record<string, number> = {};
    for (let h = 7; h <= 23; h++) {
        const label = `${h % 12 || 12}${h < 12 ? "a" : "p"}`;
        map[label] = 0;
    }
    orders.forEach((o) => {
        if (!o.createdAt) return;
        const h = o.createdAt.toDate().getHours();
        if (h < 7) return;
        const label = `${h % 12 || 12}${h < 12 ? "a" : "p"}`;
        if (label in map) map[label]++;
    });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
}

const STATUS_SEGMENTS: { key: OrderStatus; color: string; label: string; bg: string }[] = [
    { key: "PLACED",    color: "bg-blue-500",   bg: "bg-blue-500/10",   label: "Placed" },
    { key: "PREPARING", color: "bg-amber-500",  bg: "bg-amber-500/10",  label: "Preparing" },
    { key: "READY",     color: "bg-green-400",  bg: "bg-green-400/10",  label: "Ready" },
    { key: "SERVED",    color: "bg-green-600",  bg: "bg-green-600/10",  label: "Served" },
    { key: "CANCELLED", color: "bg-red-400",    bg: "bg-red-400/10",    label: "Cancelled" },
    { key: "REJECTED",  color: "bg-red-600",    bg: "bg-red-600/10",    label: "Rejected" },
];

function MetricCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
    return (
        <div className={`rounded-2xl border border-border bg-card p-5 relative overflow-hidden`}>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className={`mt-1 text-3xl font-extrabold ${accent}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            <div className={`absolute -bottom-4 -right-4 h-16 w-16 rounded-full opacity-10 blur-2xl ${accent.replace("text-", "bg-")}`} />
        </div>
    );
}

export default function StaffDashboardPage() {
    const [orders, setOrders] = useState<OrderWithId[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        return listenToCollection<OrderDoc>(Collections.ORDERS, (docs) => {
            setOrders(docs as OrderWithId[]);
            setLoading(false);
        });
    }, []);

    const todayOrders = useMemo(() =>
        orders.filter((o) => o.createdAt && o.createdAt.toDate() >= todayMidnight()),
        [orders]
    );

    const active  = useMemo(() => todayOrders.filter((o) => o.status === "PLACED" || o.status === "PREPARING" || o.status === "READY"), [todayOrders]);
    const served  = useMemo(() => todayOrders.filter((o) => o.status === "SERVED"), [todayOrders]);
    const revenue = useMemo(() => served.reduce((s, o) => s + (o.total ?? 0), 0), [served]);

    // Orders in last 30 min
    const last30 = useMemo(() => {
        const cutoff = new Date(Date.now() - 30 * 60 * 1000);
        return todayOrders.filter((o) => o.createdAt && o.createdAt.toDate() >= cutoff).length;
    }, [todayOrders]);

    // Status counts
    const statusCounts = useMemo(() => {
        const map: Record<string, number> = {};
        STATUS_SEGMENTS.forEach((s) => (map[s.key] = 0));
        todayOrders.forEach((o) => { if (o.status in map) map[o.status]++; });
        return map;
    }, [todayOrders]);

    const hourlyData = useMemo(() => bucketByHour(todayOrders), [todayOrders]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-r-transparent" />
            </div>
        );
    }

    const isHighVolume = active.length > 5;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Shift Overview</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                </div>
                {/* Live indicator */}
                <div className="flex items-center gap-2 text-xs text-green-600 font-medium bg-green-500/10 rounded-full px-3 py-1.5">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    Live
                </div>
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="Active Orders" value={active.length} sub="needs action" accent="text-orange-500" />
                <MetricCard label="Served Today" value={served.length} sub="completed" accent="text-green-600" />
                <MetricCard label="Revenue Today" value={fmt(revenue)} sub="served orders" accent="text-blue-600" />
                <MetricCard label="Last 30 min" value={last30} sub="new orders" accent="text-purple-600" />
            </div>

            {/* Kitchen alert */}
            <div className={`rounded-2xl border p-5 ${isHighVolume ? "border-red-400/30 bg-red-500/5" : "border-green-400/30 bg-green-500/5"}`}>
                <div className="flex items-start gap-3">
                    <span className="text-2xl">{isHighVolume ? "🔥" : "✅"}</span>
                    <div>
                        <p className={`font-semibold ${isHighVolume ? "text-red-600" : "text-green-700"}`}>
                            {isHighVolume ? "High Volume Alert" : "Normal Operation"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {isHighVolume
                                ? `${active.length} active orders in kitchen. Prioritise oldest tickets first.`
                                : "Volume is manageable. Keep it up!"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Charts row */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Hourly order rate */}
                <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-foreground">Hourly Order Rate</p>
                        <span className="text-xs text-muted-foreground">Today</span>
                    </div>
                    <LineChart
                        data={hourlyData}
                        color="#f97316"
                        height={150}
                        formatValue={(v) => `${Math.round(v)} orders`}
                    />
                </div>

                {/* Status breakdown */}
                <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-foreground">Order Status — Today</p>
                        <span className="text-xs text-muted-foreground">{todayOrders.length} total</span>
                    </div>

                    {/* Horizontal stacked bar */}
                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted gap-0.5 mb-4">
                        {STATUS_SEGMENTS.map((s) => {
                            const pct = ((statusCounts[s.key] || 0) / (todayOrders.length || 1)) * 100;
                            if (pct === 0) return null;
                            return (
                                <div
                                    key={s.key}
                                    className={`${s.color} transition-all duration-700`}
                                    style={{ width: `${pct}%` }}
                                    title={`${s.label}: ${statusCounts[s.key]}`}
                                />
                            );
                        })}
                    </div>

                    {/* Grid of count cards */}
                    <div className="grid grid-cols-3 gap-2">
                        {STATUS_SEGMENTS.filter((s) => statusCounts[s.key] > 0).map((s) => (
                            <div key={s.key} className={`rounded-xl ${s.bg} p-3 text-center`}>
                                <p className="text-xl font-bold text-foreground">{statusCounts[s.key]}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

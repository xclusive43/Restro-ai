"use client";

/**
 * Admin Dashboard — /admin
 * Live stats + beautiful line charts for orders & revenue trends.
 * Recent orders table with real-time status updates.
 */

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import LineChart, { type ChartPoint } from "@/components/shared/LineChart";

import { listenToCollection, getCollection, orderBy, limit, Collections } from "@/lib/firebase/firestore";
import { type OrderDoc, type OrderStatus } from "@/types/index";
import { type Timestamp } from "firebase/firestore";

type OrderWithId = OrderDoc & { id: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
    PLACED:    { label: "Placed",    className: "bg-blue-500/15 text-blue-600 border-blue-500/20" },
    PREPARING: { label: "Preparing", className: "bg-amber-500/15 text-amber-600 border-amber-500/20" },
    READY:     { label: "Ready",     className: "bg-green-500/15 text-green-600 border-green-500/20" },
    SERVED:    { label: "Served",    className: "bg-zinc-500/15 text-zinc-500 border-zinc-500/20" },
    CANCELLED: { label: "Cancelled", className: "bg-red-500/15 text-red-500 border-red-500/20" },
    REJECTED:  { label: "Rejected",  className: "bg-red-500/15 text-red-500 border-red-500/20" },
};

const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function fmtTime(ts: Timestamp | null | undefined) {
    if (!ts) return "—";
    return ts.toDate().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function todayMidnight() {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}

// Bucket orders by hour label (e.g. "9 AM")
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

// Bucket revenue by hour
function revenueByHour(orders: OrderWithId[]): ChartPoint[] {
    const map: Record<string, number> = {};
    for (let h = 7; h <= 23; h++) {
        const label = `${h % 12 || 12}${h < 12 ? "a" : "p"}`;
        map[label] = 0;
    }
    orders.filter((o) => o.status === "SERVED").forEach((o) => {
        if (!o.createdAt) return;
        const h = o.createdAt.toDate().getHours();
        if (h < 7) return;
        const label = `${h % 12 || 12}${h < 12 ? "a" : "p"}`;
        if (label in map) map[label] += o.total ?? 0;
    });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
}

// Bucket orders by last 7 days
function ordersByDay(orders: OrderWithId[]): ChartPoint[] {
    const days: ChartPoint[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const next = new Date(d); next.setDate(next.getDate() + 1);
        const label = d.toLocaleDateString("en-IN", { weekday: "short" });
        const count = orders.filter((o) => {
            if (!o.createdAt) return false;
            const t = o.createdAt.toDate();
            return t >= d && t < next;
        }).length;
        days.push({ label, value: count });
    }
    return days;
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({ title, value, sub, icon, color, loading }: {
    title: string; value: string | number; sub?: string;
    icon: React.ReactNode; color: string; loading?: boolean;
}) {
    return (
        <Card className="relative overflow-hidden border-border/60">
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        {loading ? (
                            <Skeleton className="mt-2 h-8 w-24" />
                        ) : (
                            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
                        )}
                        {sub && !loading && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                        {icon}
                    </div>
                </div>
            </CardContent>
            <div className={`absolute -right-6 -bottom-6 h-20 w-20 rounded-full opacity-10 blur-2xl ${color}`} />
        </Card>
    );
}

// ---------------------------------------------------------------------------
// Chart card
// ---------------------------------------------------------------------------

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
    return (
        <Card className="border-border/60">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">{title}</CardTitle>
                    {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
                </div>
            </CardHeader>
            <CardContent className="pt-0">{children}</CardContent>
        </Card>
    );
}

// ---------------------------------------------------------------------------
// Status distribution bar
// ---------------------------------------------------------------------------

function StatusBar({ orders }: { orders: OrderWithId[] }) {
    const counts = useMemo(() => {
        const map: Record<string, number> = { PLACED: 0, PREPARING: 0, READY: 0, SERVED: 0, CANCELLED: 0, REJECTED: 0 };
        orders.forEach((o) => { if (o.status in map) map[o.status]++; });
        return map;
    }, [orders]);
    const total = orders.length || 1;

    const segments = [
        { key: "PLACED",    color: "bg-blue-500",   label: "Placed" },
        { key: "PREPARING", color: "bg-amber-500",  label: "Preparing" },
        { key: "READY",     color: "bg-green-400",  label: "Ready" },
        { key: "SERVED",    color: "bg-green-600",  label: "Served" },
        { key: "CANCELLED", color: "bg-red-400",    label: "Cancelled" },
        { key: "REJECTED",  color: "bg-red-600",    label: "Rejected" },
    ];

    return (
        <div className="space-y-3">
            {/* Stacked bar */}
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted gap-0.5">
                {segments.map((s) => {
                    const pct = (counts[s.key] / total) * 100;
                    if (pct === 0) return null;
                    return (
                        <div
                            key={s.key}
                            className={`${s.color} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                            title={`${s.label}: ${counts[s.key]}`}
                        />
                    );
                })}
            </div>
            {/* Legend */}
            <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
                {segments.filter((s) => counts[s.key] > 0).map((s) => (
                    <div key={s.key} className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${s.color}`} />
                        <span className="text-xs text-muted-foreground">{s.label}</span>
                        <span className="text-xs font-semibold text-foreground ml-auto">{counts[s.key]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Recent orders row skeleton
// ---------------------------------------------------------------------------

function OrderRowSkeleton() {
    return (
        <tr>
            {[1, 2, 3, 4, 5].map((i) => (
                <td key={i} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
            ))}
        </tr>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminDashboardPage() {
    const [orders, setOrders] = useState<OrderWithId[]>([]);
    const [allOrders, setAllOrders] = useState<OrderWithId[]>([]);
    const [menuCount, setMenuCount] = useState<number | null>(null);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [loadingStats, setLoadingStats] = useState(true);

    // Recent 20 orders (live)
    useEffect(() => {
        return listenToCollection<OrderDoc>(
            Collections.ORDERS,
            (docs) => { setOrders(docs as OrderWithId[]); setLoadingOrders(false); },
            [orderBy("createdAt", "desc"), limit(20)]
        );
    }, []);

    // All orders (for charts — limited to last 7 days worth via client filter)
    useEffect(() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return listenToCollection<OrderDoc>(
            Collections.ORDERS,
            (docs) => setAllOrders(docs as OrderWithId[]),
            [orderBy("createdAt", "desc"), limit(500)]
        );
    }, []);

    useEffect(() => {
        getCollection(Collections.MENU_ITEMS).then((items) => {
            setMenuCount(items.length);
            setLoadingStats(false);
        });
    }, []);

    // Derived stats
    const todayOrders = useMemo(() => allOrders.filter((o) => {
        if (!o.createdAt) return false;
        return o.createdAt.toDate() >= todayMidnight();
    }), [allOrders]);

    const todayRevenue = useMemo(() => todayOrders.reduce((s, o) => s + (o.total ?? 0), 0), [todayOrders]);
    const pendingOrders = useMemo(() => orders.filter((o) => o.status === "PLACED" || o.status === "PREPARING").length, [orders]);

    // Chart data
    const hourlyOrderData = useMemo(() => bucketByHour(todayOrders), [todayOrders]);
    const hourlyRevenueData = useMemo(() => revenueByHour(todayOrders), [todayOrders]);
    const weeklyData = useMemo(() => ordersByDay(allOrders), [allOrders]);

    const isLoading = loadingOrders || loadingStats;

    return (
        <div className="space-y-6">
            {/* Heading */}
            <div>
                <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
            </div>

            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Today's Orders" value={todayOrders.length} sub="since midnight" color="bg-blue-500" loading={isLoading}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>}
                />
                <StatCard title="Today's Revenue" value={fmt(todayRevenue)} sub="incl. GST + fees" color="bg-green-500" loading={isLoading}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
                />
                <StatCard title="Pending Orders" value={pendingOrders} sub="PLACED + PREPARING" color="bg-amber-500" loading={isLoading}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                />
                <StatCard title="Menu Items" value={menuCount ?? "—"} sub="in catalogue" color="bg-purple-500" loading={isLoading}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>}
                />
            </div>

            {/* Charts row */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Orders by hour (today) */}
                <ChartCard title="Orders Today — By Hour" sub="Live · resets midnight">
                    <LineChart
                        data={hourlyOrderData}
                        color="#3b82f6"
                        height={160}
                        formatValue={(v) => `${Math.round(v)} orders`}
                    />
                </ChartCard>

                {/* Revenue by hour (today) */}
                <ChartCard title="Revenue Today — By Hour" sub="Served orders only">
                    <LineChart
                        data={hourlyRevenueData}
                        color="#22c55e"
                        height={160}
                        formatValue={(v) => fmt(v)}
                    />
                </ChartCard>

                {/* Weekly order trend */}
                <ChartCard title="Orders — Last 7 Days" sub="All statuses">
                    <LineChart
                        data={weeklyData}
                        color="#f97316"
                        height={160}
                        formatValue={(v) => `${Math.round(v)} orders`}
                    />
                </ChartCard>
            </div>

            {/* Order status distribution */}
            <Card className="border-border/60">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold">Order Status Breakdown</CardTitle>
                        <span className="text-xs text-muted-foreground">Last 20 orders</span>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-10 w-full rounded-full" /> : <StatusBar orders={orders} />}
                </CardContent>
            </Card>

            {/* Recent orders table */}
            <Card className="border-border/60">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
                    <span className="text-xs text-muted-foreground">Live · auto-updates</span>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/40">
                                    {["Order ID", "Customer", "Items", "Total", "Time", "Status"].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loadingOrders ? (
                                    Array.from({ length: 5 }).map((_, i) => <OrderRowSkeleton key={i} />)
                                ) : orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                                            No orders yet. They'll appear here in real time.
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map((order) => {
                                        const st = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PLACED;
                                        return (
                                            <tr key={order.id} className="transition-colors hover:bg-muted/30">
                                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</td>
                                                <td className="px-4 py-3 font-medium text-foreground">
                                                    {order.customerName ?? "Guest"}
                                                    {order.tableId && <span className="ml-1.5 text-xs text-muted-foreground">· T{order.tableId}</span>}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</td>
                                                <td className="px-4 py-3 font-semibold text-foreground">{fmt(order.total)}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{fmtTime(order.createdAt as Timestamp)}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${st.className}`}>
                                                        {st.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

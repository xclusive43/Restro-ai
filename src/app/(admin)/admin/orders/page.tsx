"use client";

import { useEffect, useState } from "react";
import { listenToCollection, Collections } from "@/lib/firebase/firestore";
import { type OrderDoc } from "@/types/index";
import Pagination, { usePagination } from "@/components/shared/Pagination";

type OrderWithId = OrderDoc & { id: string };

const PAGE_SIZE = 15;

const statusStyle = (s: string) => {
    if (s === "SERVED")    return "bg-green-500/10 text-green-600";
    if (s === "READY")     return "bg-blue-500/10 text-blue-600";
    if (s === "CANCELLED" || s === "REJECTED") return "bg-red-500/10 text-red-600";
    return "bg-orange-500/10 text-orange-600";
};

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<OrderWithId[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("ALL");

    useEffect(() => {
        return listenToCollection<OrderDoc>(Collections.ORDERS, (docs) => {
            const sorted = (docs as OrderWithId[]).sort((a, b) =>
                (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
            );
            setOrders(sorted);
            setLoading(false);
        });
    }, []);

    const filtered = statusFilter === "ALL"
        ? orders
        : orders.filter((o) => o.status === statusFilter);

    const { page, setPage, pageItems, totalPages } = usePagination(filtered, PAGE_SIZE);

    const STATUSES = ["ALL", "PLACED", "PREPARING", "READY", "SERVED", "CANCELLED", "REJECTED"];
    const counts: Record<string, number> = { ALL: orders.length };
    STATUSES.slice(1).forEach((s) => {
        counts[s] = orders.filter((o) => o.status === s).length;
    });

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-foreground">All Orders</h1>
                <p className="text-sm text-muted-foreground">Complete history · {orders.length} total</p>
            </div>

            {/* Status filter tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
                {STATUSES.map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => { setStatusFilter(s); setPage(1); }}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-all border ${
                            statusFilter === s
                                ? "bg-orange-500 text-white border-orange-500"
                                : "bg-background border-border text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                        <span className="ml-1.5 opacity-75">{counts[s]}</span>
                    </button>
                ))}
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-5 py-4 font-medium">Order ID</th>
                                <th className="px-5 py-4 font-medium">Date / Time</th>
                                <th className="px-5 py-4 font-medium">Table / User</th>
                                <th className="px-5 py-4 font-medium">Items</th>
                                <th className="px-5 py-4 font-medium">Total</th>
                                <th className="px-5 py-4 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i}>
                                        {[1,2,3,4,5,6].map((c) => (
                                            <td key={c} className="px-5 py-3">
                                                <div className="h-4 bg-muted rounded animate-pulse" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : pageItems.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                                        {statusFilter === "ALL" ? "No orders found." : `No ${statusFilter.toLowerCase()} orders.`}
                                    </td>
                                </tr>
                            ) : (
                                pageItems.map((order) => (
                                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-5 py-3 font-mono text-xs font-semibold text-muted-foreground">
                                            #{order.id.slice(-8).toUpperCase()}
                                        </td>
                                        <td className="px-5 py-3 whitespace-nowrap text-muted-foreground text-xs">
                                            {order.createdAt?.toDate().toLocaleDateString("en-IN", {
                                                month: "short", day: "numeric",
                                            })}{" "}
                                            {order.createdAt?.toDate().toLocaleTimeString("en-IN", {
                                                hour: "2-digit", minute: "2-digit", hour12: true,
                                            })}
                                        </td>
                                        <td className="px-5 py-3">
                                            {order.tableId
                                                ? <span className="font-semibold text-orange-500">Table {order.tableId}</span>
                                                : <span className="text-muted-foreground">{order.userId === "guest" ? "Guest" : "Registered"}</span>
                                            }
                                        </td>
                                        <td className="px-5 py-3 max-w-[180px] truncate text-muted-foreground text-xs"
                                            title={order.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}>
                                            {order.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                                        </td>
                                        <td className="px-5 py-3 font-semibold">₹{order.total.toFixed(0)}</td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusStyle(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && filtered.length > 0 && (
                    <div className="px-5">
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            onChange={setPage}
                            total={filtered.length}
                            pageSize={PAGE_SIZE}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

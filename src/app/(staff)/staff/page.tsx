"use client";

import { useEffect, useState } from "react";
import { listenToCollection, Collections } from "@/lib/firebase/firestore";
import { type OrderDoc, type OrderStatus } from "@/types/index";
import OrderCard from "@/components/order/OrderCard";
import Pagination, { usePagination } from "@/components/shared/Pagination";

type OrderWithId = OrderDoc & { id: string };

const ACTIVE_STATUSES: OrderStatus[] = ["PLACED", "PREPARING", "READY"];
const PAGE_SIZE_ACTIVE = 12;
const PAGE_SIZE_SERVED = 8;

export default function StaffPanelPage() {
    const [orders, setOrders] = useState<OrderWithId[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<"ALL" | OrderStatus>("ALL");

    useEffect(() => {
        return listenToCollection<OrderDoc>(Collections.ORDERS, (docs) => {
            const sorted = (docs as OrderWithId[]).sort(
                (a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
            );
            setOrders(sorted);
            setLoading(false);
        });
    }, []);

    const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status as OrderStatus));
    const completedOrders = orders.filter((o) => o.status === "SERVED");

    const filteredActive = statusFilter === "ALL"
        ? activeOrders
        : activeOrders.filter((o) => o.status === statusFilter);

    const activePag = usePagination(filteredActive, PAGE_SIZE_ACTIVE);
    const servedPag = usePagination(completedOrders, PAGE_SIZE_SERVED);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-r-transparent" />
            </div>
        );
    }

    const STATUS_TABS: { key: "ALL" | OrderStatus; label: string; color: string }[] = [
        { key: "ALL",      label: "All Active",  color: "bg-orange-500" },
        { key: "PLACED",   label: "Placed",       color: "bg-blue-500" },
        { key: "PREPARING",label: "Preparing",    color: "bg-amber-500" },
        { key: "READY",    label: "Ready",        color: "bg-green-500" },
    ];

    const tabCounts: Record<string, number> = {
        ALL:       activeOrders.length,
        PLACED:    activeOrders.filter((o) => o.status === "PLACED").length,
        PREPARING: activeOrders.filter((o) => o.status === "PREPARING").length,
        READY:     activeOrders.filter((o) => o.status === "READY").length,
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-10">
            {/* Active Orders Section */}
            <section>
                <div className="flex flex-wrap items-center gap-3 mb-5">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Active Orders</h2>
                        <p className="text-xs text-muted-foreground">{activeOrders.length} need attention</p>
                    </div>

                    {/* Status filter pills */}
                    <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                        {STATUS_TABS.map(({ key, label, color }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => { setStatusFilter(key); activePag.setPage(1); }}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition-all border ${
                                    statusFilter === key
                                        ? `${color} text-white border-transparent`
                                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {label}
                                <span className="ml-1.5 opacity-80">{tabCounts[key]}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {filteredActive.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card">
                        <div className="text-5xl mb-3">
                            {statusFilter === "ALL" ? "😴" : statusFilter === "PLACED" ? "📋" : statusFilter === "PREPARING" ? "👨‍🍳" : "✅"}
                        </div>
                        <p className="font-semibold text-foreground">
                            {statusFilter === "ALL" ? "No active orders" : `No ${statusFilter.toLowerCase()} orders`}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">Orders will appear here as they come in.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {activePag.pageItems.map((order) => (
                                <OrderCard key={order.id} order={order} />
                            ))}
                        </div>
                        <Pagination
                            page={activePag.page}
                            totalPages={activePag.totalPages}
                            onChange={activePag.setPage}
                            total={filteredActive.length}
                            pageSize={PAGE_SIZE_ACTIVE}
                            className="mt-4"
                        />
                    </>
                )}
            </section>

            {/* Recently Served Section */}
            <section>
                <div className="flex items-center gap-3 mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-foreground opacity-70">Recently Served</h2>
                        <p className="text-xs text-muted-foreground">{completedOrders.length} completed</p>
                    </div>
                </div>

                {completedOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground border border-dashed border-border rounded-xl p-6 text-center">
                        No completed orders yet.
                    </p>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 opacity-70">
                            {servedPag.pageItems.map((order) => (
                                <OrderCard key={order.id} order={order} />
                            ))}
                        </div>
                        <Pagination
                            page={servedPag.page}
                            totalPages={servedPag.totalPages}
                            onChange={servedPag.setPage}
                            total={completedOrders.length}
                            pageSize={PAGE_SIZE_SERVED}
                            className="mt-4"
                        />
                    </>
                )}
            </section>
        </div>
    );
}

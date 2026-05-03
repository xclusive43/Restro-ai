"use client";

import { useState } from "react";
import { type OrderDoc, type OrderStatus } from "@/types/index";
import { toast } from "sonner";

interface OrderCardProps {
    order: OrderDoc & { id: string };
}

const statusOptions: OrderStatus[] = ["PLACED", "PREPARING", "READY", "SERVED", "CANCELLED", "REJECTED"];

export default function OrderCard({ order }: OrderCardProps) {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleStatusUpdate = async (newStatus: OrderStatus) => {
        setIsUpdating(true);
        try {
            const res = await fetch("/api/update-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: order.id, status: newStatus }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            toast.success(`Order ${order.id.slice(-4)} moved to ${newStatus}`);
        } catch (error: any) {
            toast.error(error.message || "Failed to update status");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col h-full transition-all">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <span className="inline-block px-2 py-1 bg-muted text-xs font-semibold rounded-md mb-1 text-muted-foreground">
                        #{order.id.slice(-6).toUpperCase()}
                    </span>
                    <h3 className="font-bold text-foreground text-sm">
                        {order.customerName || "Guest"}
                    </h3>
                </div>
                <div className="text-right">
                    <p className="font-bold text-orange-500">₹{order.total.toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">{order.items.length} items</p>
                </div>
            </div>

            <div className="flex-1">
                <ul className="text-sm space-y-1 mb-4">
                    {order.items.map((item, i) => (
                        <li key={i} className="flex justify-between text-muted-foreground">
                            <span><span className="font-medium text-foreground">{item.qty}x</span> {item.name}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="mt-auto pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-muted-foreground block">Update Status</label>
                    {order.status === "SERVED" && (
                        <button 
                            onClick={() => window.open(`/receipt/${order.id}`, '_blank')}
                            className="text-[10px] font-bold text-orange-500 hover:text-orange-600 inline-flex items-center gap-1 bg-orange-500/10 px-2 py-0.5 rounded-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                            Print
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {statusOptions.map((status) => (
                        <button
                            key={status}
                            disabled={isUpdating}
                            onClick={() => handleStatusUpdate(status)}
                            className={`px-1 py-1.5 text-[10px] sm:text-xs font-semibold rounded-md transition-all truncate ${
                                order.status === status
                                    ? (status === "CANCELLED" || status === "REJECTED" ? "bg-red-500 text-white shadow-md" : "bg-orange-500 text-white shadow-md shadow-orange-500/20")
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

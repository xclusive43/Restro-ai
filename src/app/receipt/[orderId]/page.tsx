"use client";

import { useEffect, useState } from "react";
import { getDocById, Collections } from "@/lib/firebase/firestore";
import { type OrderDoc } from "@/types/index";
import { use } from "react";
import { useSettingsStore } from "@/store/settingsStore";

export default function ReceiptPage({ params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = use(params);
    const [order, setOrder] = useState<OrderDoc | null>(null);
    const [loading, setLoading] = useState(true);
    const settings = useSettingsStore(s => s.settings) || { restaurantName: "RestroAI" };

    useEffect(() => {
        getDocById<OrderDoc>(Collections.ORDERS, orderId).then((doc) => {
            if (doc) setOrder(doc);
            setLoading(false);
        });
    }, [orderId]);

    useEffect(() => {
        if (!loading && order) {
            // Automatically open print dialog when data is loaded
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [loading, order]);

    if (loading) return <div className="p-10 text-center font-mono">Loading Receipt...</div>;
    if (!order) return <div className="p-10 text-center font-mono text-red-500">Order not found.</div>;

    return (
        <div className="bg-white text-black min-h-screen p-4 md:p-8 font-mono print:p-0 print:bg-transparent">
            {/* The actual printable area */}
            <div className="max-w-sm mx-auto border border-gray-300 p-6 shadow-sm print:border-none print:shadow-none print:max-w-none print:w-[80mm] print:m-0 print:p-0 text-sm">
                
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold uppercase tracking-widest mb-1">{settings.restaurantName}</h1>
                    <p className="text-xs text-gray-600">123 Smart Avenue, Tech City</p>
                    <p className="text-xs text-gray-600">GSTIN: 29ABCDE1234F1Z5</p>
                    <p className="text-xs text-gray-600">Phone: +91 98765 43210</p>
                </div>

                {/* Meta */}
                <div className="border-t border-b border-dashed border-gray-400 py-3 mb-4 space-y-1 text-xs">
                    <div className="flex justify-between">
                        <span>Order ID:</span>
                        <span className="font-bold">{orderId.slice(-8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Date:</span>
                        <span>{order.createdAt?.toDate().toLocaleString('en-IN')}</span>
                    </div>
                    {order.tableId && (
                        <div className="flex justify-between">
                            <span>Table No:</span>
                            <span className="font-bold">{order.tableId}</span>
                        </div>
                    )}
                </div>

                {/* Items */}
                <table className="w-full text-xs mb-4">
                    <thead>
                        <tr className="border-b border-gray-400 border-dashed text-left">
                            <th className="pb-2">Qty</th>
                            <th className="pb-2">Item</th>
                            <th className="pb-2 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 divide-dashed">
                        {order.items.map((item, i) => (
                            <tr key={i}>
                                <td className="py-2 align-top">{item.qty}</td>
                                <td className="py-2 align-top pr-2">{item.name} <br/> <span className="text-[10px] text-gray-500">@ ₹{item.price}</span></td>
                                <td className="py-2 align-top text-right">₹{(item.price * item.qty).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="border-t border-dashed border-gray-400 pt-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₹{(order.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>GST & Taxes:</span>
                        <span>₹{(order.gst || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Platform Fee:</span>
                        <span>₹{(order.platformFee || 0).toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-400 font-bold text-base">
                        <span>GRAND TOTAL:</span>
                        <span>₹{order.total.toFixed(2)}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 pt-4 border-t border-dashed border-gray-400">
                    <p className="font-bold mb-1">Thank You!</p>
                    <p className="text-xs text-gray-600">Please visit again</p>
                    <p className="text-[10px] text-gray-400 mt-4 text-center">Powered by RestroAI</p>
                </div>
            </div>

            {/* Screen-only controls */}
            <div className="max-w-sm mx-auto mt-6 flex gap-4 print:hidden">
                <button 
                    onClick={() => window.print()}
                    className="flex-1 bg-black text-white py-2 rounded font-semibold text-sm hover:bg-gray-800 transition-colors"
                >
                    Print Receipt
                </button>
                <button 
                    onClick={() => window.close()}
                    className="flex-1 bg-gray-200 text-black py-2 rounded font-semibold text-sm hover:bg-gray-300 transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );
}

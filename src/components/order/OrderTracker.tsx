"use client";

import { useEffect, useState, useRef } from "react";
import { realtimeDb } from "@/lib/firebase/client";
import { ref, onValue } from "firebase/database";
import { getDocById, Collections } from "@/lib/firebase/firestore";
import { type OrderDoc, type LiveOrderStatus } from "@/types/index";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";
import { useSettingsStore } from "@/store/settingsStore";

// Helper components for UI
const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

const statuses = [
    { key: "PLACED", label: "Order Placed", sub: "We've received your order", color: "text-gray-500", ring: "ring-gray-500/20" },
    { key: "PREPARING", label: "Preparing", sub: "Chef is cooking your meal", color: "text-yellow-500", ring: "ring-yellow-500/20" },
    { key: "READY", label: "Ready", sub: "Your order is ready to be served", color: "text-green-500", ring: "ring-green-500/20" },
    { key: "SERVED", label: "Served", sub: "Enjoy your meal!", color: "text-blue-500", ring: "ring-blue-500/20" },
];

export default function OrderTracker({ orderId }: { orderId: string }) {
    const [order, setOrder] = useState<OrderDoc | null>(null);
    const [liveStatus, setLiveStatus] = useState<LiveOrderStatus | null>(null);
    const [loading, setLoading] = useState(true);

    const clearActiveOrderId = useCartStore((s) => s.setActiveOrderId);
    const [rating, setRating] = useState(0);
    const [feedbackDone, setFeedbackDone] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const settings = useSettingsStore(s => s.settings) || { restaurantName: "RestroAI" };
    const [feedback, setFeedback] = useState("");
    const [submitted, setSubmitted] = useState(false);

    // Audio Notification
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio("/sounds/served.wav");

        // Unlock audio on first user interaction so it can auto-play later
        const unlockAudio = () => {
            if (audioRef.current) {
                audioRef.current.play().then(() => {
                    audioRef.current?.pause();
                    audioRef.current!.currentTime = 0;
                }).catch(() => { });
            }
            document.removeEventListener("click", unlockAudio);
            document.removeEventListener("touchstart", unlockAudio);
        };

        document.addEventListener("click", unlockAudio);
        document.addEventListener("touchstart", unlockAudio);

        return () => {
            document.removeEventListener("click", unlockAudio);
            document.removeEventListener("touchstart", unlockAudio);
        };
    }, []);

    // 1. Fetch static order details from Firestore
    useEffect(() => {
        getDocById<OrderDoc>(Collections.ORDERS, orderId).then((doc) => {
            if (doc) setOrder(doc);
        });
    }, [orderId]);

    // 2. Listen to Realtime DB for live status updates
    useEffect(() => {
        const liveRef = ref(realtimeDb, `orders_live/${orderId}`);
        const unsubscribe = onValue(liveRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setLiveStatus(data);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [orderId]);

    // Handle Notification Loop when READY, and clear tracking when SERVED
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (liveStatus?.status === "READY") {
            // Start the ring and vibrate loop
            interval = setInterval(() => {
                // Play sound
                if (audioRef.current) {
                    audioRef.current.currentTime = 0;
                    audioRef.current.play().catch(e => console.log("Audio block:", e));
                }
                // Vibrate (only works on supported mobile devices)
                if (typeof navigator !== "undefined" && navigator.vibrate) {
                    navigator.vibrate([200, 100, 200]);
                }
            }, 3000); // Repeat every 3 seconds
        } else if (liveStatus?.status === "SERVED") {
            // Stop looping immediately and clear cart tracking
            clearActiveOrderId(null);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [liveStatus?.status, clearActiveOrderId]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFeedbackSubmit = async () => {
        if (rating === 0) {
            toast.error("Please select a rating before submitting.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, rating, feedback }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }

            setSubmitted(true);
            toast.success("Thank you for your feedback!");
        } catch (err: any) {
            toast.error(err.message || "Failed to submit feedback.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-10 animate-pulse text-muted-foreground">Loading tracker...</div>;
    }

    if (!order) {
        return <div className="text-center py-10 text-destructive">Order not found.</div>;
    }

    const currentStatus = liveStatus?.status || order.status;
    const currentIndex = statuses.findIndex(s => s.key === currentStatus);

    return (
        <div className="glass max-w-md mx-auto p-6 md:p-8 rounded-2xl shadow-md border border-border/50">
            <div className="mb-8">
                <h2 className="text-xl font-bold text-foreground mb-1">Order Tracker</h2>
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-sm text-muted-foreground">Order ID: <span className="font-mono text-xs">{orderId}</span></p>
                        {order.tableId && (
                            <p className="text-sm font-semibold text-foreground mt-1">Table: <span className="text-orange-500">{order.tableId}</span></p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className={`text-lg font-semibold ${statuses[currentIndex]?.color || "text-foreground"}`}>
                            {currentStatus}
                        </p>
                        {currentStatus === "SERVED" && (
                            <button 
                                onClick={() => window.open(`/receipt/${orderId}`, '_blank')}
                                className="text-xs font-bold text-orange-500 hover:text-orange-600 mt-1 inline-flex items-center gap-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                                Print Receipt
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Status Timeline or Error State */}
            {currentStatus === "CANCELLED" || currentStatus === "REJECTED" ? (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl p-6 text-center space-y-2 mb-6">
                    <div className="text-4xl mb-2">❌</div>
                    <h3 className="font-bold text-lg">Order {currentStatus === "CANCELLED" ? "Cancelled" : "Rejected"}</h3>
                    <p className="text-sm opacity-80">This order cannot be fulfilled. Please speak to the staff for assistance.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {statuses.map((s, idx) => {
                        const isCompleted = idx <= currentIndex;
                        const isCurrent = idx === currentIndex;
                        const isLast = idx === statuses.length - 1;

                        return (
                            <div key={s.key} className="relative flex items-start gap-4">
                                {/* Vertical Line */}
                                {!isLast && (
                                    <div className={`absolute top-8 left-4 w-0.5 h-10 -ml-px ${idx < currentIndex ? 'bg-orange-500' : 'bg-muted'}`} />
                                )}

                                {/* Circle Indicator */}
                                <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${isCompleted ? 'bg-orange-500 border-orange-500' : 'bg-background border-muted'
                                    } ${isCurrent ? `ring-4 ${s.ring}` : ''}`}>
                                    {isCompleted && <CheckIcon />}
                                </div>

                                {/* Text content */}
                                <div className="pt-1">
                                    <p className={`text-base font-semibold ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Items Summary */}
            <div className="mt-10 pt-6 border-t border-border">
                <h3 className="font-semibold text-sm mb-3">Order Items</h3>
                <ul className="space-y-2 text-sm">
                    {order.items.map((item, i) => (
                        <li key={i} className="flex justify-between">
                            <span className="text-muted-foreground">{item.qty}x {item.name}</span>
                            <span className="font-medium">₹{(item.price * item.qty).toFixed(0)}</span>
                        </li>
                    ))}
                </ul>
                <div className="mt-4 pt-3 border-t border-border space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>₹{(order.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>GST & Taxes</span>
                        <span>₹{(order.gst || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Platform Fee</span>
                        <span>₹{(order.platformFee || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-border font-bold text-lg text-foreground">
                        <span>Total</span>
                        <span>₹{order.total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Payment & Feedback (Only shows when served) */}
            {currentStatus === "SERVED" && (
                <div className="mt-8 pt-8 border-t-2 border-dashed border-border animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-8">
                        <h3 className="text-xl font-bold text-foreground mb-2">Payment Details</h3>
                        <p className="text-sm text-muted-foreground mb-4">Please scan the QR code below or pay at the counter.</p>

                        <div className="bg-white p-4 rounded-xl inline-block shadow-md">
                            {/* Mock QR Code Pattern using CSS grids to look somewhat real */}
                            <div className="w-48 h-48 border border-gray-200 rounded-lg p-2 flex items-center justify-center relative">
                                <div className="absolute inset-0 m-2 grid grid-cols-5 gap-1 opacity-20 pointer-events-none">
                                    {[...Array(25)].map((_, i) => (
                                        <div key={i} className={`bg-black rounded-sm ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-0'}`} />
                                    ))}
                                </div>
                                <div className="z-10 bg-white/90 p-2 text-center rounded">
                                    <span className="text-xs text-gray-500 font-mono font-bold">UPI Payment</span><br />
                                    <span className="text-lg text-black font-bold">₹{order.total.toFixed(0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {!submitted ? (
                        <div className="bg-muted/30 p-5 rounded-2xl border border-border">
                            <h3 className="font-bold mb-3 text-center">Rate your experience</h3>
                            <div className="flex justify-center gap-2 mb-4">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        key={star}
                                        onClick={() => setRating(star)}
                                        className={`text-4xl transition-all hover:scale-110 active:scale-95 ${rating >= star ? "text-orange-500 drop-shadow-sm" : "text-muted"
                                            }`}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Any suggestions for us? (Optional)"
                                className="w-full bg-background border border-border rounded-xl p-3 text-sm resize-none mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                rows={3}
                            />
                            <button
                                onClick={handleFeedbackSubmit}
                                disabled={isSubmitting}
                                className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 active:scale-[0.98] transition-all shadow-md shadow-orange-500/20 disabled:opacity-70 disabled:pointer-events-none"
                            >
                                {isSubmitting ? "Submitting..." : "Submit Feedback"}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-green-500/10 text-green-600 p-6 rounded-2xl border border-green-500/20 text-center animate-in zoom-in-95 duration-300">
                            <div className="text-4xl mb-2">💚</div>
                            <p className="font-bold text-lg">Feedback Received!</p>
                            <p className="text-sm mt-1 opacity-80">Thank you for dining with {settings.restaurantName}.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

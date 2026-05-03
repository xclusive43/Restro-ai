"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { type OrderDoc } from "@/types/index";
import { logout } from "@/lib/firebase/auth";
import Link from "next/link";

type OrderWithId = OrderDoc & { id: string };

export default function AccountPage() {
    const { user, isGuest, loading } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<OrderWithId[]>([]);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (!loading && (!user || isGuest)) {
            router.push("/");
            return;
        }

        if (user && !isGuest) {
            fetchOrders(user.uid);
        }
    }, [user, isGuest, loading, router]);

    const fetchOrders = async (uid: string) => {
        try {
            // Fetch orders for this user without server-side orderBy to avoid requiring a composite index immediately
            const q = query(
                collection(db, "orders"),
                where("userId", "==", uid)
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderWithId));
            
            // Sort newest first client-side
            data.sort((a, b) => {
                const timeA = a.createdAt?.toMillis() || 0;
                const timeB = b.createdAt?.toMillis() || 0;
                return timeB - timeA;
            });
            
            setOrders(data);
        } catch (err) {
            console.error("Failed to fetch orders:", err);
        } finally {
            setFetching(false);
        }
    };

    if (loading || fetching) {
        return <div className="min-h-screen p-8 text-center animate-pulse text-muted-foreground">Loading account...</div>;
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="max-w-2xl mx-auto px-4 pt-6">
                <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors bg-muted/50 hover:bg-muted px-4 py-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Back to Menu
                </Link>
            </div>
            <header className="px-4 py-6 max-w-2xl mx-auto flex items-center justify-between border-b border-border mt-2">
                <div className="flex items-center gap-3">
                    {user?.photoURL ? (
                        <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-full border border-border" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                            {user?.displayName?.[0]?.toUpperCase() || "U"}
                        </div>
                    )}
                    <div>
                        <h1 className="text-xl font-bold text-foreground">{user?.displayName || "My Account"}</h1>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                </div>
                <button
                    onClick={async () => {
                        await logout();
                        router.push("/");
                    }}
                    className="text-sm text-red-500 font-semibold px-4 py-2 rounded-full hover:bg-red-500/10 transition-colors"
                >
                    Logout
                </button>
            </header>

            <main className="px-4 py-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-foreground">Order History</h2>
                    <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Back to Menu</Link>
                </div>

                {orders.length === 0 ? (
                    <div className="text-center p-12 bg-card rounded-2xl border border-dashed border-border">
                        <div className="text-4xl mb-4">🍽️</div>
                        <p className="text-muted-foreground font-medium">You haven't placed any orders yet.</p>
                        <Link href="/" className="inline-block mt-4 px-6 py-2 bg-orange-500 text-white rounded-full font-semibold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20">
                            Start Ordering
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div key={order.id} className="p-4 bg-card border border-border rounded-xl shadow-sm flex flex-col gap-3 transition-colors hover:border-orange-500/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-muted-foreground">#{order.id.slice(-6).toUpperCase()}</span>
                                        <span className="text-xs text-muted-foreground">•</span>
                                        <span className="text-xs text-muted-foreground">
                                            {order.createdAt?.toDate().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                                        order.status === "SERVED" ? "bg-green-500/10 text-green-600" : 
                                        (order.status === "CANCELLED" || order.status === "REJECTED") ? "bg-red-500/10 text-red-600" :
                                        "bg-orange-500/10 text-orange-600 animate-pulse"
                                    }`}>
                                        {order.status}
                                    </span>
                                </div>
                                
                                <div>
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                        {order.items.map(i => `${i.qty}x ${i.name}`).join(", ")}
                                    </p>
                                </div>

                                <div className="border-t border-border pt-3 mt-1 flex justify-between items-center">
                                    <p className="font-bold text-foreground">₹{order.total.toFixed(0)}</p>
                                    <Link href={`/track/${order.id}`} className="text-sm font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1">
                                        {order.status === "SERVED" ? "View Receipt" : "Live Track"} →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

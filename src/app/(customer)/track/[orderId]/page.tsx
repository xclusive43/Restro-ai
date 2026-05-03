import OrderTracker from "@/components/order/OrderTracker";
import { use } from "react";
import Link from "next/link";

export default function TrackOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = use(params);
    
    return (
        <div className="min-h-screen bg-background py-8 px-4">
            <div className="max-w-md mx-auto mb-6">
                <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors bg-muted/50 hover:bg-muted px-4 py-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Back to Menu
                </Link>
            </div>
            <OrderTracker orderId={orderId} />
        </div>
    );
}

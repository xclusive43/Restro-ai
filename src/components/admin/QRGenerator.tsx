"use client"

import QRCode from "qrcode"
import { useEffect, useState } from "react"

export default function QRGenerator() {
    const [qr, setQr] = useState("");
    const [tableId, setTableId] = useState("T1"); // later dynamic

    useEffect(() => {
        const url = `${window.location.origin}?tableId=${tableId}`;
        QRCode.toDataURL(url, {
            width: 250,
            margin: 2,
            color: {
                dark: "#000000",
                light: "#ffffff"
            }
        }).then(setQr).catch(console.error);
    }, [tableId]);

    return (
        <div className="glass p-6 rounded-2xl shadow-md border border-border/50 space-y-4 max-w-sm">
            <h3 className="font-semibold text-lg text-foreground">Table QR Generator</h3>
            
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={tableId}
                    onChange={(e) => setTableId(e.target.value.toUpperCase())}
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter Table ID (e.g., T1)"
                />
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-inner">
                {qr ? (
                    <img src={qr} alt={`QR for ${tableId}`} className="w-48 h-48 rounded-lg" />
                ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-muted-foreground bg-muted rounded-lg">
                        Generating...
                    </div>
                )}
                <p className="text-sm font-bold mt-3 text-black">Scan to Order at {tableId}</p>
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
                Customers scanning this code will instantly have their orders assigned to this table.
            </p>
        </div>
    );
}

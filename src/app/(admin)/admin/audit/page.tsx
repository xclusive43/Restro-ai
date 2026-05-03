"use client";

import { useEffect, useState } from "react";
import { listenToCollection, Collections } from "@/lib/firebase/firestore";
import { type AuditLogDoc } from "@/types/index";
import Pagination, { usePagination } from "@/components/shared/Pagination";

type AuditLogWithId = AuditLogDoc & { id: string };

const PAGE_SIZE = 20;

function actionBadge(action: string) {
    if (action.includes("ORDER"))  return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    if (action.includes("STATUS")) return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    if (action.includes("DELETE")) return "bg-red-500/10 text-red-600 border-red-500/20";
    if (action.includes("CREATE") || action.includes("ADD")) return "bg-green-500/10 text-green-600 border-green-500/20";
    return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
}

export default function AdminAuditLogsPage() {
    const [logs, setLogs] = useState<AuditLogWithId[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        return listenToCollection<AuditLogDoc>("audit_logs" as any, (docs) => {
            const sorted = (docs as AuditLogWithId[]).sort((a, b) =>
                (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
            );
            setLogs(sorted);
            setLoading(false);
        });
    }, []);

    const filtered = search.trim()
        ? logs.filter((l) =>
            l.action.toLowerCase().includes(search.toLowerCase()) ||
            l.details?.toLowerCase().includes(search.toLowerCase()) ||
            l.userRole?.toLowerCase().includes(search.toLowerCase())
          )
        : logs;

    const { page, setPage, pageItems, totalPages } = usePagination(filtered, PAGE_SIZE);

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
                    <p className="text-sm text-muted-foreground">System-wide activity tracker · {logs.length} entries</p>
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 min-w-[220px]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                        type="search"
                        placeholder="Search logs…"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-5 py-4 font-medium">Timestamp</th>
                                <th className="px-5 py-4 font-medium">Action</th>
                                <th className="px-5 py-4 font-medium">Details</th>
                                <th className="px-5 py-4 font-medium">User Role</th>
                                <th className="px-5 py-4 font-medium">Target ID</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i}>
                                        {[1,2,3,4,5].map((c) => (
                                            <td key={c} className="px-5 py-3">
                                                <div className="h-4 bg-muted rounded animate-pulse" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : pageItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                                        {search ? "No logs match your search." : "No activity logs found."}
                                    </td>
                                </tr>
                            ) : (
                                pageItems.map((log) => (
                                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-5 py-3 whitespace-nowrap text-muted-foreground text-xs">
                                            {log.createdAt?.toDate().toLocaleDateString("en-IN", {
                                                month: "short", day: "numeric",
                                            })}{" "}
                                            {log.createdAt?.toDate().toLocaleTimeString("en-IN", {
                                                hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
                                            })}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`inline-flex px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wide ${actionBadge(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-foreground text-xs max-w-[260px] truncate" title={log.details}>
                                            {log.details}
                                        </td>
                                        <td className="px-5 py-3 capitalize text-muted-foreground text-xs">{log.userRole}</td>
                                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                                            {log.targetId ? log.targetId.slice(-8).toUpperCase() : "—"}
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

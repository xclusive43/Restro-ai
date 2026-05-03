"use client";

/**
 * StaffManager — Admin CRUD for staff members
 *
 * Add (manager/cook/server), edit, block/unblock, delete.
 * Staff are stored in the `users` collection with role: "staff".
 *
 * Usage (in /admin/staff page):
 *   <StaffManager />
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Pagination, { usePagination } from "@/components/shared/Pagination";

import {
    listenToCollection, getCollection, updateDocument, deleteDocument, Collections,
} from "@/lib/firebase/firestore";
import { where } from "firebase/firestore";
import { type UserDoc, type StaffRole } from "@/types/index";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StaffWithId = UserDoc & { id: string };

interface StaffFormData {
    name: string;
    email: string;
    phone: string;
    staffRole: StaffRole;
}

const EMPTY_FORM: StaffFormData = { name: "", email: "", phone: "", staffRole: "server" };

const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
    manager: "Manager",
    cook: "Cook / Chef",
    server: "Server / Waiter",
};

const STAFF_ROLE_ICONS: Record<StaffRole, string> = {
    manager: "👔",
    cook: "👨‍🍳",
    server: "🍽️",
};

// ---------------------------------------------------------------------------
// Avatar initials
// ---------------------------------------------------------------------------

function Avatar({ name, blocked }: { name: string; blocked?: boolean }) {
    const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    return (
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${blocked ? "bg-zinc-200 text-zinc-400 dark:bg-zinc-700" : "bg-orange-500/15 text-orange-600"}`}>
            {initials || "?"}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Staff row
// ---------------------------------------------------------------------------

function StaffRow({ staff, onEdit, onBlock, onDelete, busy }: {
    staff: StaffWithId;
    onEdit: () => void;
    onBlock: () => void;
    onDelete: () => void;
    busy: boolean;
}) {
    const blocked = staff.isBlocked ?? false;

    return (
        <div className={`flex items-center gap-4 rounded-xl border bg-card px-4 py-3 transition-all hover:shadow-sm ${blocked ? "border-zinc-200 opacity-75 dark:border-zinc-700" : "border-border"}`}>
            <Avatar name={staff.name} blocked={blocked} />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground truncate">{staff.name}</p>
                    {/* Staff role badge */}
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {STAFF_ROLE_ICONS[staff.staffRole as StaffRole] ?? "👤"}{" "}
                        {STAFF_ROLE_LABELS[staff.staffRole as StaffRole] ?? staff.staffRole}
                    </span>
                    {/* Blocked badge */}
                    {blocked && (
                        <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-500">
                            Blocked
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-muted-foreground">{staff.email}</p>
                    {staff.phone && (
                        <p className="text-xs text-muted-foreground">· {staff.phone}</p>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={onEdit} disabled={busy}
                    className="h-8 px-3 text-xs">
                    Edit
                </Button>
                <Button variant="outline" size="sm" onClick={onBlock} disabled={busy}
                    className={`h-8 px-3 text-xs ${blocked ? "text-green-600 border-green-500/30 hover:bg-green-500/10" : "text-amber-600 border-amber-500/30 hover:bg-amber-500/10"}`}>
                    {busy ? "…" : blocked ? "Unblock" : "Block"}
                </Button>
                <Button variant="outline" size="sm" onClick={onDelete} disabled={busy}
                    className="h-8 px-3 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                    Delete
                </Button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Staff form dialog (Add + Edit)
// ---------------------------------------------------------------------------

function StaffFormDialog({ open, onClose, editing }: {
    open: boolean;
    onClose: () => void;
    editing: StaffWithId | null;
}) {
    const [form, setForm] = useState<StaffFormData>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setForm(editing
            ? { name: editing.name, email: editing.email, phone: editing.phone ?? "", staffRole: (editing.staffRole as StaffRole) ?? "server" }
            : EMPTY_FORM
        );
    }, [editing, open]);

    const set = (k: keyof StaffFormData, v: string) =>
        setForm((p) => ({ ...p, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim()) return;
        setSaving(true);
        try {
            if (editing) {
                // Edit existing staff — safe to update by known ID
                await updateDocument<UserDoc>(Collections.USERS, editing.id, {
                    name: form.name.trim(),
                    phone: form.phone.trim() || undefined,
                    staffRole: form.staffRole,
                });
                toast.success(`${form.name} updated`);
                onClose();
            } else {
                // Promote by email — find their existing Firebase Auth user doc
                const results = await getCollection<UserDoc>(Collections.USERS, [
                    where("email", "==", form.email.trim().toLowerCase()),
                ]);

                if (results.length === 0) {
                    toast.error(
                        `No account found for "${form.email}". Ask them to sign up at /login first, then promote them here.`
                    );
                    return;
                }

                const existingUser = results[0];

                if (existingUser.role === "admin") {
                    toast.error("This user is an admin. Cannot change their role.");
                    return;
                }

                await updateDocument<UserDoc>(Collections.USERS, existingUser.id, {
                    name: form.name.trim() || existingUser.name,
                    phone: form.phone.trim() || undefined,
                    role: "staff",
                    staffRole: form.staffRole,
                    isBlocked: false,
                });
                toast.success(`${form.name || existingUser.name} promoted to ${STAFF_ROLE_LABELS[form.staffRole]}`);
                onClose();
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to save. Check permissions.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{editing ? "Edit Staff Member" : "Promote User to Staff"}</DialogTitle>
                    <DialogDescription>
                        {editing
                            ? "Update this staff member's details or role."
                            : "Enter the email of a user who has already signed up at /login."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    {/* Name */}
                    <div className="space-y-1.5">
                        <label htmlFor="staff-name" className="text-sm font-medium text-foreground">
                            Full Name <span className="text-destructive">*</span>
                        </label>
                        <Input id="staff-name" placeholder="e.g. Rahul Sharma" value={form.name}
                            onChange={(e) => set("name", e.target.value)} disabled={saving} required autoFocus />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <label htmlFor="staff-email" className="text-sm font-medium text-foreground">
                            Email <span className="text-destructive">*</span>
                        </label>
                        <Input id="staff-email" type="email" placeholder="rahul@example.com" value={form.email}
                            onChange={(e) => set("email", e.target.value)} disabled={saving || !!editing} required />
                        {!editing && (
                            <p className="text-xs text-muted-foreground">
                                ⚠️ Staff must <strong>sign up at /login first</strong>, then you can promote them here by their email.
                            </p>
                        )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                        <label htmlFor="staff-phone" className="text-sm font-medium text-foreground">Phone</label>
                        <Input id="staff-phone" type="tel" placeholder="+91 98765 43210" value={form.phone}
                            onChange={(e) => set("phone", e.target.value)} disabled={saving} />
                    </div>

                    {/* Staff role */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Role</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(Object.entries(STAFF_ROLE_LABELS) as [StaffRole, string][]).map(([role, label]) => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => set("staffRole", role)}
                                    disabled={saving}
                                    className={[
                                        "flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-center transition-all",
                                        form.staffRole === role
                                            ? "border-orange-500 bg-orange-500/10 text-orange-600"
                                            : "border-border text-muted-foreground hover:border-orange-400/50 hover:text-foreground",
                                    ].join(" ")}
                                >
                                    <span className="text-xl">{STAFF_ROLE_ICONS[role]}</span>
                                    <span className="text-xs font-medium leading-tight">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                        <Button id="btn-save-staff" type="submit"
                            disabled={saving || !form.name.trim() || !form.email.trim()}
                            className="bg-orange-500 hover:bg-orange-600 text-white">
                            {saving ? "Saving…" : editing ? "Save changes" : "Add staff"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Delete confirm dialog
// ---------------------------------------------------------------------------

function DeleteDialog({ staff, onClose, onConfirm, deleting }: {
    staff: StaffWithId | null;
    onClose: () => void;
    onConfirm: () => void;
    deleting: boolean;
}) {
    return (
        <Dialog open={!!staff} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Remove staff member?</DialogTitle>
                    <DialogDescription>
                        This will revoke their staff access. They will be demoted to a regular customer account.
                    </DialogDescription>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    Remove <span className="font-medium text-foreground">"{staff?.name}"</span> from staff?
                    Their login access will be revoked. This cannot be undone.
                </p>
                <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={onClose} disabled={deleting}>Cancel</Button>
                    <Button id="btn-confirm-delete-staff" variant="destructive" onClick={onConfirm} disabled={deleting}>
                        {deleting ? "Removing…" : "Yes, remove"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// StaffManager (main export)
// ---------------------------------------------------------------------------

export default function StaffManager() {
    const [staff, setStaff] = useState<StaffWithId[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterRole, setFilterRole] = useState<StaffRole | "all">("all");

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<StaffWithId | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<StaffWithId | null>(null);

    const [busyId, setBusyId] = useState<string | null>(null);

    // Real-time — all users with role "staff"
    useEffect(() => {
        const unsub = listenToCollection<UserDoc>(
            Collections.USERS,
            (docs) => {
                const staffDocs = (docs as StaffWithId[]).filter((d) => d.role === "staff");
                setStaff(staffDocs);
                setLoading(false);
            }
        );
        return unsub;
    }, []);

    const filtered = useMemo(() =>
        filterRole === "all"
            ? staff
            : staff.filter((s) => s.staffRole === filterRole),
        [staff, filterRole]
    );

    const PAGE_SIZE = 8;
    const { page, setPage, pageItems, totalPages } = usePagination(filtered, PAGE_SIZE);
    useMemo(() => { setPage(1); }, [filterRole]);

    // Toggle block
    const handleBlock = async (member: StaffWithId) => {
        setBusyId(member.id);
        try {
            const next = !member.isBlocked;
            await updateDocument<UserDoc>(Collections.USERS, member.id, { isBlocked: next });
            toast.success(`${member.name} ${next ? "blocked" : "unblocked"}`);
        } catch {
            toast.error("Failed to update. Check permissions.");
        } finally {
            setBusyId(null);
        }
    };

    // Delete
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setBusyId(deleteTarget.id);
        try {
            await deleteDocument(Collections.USERS, deleteTarget.id);
            toast.success(`${deleteTarget.name} removed`);
            setDeleteTarget(null);
        } catch {
            toast.error("Failed to remove. Check permissions.");
        } finally {
            setBusyId(null);
        }
    };

    const counts = {
        all: staff.length,
        manager: staff.filter((s) => s.staffRole === "manager").length,
        cook: staff.filter((s) => s.staffRole === "cook").length,
        server: staff.filter((s) => s.staffRole === "server").length,
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Staff</h2>
                    <p className="text-sm text-muted-foreground">
                        {loading ? "Loading…" : `${staff.length} member${staff.length !== 1 ? "s" : ""} · ${staff.filter((s) => s.isBlocked).length} blocked`}
                    </p>
                </div>
                <Button id="btn-add-staff" onClick={() => { setEditing(null); setFormOpen(true); }}
                    className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add Staff
                </Button>
            </div>

            {/* Role filter tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-muted p-1 w-fit">
                {([["all", "All"], ["manager", "Managers"], ["cook", "Cooks"], ["server", "Servers"]] as const).map(([role, label]) => (
                    <button key={role} type="button" onClick={() => setFilterRole(role)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${filterRole === role ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                        {label}
                        <span className={`ml-1.5 text-xs ${filterRole === role ? "text-orange-500" : "text-muted-foreground"}`}>
                            {counts[role]}
                        </span>
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="space-y-2">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 rounded-xl border border-border p-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-36" />
                                <Skeleton className="h-3 w-48" />
                            </div>
                            <Skeleton className="h-8 w-14" />
                            <Skeleton className="h-8 w-14" />
                            <Skeleton className="h-8 w-16" />
                        </div>
                    ))
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
                        <div className="mb-3 text-4xl">👥</div>
                        <p className="font-medium text-foreground">No staff yet</p>
                        <p className="mt-1 text-sm text-muted-foreground">Click "Add Staff" to add your first team member.</p>
                    </div>
                ) : (
                    <>
                        {pageItems.map((member) => (
                            <StaffRow key={member.id} staff={member}
                                onEdit={() => { setEditing(member); setFormOpen(true); }}
                                onBlock={() => handleBlock(member)}
                                onDelete={() => setDeleteTarget(member)}
                                busy={busyId === member.id} />
                        ))}
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            onChange={setPage}
                            total={filtered.length}
                            pageSize={PAGE_SIZE}
                        />
                    </>
                )}
            </div>

            <StaffFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} editing={editing} />
            <DeleteDialog staff={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} deleting={busyId === deleteTarget?.id} />
        </div>
    );
}

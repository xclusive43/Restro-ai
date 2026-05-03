"use client";

/**
 * MenuItemManager — Admin CRUD for menu items
 *
 * Full create / edit / delete with image upload, category picker,
 * availability toggle, price, GST.
 *
 * Usage (in /admin/menu page):
 *   <MenuItemManager />
 */

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";

import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ImageUpload from "@/components/shared/ImageUpload";
import Pagination, { usePagination } from "@/components/shared/Pagination";

import {
    listenToCollection, addDocument, updateDocument, deleteDocument, Collections,
} from "@/lib/firebase/firestore";
import { type MenuItemDoc, type CategoryDoc } from "@/types/index";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MenuItemWithId = MenuItemDoc & { id: string };
type CategoryWithId = CategoryDoc & { id: string };

interface ItemFormData {
    name: string;
    description: string;
    price: string;
    gst: string;
    categoryId: string;
    image: string;
    isAvailable: boolean;
}

const EMPTY_FORM: ItemFormData = {
    name: "", description: "", price: "", gst: "5",
    categoryId: "", image: "", isAvailable: true,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(n: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

// ---------------------------------------------------------------------------
// Menu item row
// ---------------------------------------------------------------------------

function ItemRow({ item, categoryName, onEdit, onDelete, deleting }: {
    item: MenuItemWithId;
    categoryName: string;
    onEdit: (i: MenuItemWithId) => void;
    onDelete: (i: MenuItemWithId) => void;
    deleting: boolean;
}) {
    const total = item.price + (item.price * item.gst) / 100;

    return (
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:shadow-sm">
            {/* Image */}
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.image
                    ? <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                    : <div className="flex h-full w-full items-center justify-center text-xl">🍽️</div>
                }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-foreground">{item.name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-sm font-semibold text-foreground">{formatPrice(total)}</span>
                    {item.gst > 0 && (
                        <span className="text-xs text-muted-foreground">+{item.gst}% GST</span>
                    )}
                    {categoryName && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{categoryName}</span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${item.isAvailable ? "bg-green-500/10 text-green-600" : "bg-zinc-500/10 text-zinc-500"}`}>
                        {item.isAvailable ? "Available" : "Unavailable"}
                    </span>
                </div>
                {item.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{item.description}</p>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
                <Button id={`btn-edit-item-${item.id}`} variant="outline" size="sm"
                    onClick={() => onEdit(item)} className="h-8 px-3 text-xs">
                    Edit
                </Button>
                <Button id={`btn-delete-item-${item.id}`} variant="outline" size="sm"
                    onClick={() => onDelete(item)} disabled={deleting}
                    className="h-8 px-3 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                    {deleting ? "…" : "Delete"}
                </Button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Form dialog
// ---------------------------------------------------------------------------

function ItemFormDialog({ open, onClose, editing, categories }: {
    open: boolean;
    onClose: () => void;
    editing: MenuItemWithId | null;
    categories: CategoryWithId[];
}) {
    const [form, setForm] = useState<ItemFormData>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (editing) {
            setForm({
                name: editing.name,
                description: editing.description ?? "",
                price: String(editing.price),
                gst: String(editing.gst),
                categoryId: editing.categoryId,
                image: editing.image ?? "",
                isAvailable: editing.isAvailable,
            });
        } else {
            setForm(EMPTY_FORM);
        }
    }, [editing, open]);

    const set = (key: keyof ItemFormData, value: string | boolean) =>
        setForm((p) => ({ ...p, [key]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.price) return;
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                description: form.description.trim(),
                price: parseFloat(form.price),
                gst: parseFloat(form.gst) || 0,
                categoryId: form.categoryId,
                image: form.image,
                isAvailable: form.isAvailable,
            };
            if (editing) {
                await updateDocument<MenuItemDoc>(Collections.MENU_ITEMS, editing.id, payload);
                toast.success(`"${form.name}" updated`);
            } else {
                await addDocument<MenuItemDoc>(Collections.MENU_ITEMS, { ...payload, createdAt: null as never });
                toast.success(`"${form.name}" added to menu`);
            }
            onClose();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save. Check permissions.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editing ? "Edit Menu Item" : "New Menu Item"}</DialogTitle>
                    <DialogDescription>
                        {editing ? "Update the item details, price, or availability." : "Add a new item to your restaurant menu."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    {/* Image */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Image</label>
                        <ImageUpload folder="menu" value={form.image || undefined}
                            onUpload={(url) => set("image", url)}
                            onRemove={() => set("image", "")}
                            disabled={saving} label="Upload menu item image" />
                    </div>

                    {/* Name */}
                    <div className="space-y-1.5">
                        <label htmlFor="item-name" className="text-sm font-medium text-foreground">
                            Name <span className="text-destructive">*</span>
                        </label>
                        <Input id="item-name" placeholder="e.g. Paneer Tikka" value={form.name}
                            onChange={(e) => set("name", e.target.value)} disabled={saving} required />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <label htmlFor="item-desc" className="text-sm font-medium text-foreground">Description</label>
                        <textarea
                            id="item-desc"
                            placeholder="Short description…"
                            value={form.description}
                            onChange={(e) => set("description", e.target.value)}
                            disabled={saving}
                            rows={2}
                            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                        />
                    </div>

                    {/* Price + GST */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label htmlFor="item-price" className="text-sm font-medium text-foreground">
                                Price (₹) <span className="text-destructive">*</span>
                            </label>
                            <Input id="item-price" type="number" min="0" step="0.01"
                                placeholder="0.00" value={form.price}
                                onChange={(e) => set("price", e.target.value)} disabled={saving} required />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="item-gst" className="text-sm font-medium text-foreground">GST %</label>
                            <Input id="item-gst" type="number" min="0" max="100" step="0.5"
                                placeholder="5" value={form.gst}
                                onChange={(e) => set("gst", e.target.value)} disabled={saving} />
                        </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                        <label htmlFor="item-category" className="text-sm font-medium text-foreground">Category</label>
                        <select
                            id="item-category"
                            value={form.categoryId}
                            onChange={(e) => set("categoryId", e.target.value)}
                            disabled={saving}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                        >
                            <option value="">— Select category —</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Available toggle */}
                    <div className="flex items-center gap-3">
                        <button type="button" role="switch" aria-checked={form.isAvailable}
                            onClick={() => set("isAvailable", !form.isAvailable)} disabled={saving}
                            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${form.isAvailable ? "bg-orange-500" : "bg-muted"}`}>
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${form.isAvailable ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                        <span className="text-sm text-foreground cursor-pointer select-none" onClick={() => set("isAvailable", !form.isAvailable)}>
                            {form.isAvailable ? "Available on menu" : "Unavailable (hidden from customers)"}
                        </span>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                        <Button id="btn-save-item" type="submit"
                            disabled={saving || !form.name.trim() || !form.price}
                            className="bg-orange-500 hover:bg-orange-600 text-white">
                            {saving ? "Saving…" : editing ? "Save changes" : "Add to menu"}
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

function DeleteDialog({ item, onClose, onConfirm, deleting }: {
    item: MenuItemWithId | null;
    onClose: () => void;
    onConfirm: () => void;
    deleting: boolean;
}) {
    return (
        <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Delete menu item?</DialogTitle>
                    <DialogDescription>This action cannot be undone.</DialogDescription>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    Delete <span className="font-medium text-foreground">"{item?.name}"</span>? This cannot be undone.
                </p>
                <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={onClose} disabled={deleting}>Cancel</Button>
                    <Button id="btn-confirm-delete-item" variant="destructive" onClick={onConfirm} disabled={deleting}>
                        {deleting ? "Deleting…" : "Yes, delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// MenuItemManager (main export)
// ---------------------------------------------------------------------------

export default function MenuItemManager() {
    const [items, setItems] = useState<MenuItemWithId[]>([]);
    const [categories, setCategories] = useState<CategoryWithId[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCat, setFilterCat] = useState<string>("all");

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<MenuItemWithId | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<MenuItemWithId | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const u1 = listenToCollection<MenuItemDoc>(Collections.MENU_ITEMS, (docs) => {
            setItems(docs as MenuItemWithId[]);
            setLoading(false);
        });
        const u2 = listenToCollection<CategoryDoc>(Collections.CATEGORIES, (docs) => {
            setCategories(docs as CategoryWithId[]);
        });
        return () => { u1(); u2(); };
    }, []);

    const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

    const filtered = useMemo(() =>
        filterCat === "all" ? items : items.filter((i) => i.categoryId === filterCat),
        [items, filterCat]
    );

    const PAGE_SIZE = 10;
    const { page, setPage, pageItems, totalPages } = usePagination(filtered, PAGE_SIZE);

    // Reset page when filter changes
    useMemo(() => { setPage(1); }, [filterCat]);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await deleteDocument(Collections.MENU_ITEMS, deleteTarget.id);
            toast.success(`"${deleteTarget.name}" deleted`);
            setDeleteTarget(null);
        } catch {
            toast.error("Failed to delete. Check permissions.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Menu Items</h2>
                    <p className="text-sm text-muted-foreground">
                        {loading ? "Loading…" : `${filtered.length} of ${items.length} items`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Category filter */}
                    <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <option value="all">All categories</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <Button id="btn-add-menu-item" onClick={() => { setEditing(null); setFormOpen(true); }}
                        className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Item
                    </Button>
                </div>
            </div>

            {/* List */}
            <div className="space-y-2">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 rounded-xl border border-border p-3">
                            <Skeleton className="h-14 w-14 rounded-lg" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                            <Skeleton className="h-8 w-16" /><Skeleton className="h-8 w-16" />
                        </div>
                    ))
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
                        <div className="mb-3 text-3xl">🍽️</div>
                        <p className="font-medium text-foreground">No items yet</p>
                        <p className="mt-1 text-sm text-muted-foreground">Click "Add Item" to add your first menu item.</p>
                    </div>
                ) : (
                    <>
                        {pageItems.map((item) => (
                            <ItemRow key={item.id} item={item} categoryName={catMap[item.categoryId] ?? ""}
                                onEdit={(i) => { setEditing(i); setFormOpen(true); }}
                                onDelete={setDeleteTarget}
                                deleting={deleting && deleteTarget?.id === item.id} />
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

            <ItemFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }}
                editing={editing} categories={categories} />
            <DeleteDialog item={deleteTarget} onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete} deleting={deleting} />
        </div>
    );
}

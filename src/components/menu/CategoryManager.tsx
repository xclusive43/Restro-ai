"use client";

/**
 * CategoryManager — Admin CRUD for categories
 *
 * Full create / edit / delete with image URL support.
 * Uses Firestore helpers and shadcn Dialog.
 *
 * Usage (in /admin/categories page):
 *   <CategoryManager />
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ImageUpload from "@/components/shared/ImageUpload";
import Pagination, { usePagination } from "@/components/shared/Pagination";

import {
    listenToCollection,
    addDocument,
    updateDocument,
    deleteDocument,
    Collections,
} from "@/lib/firebase/firestore";
import { type CategoryDoc } from "@/types/index";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CategoryWithId = CategoryDoc & { id: string };

interface CategoryFormData {
    name: string;
    image: string;
    isActive: boolean;
}

const EMPTY_FORM: CategoryFormData = { name: "", image: "", isActive: true };

// ---------------------------------------------------------------------------
// Category row
// ---------------------------------------------------------------------------

interface CategoryRowProps {
    category: CategoryWithId;
    onEdit: (cat: CategoryWithId) => void;
    onDelete: (cat: CategoryWithId) => void;
    deleting: boolean;
}

function CategoryRow({ category, onEdit, onDelete, deleting }: CategoryRowProps) {
    return (
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:border-border/80 hover:shadow-sm">
            {/* Image preview */}
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                {category.image ? (
                    <Image
                        src={category.image}
                        alt={category.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl">🍴</div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-foreground">{category.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            category.isActive
                                ? "bg-green-500/10 text-green-600"
                                : "bg-zinc-500/10 text-zinc-500"
                        }`}
                    >
                        {category.isActive ? "Active" : "Inactive"}
                    </span>
                    {category.image && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                            {category.image}
                        </span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
                <Button
                    id={`btn-edit-category-${category.id}`}
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(category)}
                    className="h-8 px-3 text-xs"
                >
                    Edit
                </Button>
                <Button
                    id={`btn-delete-category-${category.id}`}
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(category)}
                    disabled={deleting}
                    className="h-8 px-3 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                >
                    {deleting ? "…" : "Delete"}
                </Button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Category form dialog
// ---------------------------------------------------------------------------

interface CategoryFormDialogProps {
    open: boolean;
    onClose: () => void;
    editing: CategoryWithId | null;   // null = create mode
}

function CategoryFormDialog({ open, onClose, editing }: CategoryFormDialogProps) {
    const [form, setForm] = useState<CategoryFormData>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    // Populate form when editing
    useEffect(() => {
        if (editing) {
            setForm({ name: editing.name, image: editing.image ?? "", isActive: editing.isActive });
        } else {
            setForm(EMPTY_FORM);
        }
    }, [editing, open]);

    const handleChange = (key: keyof CategoryFormData, value: string | boolean) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;

        setSaving(true);
        try {
            if (editing) {
                await updateDocument<CategoryDoc>(Collections.CATEGORIES, editing.id, {
                    name: form.name.trim(),
                    image: form.image.trim(),
                    isActive: form.isActive,
                });
                toast.success(`"${form.name}" updated`);
            } else {
                await addDocument<CategoryDoc>(Collections.CATEGORIES, {
                    name: form.name.trim(),
                    image: form.image.trim(),
                    isActive: form.isActive,
                    createdAt: null as never,   // serverTimestamp injected by addDocument
                });
                toast.success(`"${form.name}" created`);
            }
            onClose();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save category. Check permissions.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle>
                    <DialogDescription>
                        {editing ? "Update the category details below." : "Add a new category to organise your menu items."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    {/* Name */}
                    <div className="space-y-1.5">
                        <label htmlFor="cat-name" className="text-sm font-medium text-foreground">
                            Name <span className="text-destructive">*</span>
                        </label>
                        <Input
                            id="cat-name"
                            placeholder="e.g. Burgers"
                            value={form.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            disabled={saving}
                            required
                            autoFocus
                        />
                    </div>

                    {/* Image upload */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Image</label>
                        <ImageUpload
                            folder="categories"
                            value={form.image || undefined}
                            onUpload={(url) => handleChange("image", url)}
                            onRemove={() => handleChange("image", "")}
                            disabled={saving}
                            label="Upload category image"
                        />
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center gap-3">
                        <button
                            id="cat-active-toggle"
                            type="button"
                            role="switch"
                            aria-checked={form.isActive}
                            onClick={() => handleChange("isActive", !form.isActive)}
                            disabled={saving}
                            className={[
                                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                                form.isActive ? "bg-orange-500" : "bg-muted",
                            ].join(" ")}
                        >
                            <span
                                className={[
                                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200",
                                    form.isActive ? "translate-x-5" : "translate-x-0",
                                ].join(" ")}
                            />
                        </button>
                        <label
                            htmlFor="cat-active-toggle"
                            className="text-sm text-foreground select-none cursor-pointer"
                            onClick={() => handleChange("isActive", !form.isActive)}
                        >
                            {form.isActive ? "Active (visible on menu)" : "Inactive (hidden from menu)"}
                        </label>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            id="btn-save-category"
                            type="submit"
                            disabled={saving || !form.name.trim()}
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            {saving ? "Saving…" : editing ? "Save changes" : "Create category"}
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

interface DeleteDialogProps {
    category: CategoryWithId | null;
    onClose: () => void;
    onConfirm: () => void;
    deleting: boolean;
}

function DeleteDialog({ category, onClose, onConfirm, deleting }: DeleteDialogProps) {
    return (
        <Dialog open={!!category} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Delete category?</DialogTitle>
                    <DialogDescription>
                        Menu items linked to this category will lose their category reference.
                    </DialogDescription>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete{" "}
                    <span className="font-medium text-foreground">"{category?.name}"</span>?
                    This cannot be undone. Menu items using this category will lose their reference.
                </p>
                <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={onClose} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button
                        id="btn-confirm-delete-category"
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={deleting}
                    >
                        {deleting ? "Deleting…" : "Yes, delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// CategoryManager (main export)
// ---------------------------------------------------------------------------

export default function CategoryManager() {
    const [categories, setCategories] = useState<CategoryWithId[]>([]);
    const [loading, setLoading] = useState(true);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<CategoryWithId | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<CategoryWithId | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Real-time listener
    useEffect(() => {
        const unsub = listenToCollection<CategoryDoc>(Collections.CATEGORIES, (docs) => {
            setCategories(docs as CategoryWithId[]);
            setLoading(false);
        });
        return unsub;
    }, []);

    const PAGE_SIZE = 10;
    const { page, setPage, pageItems, totalPages } = usePagination(categories, PAGE_SIZE);

    const handleEdit = (cat: CategoryWithId) => {
        setEditing(cat);
        setFormOpen(true);
    };

    const handleCreate = () => {
        setEditing(null);
        setFormOpen(true);
    };

    const handleFormClose = () => {
        setFormOpen(false);
        setEditing(null);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await deleteDocument(Collections.CATEGORIES, deleteTarget.id);
            toast.success(`"${deleteTarget.name}" deleted`);
            setDeleteTarget(null);
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete. Check permissions.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Categories</h2>
                    <p className="text-sm text-muted-foreground">
                        {loading ? "Loading…" : `${categories.length} categor${categories.length === 1 ? "y" : "ies"}`}
                    </p>
                </div>
                <Button
                    id="btn-add-category"
                    onClick={handleCreate}
                    className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add Category
                </Button>
            </div>

            {/* List */}
            <div className="space-y-2">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 rounded-xl border border-border p-3">
                            <Skeleton className="h-12 w-12 rounded-lg" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                            <Skeleton className="h-8 w-16 rounded-md" />
                            <Skeleton className="h-8 w-16 rounded-md" />
                        </div>
                    ))
                ) : categories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">
                            🍴
                        </div>
                        <p className="text-sm font-medium text-foreground">No categories yet</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Click "Add Category" to create your first one.
                        </p>
                    </div>
                ) : (
                    <>
                        {pageItems.map((cat) => (
                            <CategoryRow
                                key={cat.id}
                                category={cat}
                                onEdit={handleEdit}
                                onDelete={setDeleteTarget}
                                deleting={deleting && deleteTarget?.id === cat.id}
                            />
                        ))}
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            onChange={setPage}
                            total={categories.length}
                            pageSize={PAGE_SIZE}
                        />
                    </>
                )}
            </div>

            {/* Form dialog (create + edit) */}
            <CategoryFormDialog
                open={formOpen}
                onClose={handleFormClose}
                editing={editing}
            />

            {/* Delete confirm dialog */}
            <DeleteDialog
                category={deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                deleting={deleting}
            />
        </div>
    );
}

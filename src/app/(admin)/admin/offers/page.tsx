"use client";

/**
 * Admin — Offer Banners Management
 *
 * Create, edit, toggle, reorder, and delete promotional offer banners
 * that appear as a slider on the customer-facing menu page.
 * Supports optional background image upload via Firebase Storage.
 */

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { orderBy } from "firebase/firestore";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  listenToCollection, addDocument, updateDocument, deleteDocument, Collections,
} from "@/lib/firebase/firestore";
import { uploadImage, deleteFile } from "@/lib/firebase/storage";
import { type OfferDoc } from "@/types/index";
import Pagination, { usePagination } from "@/components/shared/Pagination";

type OfferWithId = OfferDoc & { id: string };

// ---------------------------------------------------------------------------
// Colour gradient options
// ---------------------------------------------------------------------------

const GRADIENT_OPTIONS = [
  { label: "🔥 Orange → Red",      from: "orange-red",    preview: "from-orange-500 to-red-500" },
  { label: "💜 Purple → Pink",     from: "purple-pink",   preview: "from-purple-600 to-pink-500" },
  { label: "🌊 Blue → Cyan",       from: "blue-cyan",     preview: "from-blue-600 to-cyan-400" },
  { label: "🌿 Green → Teal",      from: "green-teal",    preview: "from-green-500 to-teal-400" },
  { label: "⚡ Yellow → Orange",   from: "yellow-orange", preview: "from-yellow-400 to-orange-500" },
  { label: "🌹 Rose → Purple",     from: "rose-purple",   preview: "from-rose-500 to-purple-600" },
  { label: "🔷 Sky → Indigo",      from: "sky-indigo",    preview: "from-sky-500 to-indigo-600" },
] as const;

type GradientKey = typeof GRADIENT_OPTIONS[number]["from"];

function getTo(from: GradientKey): string {
  const map: Record<GradientKey, string> = {
    "orange-red":    "red-500",
    "purple-pink":   "pink-500",
    "blue-cyan":     "cyan-400",
    "green-teal":    "teal-400",
    "yellow-orange": "orange-500",
    "rose-purple":   "purple-600",
    "sky-indigo":    "indigo-600",
  };
  return map[from];
}

// ---------------------------------------------------------------------------
// Form shape
// ---------------------------------------------------------------------------

interface FormData {
  title: string;
  description: string;
  badge: string;
  emoji: string;
  gradient: GradientKey;
  order: number;
  imageUrl: string;         // existing stored URL
  imageFile: File | null;   // new file to upload
  imagePreview: string;     // local blob preview
}

const EMPTY: FormData = {
  title: "",
  description: "",
  badge: "",
  emoji: "🎉",
  gradient: "orange-red",
  order: 1,
  imageUrl: "",
  imageFile: null,
  imagePreview: "",
};

// ---------------------------------------------------------------------------
// Image uploader sub-component
// ---------------------------------------------------------------------------

function ImageUploader({
  preview,
  currentUrl,
  onFile,
  onClear,
  uploading,
  uploadPct,
}: {
  preview: string;
  currentUrl: string;
  onFile: (f: File) => void;
  onClear: () => void;
  uploading: boolean;
  uploadPct: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displaySrc = preview || currentUrl;

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        Banner Image{" "}
        <span className="text-muted-foreground font-normal">(optional — overrides gradient bg)</span>
      </label>

      {displaySrc ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-muted" style={{ height: 120 }}>
          <img
            src={displaySrc}
            alt="Banner preview"
            className="w-full h-full object-cover"
          />
          {/* Dark overlay with text */}
          <div className="absolute inset-0 bg-black/30 flex items-end p-2 gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex-1 rounded-lg bg-white/20 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 transition-colors"
            >
              Change Image
            </button>
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg bg-red-500/70 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500/90 transition-colors"
            >
              Remove
            </button>
          </div>

          {/* Upload progress overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
              <div className="w-3/4 h-1.5 rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-200"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
              <p className="text-xs text-white font-medium">Uploading {uploadPct}%</p>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-border hover:border-orange-400 hover:bg-orange-500/5 transition-all p-6 flex flex-col items-center gap-2 text-muted-foreground"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span className="text-sm font-medium">Click to upload image</span>
          <span className="text-xs">PNG, JPG, WEBP up to 5 MB</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Offer card (list view)
// ---------------------------------------------------------------------------

function OfferCard({
  offer,
  onEdit,
  onToggle,
  onDelete,
  busy,
}: {
  offer: OfferWithId;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const grad = GRADIENT_OPTIONS.find((g) => g.from === offer.bgFrom);

  return (
    <div
      className={[
        "relative flex items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:shadow-sm",
        offer.isActive ? "border-border" : "border-zinc-200 opacity-60 dark:border-zinc-700",
      ].join(" ")}
    >
      {/* Thumbnail */}
      <div
        className={`h-14 w-20 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br ${grad?.preview ?? "from-orange-500 to-red-500"} flex items-center justify-center text-2xl shadow`}
      >
        {offer.imageUrl ? (
          <img src={offer.imageUrl} alt={offer.title} className="w-full h-full object-cover" />
        ) : (
          offer.emoji || "🎉"
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-foreground truncate">{offer.title}</p>
          {offer.badge && (
            <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-600 uppercase tracking-wider">
              {offer.badge}
            </span>
          )}
          {offer.imageUrl && (
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600">
              📷 Image
            </span>
          )}
          {!offer.isActive && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800">
              Hidden
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{offer.description}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/60">Order: {offer.order} · {grad?.label}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={onEdit} disabled={busy} className="h-8 px-3 text-xs">Edit</Button>
        <Button
          variant="outline" size="sm" onClick={onToggle} disabled={busy}
          className={`h-8 px-3 text-xs ${offer.isActive ? "text-amber-600 border-amber-400/30" : "text-green-600 border-green-400/30"}`}
        >
          {busy ? "…" : offer.isActive ? "Hide" : "Show"}
        </Button>
        <Button
          variant="outline" size="sm" onClick={onDelete} disabled={busy}
          className="h-8 px-3 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form dialog
// ---------------------------------------------------------------------------

function OfferDialog({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: OfferWithId | null;
}) {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  useEffect(() => {
    if (editing) {
      setForm({
        title: editing.title,
        description: editing.description,
        badge: editing.badge ?? "",
        emoji: editing.emoji ?? "🎉",
        gradient: editing.bgFrom as GradientKey,
        order: editing.order,
        imageUrl: editing.imageUrl ?? "",
        imageFile: null,
        imagePreview: "",
      });
    } else {
      setForm(EMPTY);
    }
    setUploading(false);
    setUploadPct(0);
  }, [editing, open]);

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleFile = (file: File) => {
    const preview = URL.createObjectURL(file);
    setForm((p) => ({ ...p, imageFile: file, imagePreview: preview }));
  };

  const handleClearImage = () => {
    setForm((p) => ({ ...p, imageFile: null, imagePreview: "", imageUrl: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);

    try {
      let finalImageUrl = form.imageUrl;

      // Upload new image if selected
      if (form.imageFile) {
        setUploading(true);
        setUploadPct(0);
        finalImageUrl = await uploadImage(form.imageFile, {
          folder: "offers",
          onProgress: setUploadPct,
        });
        setUploading(false);

        // Delete old image if replacing
        if (editing?.imageUrl && editing.imageUrl !== finalImageUrl) {
          try { await deleteFile(editing.imageUrl); } catch { /* ignore */ }
        }
      }

      // If image was cleared (no new file, no url), delete old from storage
      if (!finalImageUrl && !form.imageFile && editing?.imageUrl) {
        try { await deleteFile(editing.imageUrl); } catch { /* ignore */ }
      }

      const payload: Omit<OfferDoc, "createdAt"> = {
        title: form.title.trim(),
        description: form.description.trim(),
        badge: form.badge.trim() || undefined,
        emoji: form.emoji.trim() || "🎉",
        bgFrom: form.gradient,
        bgTo: getTo(form.gradient),
        imageUrl: finalImageUrl || undefined,
        isActive: editing?.isActive ?? true,
        order: Number(form.order) || 1,
      };

      if (editing) {
        await updateDocument<OfferDoc>(Collections.OFFERS, editing.id, payload as Partial<OfferDoc>);
        toast.success("Offer updated!");
      } else {
        await addDocument<OfferDoc>(Collections.OFFERS, payload as OfferDoc);
        toast.success("Offer created!");
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save offer.");
      setUploading(false);
    } finally {
      setSaving(false);
    }
  };

  const selectedGrad = GRADIENT_OPTIONS.find((g) => g.from === form.gradient);
  const previewImage = form.imagePreview || form.imageUrl;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Offer Banner" : "New Offer Banner"}</DialogTitle>
          <DialogDescription>
            This banner appears in the auto-scrolling slider on the customer menu page.
          </DialogDescription>
        </DialogHeader>

        {/* Live Preview */}
        <div
          className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${selectedGrad?.preview ?? "from-orange-500 to-red-500"}`}
          style={{ minHeight: 110 }}
        >
          {previewImage && (
            <img
              src={previewImage}
              alt="Banner"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {/* Dark overlay when image present */}
          {previewImage && <div className="absolute inset-0 bg-black/40" />}

          {/* Decorative circles */}
          {!previewImage && (
            <>
              <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-white/10" />
              <div className="absolute -bottom-6 -left-4 h-24 w-24 rounded-full bg-white/10" />
            </>
          )}

          <div className="relative z-10 p-4 flex items-center gap-3 min-h-[110px]">
            {!previewImage && <span className="text-4xl">{form.emoji || "🎉"}</span>}
            <div>
              {form.badge && (
                <span className="inline-block mb-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                  {form.badge}
                </span>
              )}
              <p className="font-extrabold text-white text-base leading-tight drop-shadow">
                {form.title || "Banner Title"}
              </p>
              <p className="text-white/80 text-xs mt-0.5 line-clamp-2 drop-shadow">
                {form.description || "Offer description…"}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="offer-title" className="text-sm font-medium text-foreground">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              id="offer-title"
              placeholder="e.g. 20% Off on Weekends!"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required disabled={saving} autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="offer-desc" className="text-sm font-medium text-foreground">
              Description <span className="text-destructive">*</span>
            </label>
            <Input
              id="offer-desc"
              placeholder="e.g. Valid every Sat & Sun, all day long"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              required disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Badge */}
            <div className="space-y-1.5">
              <label htmlFor="offer-badge" className="text-sm font-medium text-foreground">
                Badge <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                id="offer-badge"
                placeholder="e.g. HOT"
                value={form.badge}
                onChange={(e) => set("badge", e.target.value.toUpperCase())}
                disabled={saving} maxLength={10}
              />
            </div>

            {/* Emoji */}
            <div className="space-y-1.5">
              <label htmlFor="offer-emoji" className="text-sm font-medium text-foreground">
                Emoji <span className="text-muted-foreground font-normal">(no image)</span>
              </label>
              <Input
                id="offer-emoji"
                placeholder="🎉"
                value={form.emoji}
                onChange={(e) => set("emoji", e.target.value)}
                disabled={saving} maxLength={4}
              />
            </div>
          </div>

          {/* Image Uploader */}
          <ImageUploader
            preview={form.imagePreview}
            currentUrl={form.imageUrl}
            onFile={handleFile}
            onClear={handleClearImage}
            uploading={uploading}
            uploadPct={uploadPct}
          />

          {/* Gradient picker */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Background Colour{" "}
              <span className="text-muted-foreground font-normal">(visible when no image)</span>
            </label>
            <div className="grid grid-cols-7 gap-1.5">
              {GRADIENT_OPTIONS.map((g) => (
                <button
                  type="button"
                  key={g.from}
                  onClick={() => set("gradient", g.from as GradientKey)}
                  className={[
                    "h-8 rounded-lg bg-gradient-to-br transition-all",
                    g.preview,
                    form.gradient === g.from
                      ? "ring-2 ring-offset-2 ring-foreground scale-110"
                      : "opacity-70 hover:opacity-100 hover:scale-105",
                  ].join(" ")}
                  title={g.label}
                />
              ))}
            </div>
          </div>

          {/* Display order */}
          <div className="space-y-1.5">
            <label htmlFor="offer-order" className="text-sm font-medium text-foreground">Display Order</label>
            <Input
              id="offer-order"
              type="number"
              min={1}
              value={form.order}
              onChange={(e) => set("order", Number(e.target.value))}
              disabled={saving}
              className="w-28"
            />
            <p className="text-xs text-muted-foreground">Lower number = appears first in slider</p>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving || uploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {uploading ? `Uploading ${uploadPct}%…` : saving ? "Saving…" : editing ? "Save Changes" : "Create Banner"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OffersPage() {
  const [offers, setOffers] = useState<OfferWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OfferWithId | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const PAGE_SIZE = 8;
  const { page, setPage, pageItems, totalPages } = usePagination(offers, PAGE_SIZE);

  useEffect(() => {
    const unsub = listenToCollection<OfferDoc>(
      Collections.OFFERS,
      (docs) => {
        const sorted = (docs as OfferWithId[]).sort((a, b) => a.order - b.order);
        setOffers(sorted);
        setLoading(false);
      },
      [orderBy("order", "asc")]
    );
    return () => unsub();
  }, []);

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (offer: OfferWithId) => { setEditing(offer); setDialogOpen(true); };

  const handleToggle = async (offer: OfferWithId) => {
    setBusy(offer.id);
    try {
      await updateDocument<OfferDoc>(Collections.OFFERS, offer.id, { isActive: !offer.isActive } as Partial<OfferDoc>);
      toast.success(offer.isActive ? "Offer hidden" : "Offer shown");
    } catch { toast.error("Failed to update."); }
    finally { setBusy(null); }
  };

  const handleDelete = async (offer: OfferWithId) => {
    if (!confirm(`Delete "${offer.title}"?`)) return;
    setBusy(offer.id);
    try {
      if (offer.imageUrl) {
        try { await deleteFile(offer.imageUrl); } catch { /* ignore */ }
      }
      await deleteDocument(Collections.OFFERS, offer.id);
      toast.success("Offer deleted.");
    } catch { toast.error("Failed to delete."); }
    finally { setBusy(null); }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Offer Banners</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage the promotional slider shown on the customer menu page
          </p>
        </div>
        <Button id="btn-add-offer" onClick={openAdd} className="gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Banner
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : offers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-16 text-center">
          <div className="text-5xl mb-4">🎁</div>
          <p className="font-semibold text-foreground">No offer banners yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Create your first promotional banner — it'll appear as a beautiful slider on the customer menu page.
          </p>
          <Button onClick={openAdd}>Create First Banner</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {pageItems.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onEdit={() => openEdit(offer)}
              onToggle={() => handleToggle(offer)}
              onDelete={() => handleDelete(offer)}
              busy={busy === offer.id}
            />
          ))}
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
            total={offers.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      )}

      <OfferDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        editing={editing}
      />
    </div>
  );
}

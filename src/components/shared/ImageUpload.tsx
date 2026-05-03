"use client";

/**
 * ImageUpload — Production-ready image upload component
 *
 * Features:
 *  - Drag & drop or click to browse
 *  - Client-side validation (type, max size)
 *  - Upload progress ring
 *  - Preview of existing or uploaded image
 *  - Remove / replace uploaded image (deletes from Storage)
 *  - Calls onUpload(url) when upload completes
 *  - Calls onRemove() when image is cleared
 *
 * Usage:
 *   <ImageUpload
 *     folder="categories"
 *     value={imageUrl}
 *     onUpload={(url) => setImageUrl(url)}
 *     onRemove={() => setImageUrl("")}
 *   />
 */

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";

import { uploadImage, deleteFile, type StorageFolder } from "@/lib/firebase/storage";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ImageUploadProps {
    /** Storage folder: "categories" | "menu" | "avatars" */
    folder: StorageFolder;
    /** Current image URL (controlled) */
    value?: string;
    /** Called with download URL after successful upload */
    onUpload: (url: string) => void;
    /** Called when image is removed */
    onRemove?: () => void;
    /** Disable all interactions */
    disabled?: boolean;
    /** Label shown in the drop zone */
    label?: string;
}

// ---------------------------------------------------------------------------
// Progress ring (SVG)
// ---------------------------------------------------------------------------

function ProgressRing({ percent }: { percent: number }) {
    const r = 28;
    const circ = 2 * Math.PI * r;
    const offset = circ - (percent / 100) * circ;

    return (
        <svg className="absolute inset-0 m-auto h-20 w-20 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
            {/* Track */}
            <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-orange-500/20" />
            {/* Fill */}
            <circle
                cx="32"
                cy="32"
                r={r}
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                className="text-orange-500 transition-all duration-150"
            />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// ImageUpload
// ---------------------------------------------------------------------------

export default function ImageUpload({
    folder,
    value,
    onUpload,
    onRemove,
    disabled = false,
    label = "Upload image",
}: ImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [removing, setRemoving] = useState(false);

    // ── Validation ──────────────────────────────────────────────────────────
    function validate(file: File): string | null {
        if (!ACCEPTED_TYPES.includes(file.type)) {
            return `Invalid type. Accepted: JPG, PNG, WebP, GIF.`;
        }
        if (file.size > MAX_SIZE_BYTES) {
            return `File too large. Max ${MAX_SIZE_MB} MB.`;
        }
        return null;
    }

    // ── Upload handler ───────────────────────────────────────────────────────
    const handleFile = useCallback(
        async (file: File) => {
            const err = validate(file);
            if (err) {
                toast.error(err);
                return;
            }

            setUploading(true);
            setProgress(0);

            try {
                const url = await uploadImage(file, {
                    folder,
                    onProgress: setProgress,
                });
                onUpload(url);
                toast.success("Image uploaded");
            } catch (e) {
                console.error(e);
                toast.error("Upload failed. Check storage rules.");
            } finally {
                setUploading(false);
                setProgress(0);
            }
        },
        [folder, onUpload]
    );

    // ── Remove handler ───────────────────────────────────────────────────────
    const handleRemove = async () => {
        if (!value || removing) return;
        setRemoving(true);
        try {
            // Try to delete from Storage (no-op if URL is external)
            if (value.includes("firebasestorage.googleapis.com")) {
                await deleteFile(value);
            }
            onRemove?.();
        } catch (e) {
            console.error(e);
            toast.error("Could not remove image.");
        } finally {
            setRemoving(false);
        }
    };

    // ── Drag handlers ────────────────────────────────────────────────────────
    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled && !uploading) setDragging(true);
    };
    const onDragLeave = () => setDragging(false);
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        if (disabled || uploading) return;
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        // Reset so same file can be re-selected
        e.target.value = "";
    };

    const isInteractive = !disabled && !uploading && !removing;

    // ── Render ────────────────────────────────────────────────────────────────

    // If image already exists — show preview + replace/remove buttons
    if (value) {
        return (
            <div className="space-y-2">
                <div className="relative h-40 w-full overflow-hidden rounded-xl border border-border bg-muted">
                    <Image
                        src={value}
                        alt="Uploaded image"
                        fill
                        sizes="(max-width: 768px) 100vw, 400px"
                        className="object-cover"
                    />
                    {/* Overlay actions */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all hover:bg-black/40 hover:opacity-100">
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            disabled={!isInteractive}
                            className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground shadow transition-colors hover:bg-white disabled:opacity-50"
                            aria-label="Replace image"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            Replace
                        </button>
                        <button
                            type="button"
                            onClick={handleRemove}
                            disabled={!isInteractive}
                            className="flex items-center gap-1.5 rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white shadow transition-colors hover:bg-red-600 disabled:opacity-50"
                            aria-label="Remove image"
                        >
                            {removing ? (
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                            )}
                            Remove
                        </button>
                    </div>
                </div>

                {/* Hidden input for replace */}
                <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED_TYPES.join(",")}
                    className="hidden"
                    onChange={onInputChange}
                    disabled={!isInteractive}
                    aria-label="Replace image"
                />
            </div>
        );
    }

    // No image — show drop zone
    return (
        <div className="space-y-1.5">
            <div
                role="button"
                tabIndex={isInteractive ? 0 : -1}
                aria-label={label}
                aria-disabled={!isInteractive}
                onClick={() => isInteractive && inputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && isInteractive && inputRef.current?.click()}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={[
                    "relative flex h-36 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all duration-200",
                    dragging
                        ? "border-orange-500 bg-orange-500/5 scale-[1.01]"
                        : uploading
                        ? "border-orange-500/50 bg-orange-500/5 cursor-wait"
                        : "border-border bg-muted/40 hover:border-orange-400/60 hover:bg-orange-500/5",
                    !isInteractive && "opacity-60 cursor-not-allowed",
                ].join(" ")}
            >
                {uploading ? (
                    /* Progress state */
                    <>
                        <ProgressRing percent={progress} />
                        <span className="relative z-10 mt-12 text-xs font-medium text-orange-500">
                            {progress}%
                        </span>
                    </>
                ) : (
                    /* Idle / drag state */
                    <>
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${dragging ? "bg-orange-500/20" : "bg-muted"}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${dragging ? "text-orange-500" : "text-muted-foreground"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="17 8 12 3 7 8"/>
                                <line x1="12" y1="3" x2="12" y2="15"/>
                            </svg>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-foreground">
                                {dragging ? "Drop to upload" : label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Drag & drop or click · JPG, PNG, WebP · max {MAX_SIZE_MB} MB
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Hidden file input */}
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                className="hidden"
                onChange={onInputChange}
                disabled={!isInteractive}
                aria-label={label}
            />
        </div>
    );
}

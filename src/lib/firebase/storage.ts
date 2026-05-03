/**
 * Firebase Storage helpers — Client Side
 *
 * Wraps the Firebase Storage SDK with typed, reusable upload utilities.
 *
 * Usage:
 *   import { uploadImage, deleteFile } from "@/lib/firebase/storage"
 */

import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    type UploadTaskSnapshot,
} from "firebase/storage";

import { storage } from "./client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StorageFolder = "categories" | "menu" | "avatars" | "offers";

export interface UploadOptions {
    /** Folder in Storage bucket (e.g. "categories", "menu") */
    folder: StorageFolder;
    /** Called repeatedly with 0–100 progress value */
    onProgress?: (percent: number) => void;
}

// ---------------------------------------------------------------------------
// Upload a single image file
// ---------------------------------------------------------------------------

/**
 * Upload a File to Firebase Storage and return its public download URL.
 * Generates a unique filename: `{folder}/{timestamp}-{sanitised-name}`.
 *
 * @example
 * const url = await uploadImage(file, { folder: "categories", onProgress: setProgress });
 */
export async function uploadImage(
    file: File,
    { folder, onProgress }: UploadOptions
): Promise<string> {
    const ext = file.name.split(".").pop() ?? "jpg";
    const safeName = file.name
        .replace(/\.[^.]+$/, "")                   // strip extension
        .replace(/[^a-z0-9]/gi, "-")               // replace special chars
        .toLowerCase()
        .slice(0, 40);

    const filename = `${folder}/${Date.now()}-${safeName}.${ext}`;
    const storageRef = ref(storage, filename);

    return new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file, {
            contentType: file.type,
        });

        task.on(
            "state_changed",
            (snapshot: UploadTaskSnapshot) => {
                const percent = Math.round(
                    (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                );
                onProgress?.(percent);
            },
            (error) => reject(error),
            async () => {
                try {
                    const url = await getDownloadURL(task.snapshot.ref);
                    resolve(url);
                } catch (err) {
                    reject(err);
                }
            }
        );
    });
}

// ---------------------------------------------------------------------------
// Delete a file by its download URL
// ---------------------------------------------------------------------------

/**
 * Delete a file from Storage using its full download URL.
 * Silently ignores "object not found" errors (safe to call on stale URLs).
 *
 * @example
 * await deleteFile("https://firebasestorage.googleapis.com/...")
 */
export async function deleteFile(downloadUrl: string): Promise<void> {
    try {
        const fileRef = ref(storage, downloadUrl);
        await deleteObject(fileRef);
    } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code === "storage/object-not-found") return; // already gone
        throw err;
    }
}

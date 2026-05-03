/**
 * Firestore helpers — Client Side
 *
 * Generic CRUD utilities + typed restaurant-domain helpers.
 * All functions use the client SDK and respect Firestore Security Rules.
 *
 * Usage:
 *   import { getDoc, setDoc, listenToCollection } from "@/lib/firebase/firestore"
 */

import {
    collection,
    doc,
    getDoc as _getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp,
    type DocumentData,
    type QueryConstraint,
    type DocumentSnapshot,
    type CollectionReference,
    type WithFieldValue,
    type UpdateData,
} from "firebase/firestore";

import { db } from "./client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A Firestore document with its id attached */
export type DocWithId<T> = T & { id: string };

/** Timestamps added automatically on create */
export interface FirestoreTimestamps {
    createdAt: Timestamp | null;
    updatedAt: Timestamp | null;
}

// ---------------------------------------------------------------------------
// Collection references (central registry — no magic strings in components)
// ---------------------------------------------------------------------------

export const Collections = {
    USERS: "users",
    MENU_ITEMS: "menu_items",
    CATEGORIES: "categories",
    ORDERS: "orders",
    TABLES: "tables",
    STAFF: "staff",
    SETTINGS: "settings",
    OFFERS: "offers",
} as const;

export type CollectionName = (typeof Collections)[keyof typeof Collections];

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

/** Get a typed collection reference */
export const colRef = <T = DocumentData>(
    path: CollectionName | string
): CollectionReference<T> =>
    collection(db, path) as CollectionReference<T>;

/**
 * Fetch a single document by ID.
 * Returns null if the document does not exist.
 */
export const getDocById = async <T = DocumentData>(
    collectionPath: CollectionName | string,
    id: string
): Promise<DocWithId<T> | null> => {
    const snap: DocumentSnapshot = await _getDoc(doc(db, collectionPath, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as T) };
};

/**
 * Fetch all documents in a collection (with optional query constraints).
 *
 * @example
 * const items = await getCollection<MenuItem>("menuItems", [
 *   where("available", "==", true),
 *   orderBy("name"),
 * ]);
 */
export const getCollection = async <T = DocumentData>(
    collectionPath: CollectionName | string,
    constraints: QueryConstraint[] = []
): Promise<DocWithId<T>[]> => {
    const q = query(collection(db, collectionPath), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
};

/**
 * Create a new document with a Firestore auto-generated ID.
 * Automatically adds `createdAt` and `updatedAt` timestamps.
 * Returns the new document ID.
 */
export const addDocument = async <T extends DocumentData>(
    collectionPath: CollectionName | string,
    data: WithFieldValue<T>
): Promise<string> => {
    const ref = await addDoc(collection(db, collectionPath), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return ref.id;
};

/**
 * Create or overwrite a document with a known ID.
 * Automatically adds `createdAt` and `updatedAt` timestamps.
 */
export const setDocument = async <T extends DocumentData>(
    collectionPath: CollectionName | string,
    id: string,
    data: WithFieldValue<T>,
    merge = true
): Promise<void> => {
    await setDoc(
        doc(db, collectionPath, id),
        {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        },
        { merge }
    );
};

/**
 * Partially update a document (merges only the provided fields).
 * Automatically updates the `updatedAt` timestamp.
 */
export const updateDocument = async <T extends DocumentData>(
    collectionPath: CollectionName | string,
    id: string,
    data: UpdateData<T>
): Promise<void> => {
    await updateDoc(doc(db, collectionPath, id), {
        ...data,
        updatedAt: serverTimestamp(),
    });
};

/** Delete a document by ID */
export const deleteDocument = async (
    collectionPath: CollectionName | string,
    id: string
): Promise<void> => {
    await deleteDoc(doc(db, collectionPath, id));
};

// ---------------------------------------------------------------------------
// Real-time listeners
// ---------------------------------------------------------------------------

/**
 * Subscribe to a single document.
 * Returns an unsubscribe function — call it in useEffect cleanup.
 *
 * @example
 * useEffect(() => {
 *   return listenToDoc<Order>("orders", orderId, setOrder);
 * }, [orderId]);
 */
export const listenToDoc = <T = DocumentData>(
    collectionPath: CollectionName | string,
    id: string,
    callback: (data: DocWithId<T> | null) => void
): (() => void) => {
    return onSnapshot(doc(db, collectionPath, id), (snap) => {
        if (!snap.exists()) return callback(null);
        callback({ id: snap.id, ...(snap.data() as T) });
    });
};

/**
 * Subscribe to a collection (with optional query constraints).
 * Returns an unsubscribe function — call it in useEffect cleanup.
 *
 * @example
 * useEffect(() => {
 *   return listenToCollection<Order>("orders", setOrders, [
 *     where("status", "==", "pending"),
 *     orderBy("createdAt", "desc"),
 *   ]);
 * }, []);
 */
export const listenToCollection = <T = DocumentData>(
    collectionPath: CollectionName | string,
    callback: (data: DocWithId<T>[]) => void,
    constraints: QueryConstraint[] = []
): (() => void) => {
    const q = query(collection(db, collectionPath), ...constraints);
    return onSnapshot(q, (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
        callback(docs);
    });
};

// ---------------------------------------------------------------------------
// User document helpers
// ---------------------------------------------------------------------------

/** Shape stored in the "users" collection */
export interface UserData {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: "admin" | "staff" | "customer" | "guest";
    createdAt?: ReturnType<typeof serverTimestamp>;
    updatedAt?: ReturnType<typeof serverTimestamp>;
}

/**
 * Create or overwrite a user document in the "users" collection.
 * Typically called right after sign-up / first Google login.
 *
 * @example
 * await createUserDoc(user.uid, { email: user.email, role: "customer" })
 */
export const createUserDoc = async (
    uid: string,
    data: Partial<UserData>
): Promise<void> => {
    await setDoc(
        doc(db, Collections.USERS, uid),
        {
            uid,
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        },
        { merge: true }          // safe to call on subsequent logins
    );
};

/**
 * Read the user's role directly from their Firestore document.
 *
 * ℹ️  Prefer `getUserRole()` from `auth.ts` for client-side checks
 *     (reads from the JWT — no extra network call).
 *     Use this when you need the authoritative Firestore value,
 *     e.g. in Server Actions or admin screens.
 *
 * Returns null if the document does not exist.
 */
export const getUserRole = async (
    uid: string
): Promise<UserData["role"] | null> => {
    const snap = await _getDoc(doc(db, Collections.USERS, uid));
    return snap.exists() ? (snap.data() as UserData).role : null;
};

// ---------------------------------------------------------------------------
// Re-export query helpers so callers don't need to import from firebase/firestore
// ---------------------------------------------------------------------------
export { where, orderBy, limit, serverTimestamp, Timestamp };


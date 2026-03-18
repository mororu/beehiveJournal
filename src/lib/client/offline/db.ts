// src/lib/client/offline/db.ts
//
// IndexedDB outbox for offline inspection entries.
// Story 7.4 AC1: database name 'beehiveJournal-offline', store name 'outbox',
// keyPath: 'clientId'.

const DB_NAME = 'beehiveJournal-offline';
const DB_VERSION = 1;
const STORE_NAME = 'outbox';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SyncStatus = 'pending' | 'syncing' | 'error';

/** Shape of a pending offline inspection entry in the outbox. */
export interface OutboxEntry {
	clientId: string; // UUID v4 — keyPath and dedup key
	hiveId: number;
	inspectedAt: number; // Unix epoch seconds
	healthScore: number;
	queenStatus: string;
	behaviourNotes: string | null;
	nextInspectNote: string | null;
	weatherTemp: number | null;
	weatherDesc: string | null;
	weatherWindSpeed: number | null;
	weatherCode: number | null;
	weatherLat: number | null;
	weatherLon: number | null;
	weatherUnavailable: boolean;
	syncStatus: SyncStatus;
	createdAt: number; // Unix epoch seconds — when the entry was saved offline
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);

		req.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'clientId' });
			}
		};

		req.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
		req.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
	});
}

/** Add a new entry to the outbox. Idempotent — duplicate clientIds are ignored. */
export async function addToOutbox(entry: OutboxEntry): Promise<void> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		const store = tx.objectStore(STORE_NAME);
		const req = store.put(entry); // put = upsert; add would throw on duplicate
		req.onsuccess = () => resolve();
		req.onerror = (e) => reject((e.target as IDBRequest).error);
		tx.oncomplete = () => db.close();
	});
}

/** Get all pending entries from the outbox. */
export async function getAllOutboxEntries(): Promise<OutboxEntry[]> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readonly');
		const store = tx.objectStore(STORE_NAME);
		const req = store.getAll();
		req.onsuccess = (e) => resolve((e.target as IDBRequest<OutboxEntry[]>).result);
		req.onerror = (e) => reject((e.target as IDBRequest).error);
		tx.oncomplete = () => db.close();
	});
}

/** Get the count of all outbox entries. */
export async function getOutboxCount(): Promise<number> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readonly');
		const store = tx.objectStore(STORE_NAME);
		const req = store.count();
		req.onsuccess = (e) => resolve((e.target as IDBRequest<number>).result);
		req.onerror = (e) => reject((e.target as IDBRequest).error);
		tx.oncomplete = () => db.close();
	});
}

/** Remove a successfully synced entry from the outbox by clientId. */
export async function removeFromOutbox(clientId: string): Promise<void> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		const store = tx.objectStore(STORE_NAME);
		const req = store.delete(clientId);
		req.onsuccess = () => resolve();
		req.onerror = (e) => reject((e.target as IDBRequest).error);
		tx.oncomplete = () => db.close();
	});
}

/** Update the syncStatus of an entry (e.g. to 'error' after a failed attempt). */
export async function updateOutboxEntry(
	clientId: string,
	patch: Partial<Pick<OutboxEntry, 'syncStatus'>>
): Promise<void> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		const store = tx.objectStore(STORE_NAME);
		const getReq = store.get(clientId);
		getReq.onsuccess = (e) => {
			const existing = (e.target as IDBRequest<OutboxEntry>).result;
			if (!existing) {
				resolve();
				return;
			}
			const putReq = store.put({ ...existing, ...patch });
			putReq.onsuccess = () => resolve();
			putReq.onerror = (ev) => reject((ev.target as IDBRequest).error);
		};
		getReq.onerror = (e) => reject((e.target as IDBRequest).error);
		tx.oncomplete = () => db.close();
	});
}

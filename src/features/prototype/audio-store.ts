/**
 * Browser-local storage for "Moja część" recordings. Audio is too large for the
 * localStorage scenario, so clips live in IndexedDB and the scenario keeps only ids.
 * Clips are not part of JSON export/import.
 */
const DB_NAME = "doroboty.prototype.audio";
const STORE = "clips";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB unavailable"));
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    });
  } finally {
    db.close();
  }
}

export async function saveClip(id: string, blob: Blob) {
  await run("readwrite", (store) => store.put(blob, id));
}

export async function loadClip(id: string): Promise<Blob | undefined> {
  return run<Blob | undefined>(
    "readonly",
    (store) => store.get(id) as IDBRequest<Blob | undefined>,
  );
}

export async function deleteClip(id: string) {
  await run("readwrite", (store) => store.delete(id));
}

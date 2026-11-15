export interface QueuedReport { clientRecordId: string; recordedAt: string; kind: string; text: string }
interface Stored { key: string; scope: string; updatedAt: number; value: unknown }
const DB_NAME = "catalyst-field-v1";

async function openStore() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore("records", { keyPath: "key" });
      store.createIndex("scope", "scope");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Offline storage is unavailable. Check browser storage permissions."));
  });
}
async function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openStore();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction("records", mode);
    const request = run(tx.objectStore("records"));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onerror = () => { db.close(); reject(new Error("Offline storage failed. Free device storage and try again.")); };
    tx.onabort = tx.onerror;
  });
}
export async function readField<T>(scope: string, name: string): Promise<T | null> {
  const record = await transaction<Stored | undefined>("readonly", (store) => store.get(`${scope}:${name}`));
  return record ? record.value as T : null;
}
export async function writeField(scope: string, name: string, value: unknown) {
  await transaction("readwrite", (store) => store.put({ key: `${scope}:${name}`, scope, updatedAt: Date.now(), value }));
}
export async function removeField(scope: string, name: string) {
  await transaction("readwrite", (store) => store.delete(`${scope}:${name}`));
}
export async function clearFieldOwner(owner: string, preserveReports = true) {
  const db = await openStore();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("records", "readwrite");
    const request = tx.objectStore("records").openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const record = cursor.value as Stored;
      if (record.scope.startsWith(`${owner}:`) && !(preserveReports && record.key.startsWith(`${record.scope}:report:`))) cursor.delete();
      cursor.continue();
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(new Error("Unable to clear offline data.")); };
  });
}
// Each queued report is its own record. Concurrent tabs and partial acknowledgements
// cannot overwrite newer records or remove reports that the server has not accepted.
export async function queueReport(scope: string, report: QueuedReport) {
  await writeField(scope, `report:${report.clientRecordId}`, report);
}
export async function pendingReports(scope: string): Promise<QueuedReport[]> {
  const records = await transaction<Stored[]>("readonly", (store) => store.index("scope").getAll(scope));
  return records.filter((record) => record.key.startsWith(`${scope}:report:`)).map((record) => record.value as QueuedReport);
}
export async function acknowledgeReports(scope: string, accepted: string[]) {
  const db = await openStore();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("records", "readwrite");
    for (const id of accepted) tx.objectStore("records").delete(`${scope}:report:${id}`);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(new Error("Unable to acknowledge saved reports.")); };
  });
}

import { offlineDb } from "./offline-db";

/**
 * Ensures we have a reliable UUID generator (using modern Crypto API or fallback fallback)
 */
export function generateLocalId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `local-${crypto.randomUUID()}`;
  }
  return `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Creates a record locally and pushes a "create" event into the Sync Queue.
 * Automatically injects the `localId` into the payload for backend idempotency.
 */
export async function createOfflineRecord(module: string, payload: any) {
  const localId = generateLocalId();
  
  const finalPayload = {
    ...payload,
    localId, // Required for backend idempotency checks
  };

  const now = new Date().toISOString();

  // 1. Immediately cache the reactive UI record so the form drops successfully 
  // and lists instantly render the newly created item.
  await offlineDb.offlineRecords.put({
    id: localId,
    module,
    data: finalPayload,
    isLocalOnly: 1,
    updatedAt: now,
  });

  // 2. Queue the mutation for background syncing to PostgreSQL
  await offlineDb.syncQueue.put({
    id: generateLocalId().replace("local-", "sync-"), // idempotency key for the queue item
    module,
    action: "create",
    localRecordId: localId,
    payload: finalPayload,
    createdAt: now,
    status: "pending",
    attempts: 0,
  });

  // Alert the system that a new sync item is ready
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("orbf-offline-db-updated"));
  }

  return { id: localId, data: finalPayload };
}

/**
 * Updates an existing record.
 * Handles the complexity of editing a record that hasn't synced yet vs a real server record.
 */
export async function updateOfflineRecord(module: string, recordId: string | number, payload: any) {
  const now = new Date().toISOString();
  const idStr = String(recordId);
  const isLocalData = idStr.startsWith("local-");

  // 1. Update the reactive UI cache
  const existingRecord = await offlineDb.offlineRecords.get(idStr);
  if (existingRecord) {
    await offlineDb.offlineRecords.put({
      ...existingRecord,
      data: { ...existingRecord.data, ...payload },
      updatedAt: now,
    });
  } else {
    // If it's not locally cached yet (e.g. they visited the edit page while online, went offline, and saved), cache it.
    await offlineDb.offlineRecords.put({
      id: idStr,
      module,
      data: payload,
      isLocalOnly: isLocalData ? 1 : 0,
      updatedAt: now,
    });
  }

  // 2. Queue the mutation
  if (isLocalData) {
    // We are editing a record that has NOT synced yet!
    // Instead of queueing an "update" for a record the server doesn't know about, 
    // we find the pending "create" event and simply mutate its payload.
    const pendingCreate = await offlineDb.syncQueue
      .filter(q => q.action === "create" && q.localRecordId === idStr)
      .first();

    if (pendingCreate) {
      await offlineDb.syncQueue.put({
        ...pendingCreate,
        payload: { ...pendingCreate.payload, ...payload },
      });
    } else {
      // Edge case: maybe it's currently "syncing" right now? Safe fallback: queue an update.
      await queueUpdate(module, idStr, payload, now);
    }
  } else {
    // Updating a real, pre-existing database record.
    await queueUpdate(module, idStr, payload, now);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("orbf-offline-db-updated"));
  }

  return { id: recordId, data: payload };
}

async function queueUpdate(module: string, targetId: string, payload: any, timestamp: string) {
  await offlineDb.syncQueue.put({
    id: generateLocalId().replace("local-", "sync-"),
    module,
    action: "update",
    localRecordId: targetId,
    payload: {
      ...payload,
      lastSyncUpdatedAt: timestamp, // Used strictly for 409 Conflict rejection testing on the backend
    },
    createdAt: timestamp,
    status: "pending",
    attempts: 0,
  });
}

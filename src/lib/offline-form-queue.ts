"use client";

import { offlineDb, type SyncQueueItem, type MutationAction } from "./offline-db";

const SYNC_INTERVAL_MS = 30_000;
let syncStarted = false;
let syncInFlight = false;

function canUseBrowser() {
  return typeof window !== "undefined";
}

function dispatchSyncEvent(detail: { synced: number; pending: number; failed: number }) {
  if (canUseBrowser()) {
    window.dispatchEvent(new CustomEvent("orbf-offline-sync-status", { detail }));
  }
}

/**
 * Universal offline-to-online Id Reconciliation Sweep.
 * If we created a school offline, it gets `local-UUID`. The backend gives it integer `42`.
 * Before we sync subsequent dependent items (like an Enrollment tied to `local-UUID`),
 * we MUST scour the entire Dexie payload history and rewrite `local-UUID` to `42`.
 */
async function reconcileLocalId(oldId: string, newId: string | number) {
  const newIdStr = String(newId);

  // 1. Rewrite pending SyncQueue payloads
  const pendingItems = await offlineDb.syncQueue.toArray();
  for (const item of pendingItems) {
    let modified = false;
    let payloadStr = JSON.stringify(item.payload);

    if (payloadStr.includes(oldId)) {
      payloadStr = payloadStr.replaceAll(oldId, newIdStr);
      modified = true;
    }

    if (item.localRecordId === oldId) {
      item.localRecordId = newIdStr;
      modified = true;
    }

    if (modified) {
      item.payload = JSON.parse(payloadStr);
      await offlineDb.syncQueue.put(item);
    }
  }

  // 2. Rewrite Offline UI Cache
  const cachedItems = await offlineDb.offlineRecords.toArray();
  for (const record of cachedItems) {
    let modified = false;
    let dataStr = JSON.stringify(record.data);

    if (dataStr.includes(oldId)) {
      dataStr = dataStr.replaceAll(oldId, newIdStr);
      modified = true;
    }

    if (record.id === oldId) {
      // The actual ID changed, we must delete the old row and insert a fresh one
      await offlineDb.offlineRecords.delete(oldId);
      await offlineDb.offlineRecords.put({
        id: newIdStr,
        module: record.module,
        data: JSON.parse(dataStr),
        isLocalOnly: 0,
        updatedAt: record.updatedAt,
      });
      continue;
    }

    if (modified) {
      record.data = JSON.parse(dataStr);
      await offlineDb.offlineRecords.put(record);
    }
  }
}

async function sendSyncItem(item: SyncQueueItem): Promise<boolean> {
  const url = item.action === "update" 
    ? `/api/portal/records/${item.localRecordId}`
    : `/api/portal/records`;

  const method = item.action === "update" ? "PUT" : "POST";

  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      module: item.module,
      status: item.payload.status || "Submitted",
      ...item.payload, // The entire raw form state
    }),
  });

  if (response.ok) {
    const json = await response.json();
    if (item.action === "create" && json.record?.id && String(json.record.id) !== item.localRecordId) {
      // It successfully synced! Reconcile the fake Local UUID with the real PostgreSQL sequence ID
      await reconcileLocalId(item.localRecordId, json.record.id);
    }
    
    // Mark as definitely synced offline
    const finalRecordId = json.record?.id ? String(json.record.id) : item.localRecordId;
    const finalCache = await offlineDb.offlineRecords.get(finalRecordId);
    if (finalCache) {
      await offlineDb.offlineRecords.put({
        ...finalCache,
        isLocalOnly: 0, 
      });
    }

    return true;
  }

  if (response.status === 409) {
    // Conflict detection hit
    await offlineDb.syncQueue.put({
      ...item,
      status: "conflict",
      lastError: "Conflict: The physical database record is newer than your offline device cache.",
    });
    return false;
  }

  if (response.status >= 400 && response.status < 500) {
    // Permanent Validation error (Zod) - stop trying to sync it blindly
    const resData = await response.json().catch(() => ({}));
    await offlineDb.syncQueue.put({
      ...item,
      status: "failed",
      lastError: resData.error || `HTTP ${response.status} Validation Error`,
    });
    return false;
  }

  // 500 server error, keep it pending to retry next loop
  throw new Error(`HTTP ${response.status}`);
}

export async function flushOfflineFormQueue() {
  if (!canUseBrowser() || syncInFlight || !navigator.onLine) {
    return;
  }

  syncInFlight = true;
  try {
    const pendingItems = await offlineDb.syncQueue
      .where("status")
      .equals("pending")
      .sortBy("createdAt");

    if (pendingItems.length === 0) {
      dispatchSyncEvent({ synced: 0, pending: 0, failed: 0 });
      return;
    }

    let synced = 0;
    let failed = 0;

    for (const item of pendingItems) {
      try {
        const success = await sendSyncItem(item);
        if (success) {
          await offlineDb.syncQueue.delete(item.id);
          synced++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        await offlineDb.syncQueue.put({
          ...item,
          attempts: item.attempts + 1,
          lastError: error instanceof Error ? error.message : "Network error",
        });

        // If the internet natively dropped mid-sync loop, break completely.
        if (!navigator.onLine) {
          break;
        }
      }
    }

    const remaining = await offlineDb.syncQueue.where("status").equals("pending").count();
    dispatchSyncEvent({ synced, pending: remaining, failed });

  } finally {
    syncInFlight = false;
  }
}

export function startOfflineFormQueueSync() {
  if (!canUseBrowser() || syncStarted) return;
  syncStarted = true;

  const syncNow = () => { void flushOfflineFormQueue(); };

  window.addEventListener("online", syncNow);
  window.addEventListener("focus", syncNow);
  window.addEventListener("orbf-offline-db-updated", syncNow);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncNow();
  });

  window.setInterval(() => {
    if (navigator.onLine) syncNow();
  }, SYNC_INTERVAL_MS);

  if (navigator.onLine) syncNow();
}

/**
 * Legacy Support: For non-priority modules (finance, newsletters) that expected the old
 * localStorage-based queue, this maps them natively into Dexie.
 */
export async function submitJsonWithOfflineQueue<T = Record<string, unknown>>(
  url: string,
  options: {
    payload: unknown;
    method?: "POST" | "PUT" | "PATCH" | "DELETE";
    headers?: HeadersInit;
    label?: string;
  },
): Promise<
  | { queued: true; queueId: string; response?: never; data?: never }
  | { queued: false; response: Response; data: T; queueId?: never }
> {
  const method = options.method ?? "POST"; // Map legacy HTTP methods
  let mappedAction: MutationAction = "create";
  if (method === "PUT" || method === "PATCH") mappedAction = "update";
  if (method === "DELETE") mappedAction = "delete";

  const isNetworkDown = canUseBrowser() && !navigator.onLine;

  if (isNetworkDown) {
    const queueId = `sync-legacy-${Date.now()}`;
    await offlineDb.syncQueue.put({
      id: queueId,
      module: options.label || "generic_legacy_form",
      action: mappedAction,
      localRecordId: queueId,
      payload: options.payload,
      createdAt: new Date().toISOString(),
      status: "pending",
      attempts: 0,
    });
    return { queued: true, queueId };
  }

  try {
    const response = await fetch(url, {
      method: options.method || "POST",
      headers: { "Content-Type": "application/json", ...options.headers },
      body: JSON.stringify(options.payload),
    });
    
    // We do NOT want to throw manually for network errors if it's legacy 400s
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : null;
    return { queued: false, response, data: data as T };
  } catch (error) {
    if (!canUseBrowser() || !(error instanceof TypeError)) {
      throw error;
    }
    const queueId = `sync-legacy-fallback-${Date.now()}`;
    await offlineDb.syncQueue.put({
       id: queueId,
       module: options.label || "generic_legacy_form",
       action: mappedAction,
       localRecordId: queueId,
       payload: options.payload,
       createdAt: new Date().toISOString(),
       status: "pending",
       attempts: 0,
       lastError: error.message,
    });
    return { queued: true, queueId };
  }
}


"use client";

type MutationMethod = "POST" | "PUT" | "PATCH" | "DELETE";

type OfflineFormQueueItem = {
  id: string;
  createdAt: string;
  method: MutationMethod;
  url: string;
  headers: Record<string, string>;
  payload: unknown;
  label?: string;
  attempts: number;
  lastError?: string;
};

type SubmitQueuedResult = {
  queued: true;
  queueId: string;
};

type SubmitOnlineResult<T> = {
  queued: false;
  response: Response;
  data: T | null;
};

export type SubmitWithOfflineQueueResult<T> = SubmitQueuedResult | SubmitOnlineResult<T>;

const OFFLINE_QUEUE_STORAGE_KEY = "orbf-offline-form-queue-v1";
const OFFLINE_SYNC_EVENT = "orbf-offline-form-sync";
const OFFLINE_QUEUED_EVENT = "orbf-offline-form-queued";
const SYNC_INTERVAL_MS = 60_000;

let syncStarted = false;
let syncInFlight = false;

function canUseBrowser() {
  return typeof window !== "undefined";
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {};
  }
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers.map(([key, value]) => [String(key), String(value)]));
  }
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, String(value)]),
  );
}

function readQueue(): OfflineFormQueueItem[] {
  if (!canUseBrowser()) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as OfflineFormQueueItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item) =>
      item &&
      typeof item.id === "string" &&
      typeof item.url === "string" &&
      typeof item.method === "string",
    );
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineFormQueueItem[]) {
  if (!canUseBrowser()) {
    return;
  }
  window.localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

function isNetworkError(error: unknown) {
  return error instanceof TypeError;
}

function queueMutation(item: Omit<OfflineFormQueueItem, "id" | "createdAt" | "attempts">): OfflineFormQueueItem {
  const queue = readQueue();
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const queued: OfflineFormQueueItem = {
    ...item,
    id,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  queue.push(queued);
  writeQueue(queue);
  if (canUseBrowser()) {
    window.dispatchEvent(
      new CustomEvent(OFFLINE_QUEUED_EVENT, {
        detail: {
          id: queued.id,
          label: queued.label || "Submission",
          createdAt: queued.createdAt,
          queueLength: queue.length,
        },
      }),
    );
  }
  return queued;
}

async function sendItem(item: OfflineFormQueueItem) {
  return fetch(item.url, {
    method: item.method,
    headers: item.headers,
    body: JSON.stringify(item.payload),
  });
}

function dispatchSyncEvent(detail: {
  synced: number;
  pending: number;
  failed: number;
}) {
  if (!canUseBrowser()) {
    return;
  }
  window.dispatchEvent(new CustomEvent(OFFLINE_SYNC_EVENT, { detail }));
}

export function getOfflineFormQueueCount() {
  return readQueue().length;
}

export async function flushOfflineFormQueue() {
  if (!canUseBrowser() || syncInFlight) {
    return { synced: 0, pending: getOfflineFormQueueCount(), failed: 0 };
  }
  if (!navigator.onLine) {
    return { synced: 0, pending: getOfflineFormQueueCount(), failed: 0 };
  }

  syncInFlight = true;
  try {
    const queue = readQueue();
    if (queue.length === 0) {
      dispatchSyncEvent({ synced: 0, pending: 0, failed: 0 });
      return { synced: 0, pending: 0, failed: 0 };
    }

    const pending: OfflineFormQueueItem[] = [];
    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        const response = await sendItem(item);
        if (response.ok) {
          synced += 1;
          continue;
        }
        failed += 1;
        pending.push({
          ...item,
          attempts: item.attempts + 1,
          lastError: `HTTP ${response.status}`,
        });
      } catch (error) {
        failed += 1;
        pending.push({
          ...item,
          attempts: item.attempts + 1,
          lastError: error instanceof Error ? error.message : "Network error",
        });
        // If network has dropped again, stop and keep remaining queue as-is.
        if (!navigator.onLine || isNetworkError(error)) {
          const remainingIndex = queue.indexOf(item) + 1;
          pending.push(...queue.slice(remainingIndex));
          break;
        }
      }
    }

    writeQueue(pending);
    dispatchSyncEvent({ synced, pending: pending.length, failed });
    return { synced, pending: pending.length, failed };
  } finally {
    syncInFlight = false;
  }
}

export function startOfflineFormQueueSync() {
  if (!canUseBrowser() || syncStarted) {
    return;
  }
  syncStarted = true;

  const syncNow = () => {
    void flushOfflineFormQueue();
  };

  window.addEventListener("online", syncNow);
  window.addEventListener("focus", syncNow);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      syncNow();
    }
  });

  window.setInterval(() => {
    if (navigator.onLine) {
      syncNow();
    }
  }, SYNC_INTERVAL_MS);

  if (navigator.onLine) {
    syncNow();
  }
}

export async function submitJsonWithOfflineQueue<T = Record<string, unknown>>(
  url: string,
  options: {
    payload: unknown;
    method?: MutationMethod;
    headers?: HeadersInit;
    label?: string;
  },
): Promise<SubmitWithOfflineQueueResult<T>> {
  const method = options.method ?? "POST";
  const headers = {
    "Content-Type": "application/json",
    ...normalizeHeaders(options.headers),
  };

  if (canUseBrowser() && !navigator.onLine) {
    const queued = queueMutation({
      method,
      url,
      headers,
      payload: options.payload,
      label: options.label,
      lastError: "Queued offline",
    });
    return { queued: true, queueId: queued.id };
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(options.payload),
    });
    const contentType = response.headers.get("content-type") || "";
    const data =
      contentType.includes("application/json")
        ? ((await response.json()) as T)
        : null;
    return { queued: false, response, data };
  } catch (error) {
    if (!canUseBrowser() || !isNetworkError(error)) {
      throw error;
    }
    const queued = queueMutation({
      method,
      url,
      headers,
      payload: options.payload,
      label: options.label,
      lastError: error instanceof Error ? error.message : "Network error",
    });
    return { queued: true, queueId: queued.id };
  }
}

export function getOfflineFormQueueEvents() {
  return {
    queued: OFFLINE_QUEUED_EVENT,
    sync: OFFLINE_SYNC_EVENT,
  };
}

import Dexie, { type Table } from "dexie";

export type MutationAction = "create" | "update" | "delete";

export interface SyncQueueItem {
  id: string;
  module: string;
  action: MutationAction;
  localRecordId: string;
  payload: any;
  createdAt: string;
  status: "pending" | "syncing" | "failed" | "conflict";
  attempts: number;
  lastError?: string;
}

export interface OfflineRecord {
  id: string;
  module: string;
  data: any;
  isLocalOnly: number; // 1 (true) or 0 (false) for Dexie indexing
  updatedAt: string;
}

export interface ReferenceData {
  key: string;
  data: any;
  updatedAt: string;
}

export class OzekiOfflineDB extends Dexie {
  syncQueue!: Table<SyncQueueItem, string>;
  offlineRecords!: Table<OfflineRecord, string>;
  referenceData!: Table<ReferenceData, string>;

  constructor() {
    super("ozeki_offline_db");
    this.version(1).stores({
      // We index fields we frequently query
      syncQueue: "id, module, status, createdAt",
      offlineRecords: "id, module, isLocalOnly",
      referenceData: "key",
    });
  }
}

// Safe initialization for SSR
export const offlineDb = typeof window !== "undefined" ? new OzekiOfflineDB() : (null as unknown as OzekiOfflineDB);

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { offlineDb } from "@/lib/offline-db";
import { useLiveQuery } from "dexie-react-hooks";

export function SyncStatusBadge() {
  const [isOnline, setIsOnline] = useState(true);

  // Monitor network status
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Use Dexie live query to get queue stats
  const pendingCount = useLiveQuery(
    () => offlineDb.syncQueue.where("status").equals("pending").count(),
    [],
    0
  );
  
  const failedCount = useLiveQuery(
    () => offlineDb.syncQueue.where("status").equals("failed").count(),
    [],
    0
  );

  const conflictCount = useLiveQuery(
    () => offlineDb.syncQueue.where("status").equals("conflict").count(),
    [],
    0
  );

  const syncingCount = useLiveQuery(
    () => offlineDb.syncQueue.where("status").equals("syncing").count(),
    [],
    0
  );

  const totalItems = pendingCount + failedCount + conflictCount + syncingCount;

  if (totalItems === 0 && isOnline) {
    return (
      <Link href="/portal/sync-center" className="sync-badge sync-badge--synced" title="All changes synced">
        <span className="sync-badge__icon">✓</span>
        <span className="sync-badge__text">Synced</span>
      </Link>
    );
  }

  if (!isOnline) {
    return (
      <Link href="/portal/sync-center" className="sync-badge sync-badge--offline" title="You are offline">
        <span className="sync-badge__icon">⚡</span>
        <span className="sync-badge__text">Offline ({totalItems} pending)</span>
      </Link>
    );
  }

  if (conflictCount > 0 || failedCount > 0) {
    return (
      <Link href="/portal/sync-center" className="sync-badge sync-badge--error" title="Sync errors require attention">
        <span className="sync-badge__icon">!</span>
        <span className="sync-badge__text">{conflictCount + failedCount} Errors</span>
      </Link>
    );
  }

  if (syncingCount > 0) {
    return (
      <Link href="/portal/sync-center" className="sync-badge sync-badge--syncing" title="Syncing now...">
        <span className="sync-badge__icon">↻</span>
        <span className="sync-badge__text">Syncing...</span>
      </Link>
    );
  }

  return (
    <Link href="/portal/sync-center" className="sync-badge sync-badge--pending" title="Changes waiting to sync">
      <span className="sync-badge__icon">↑</span>
      <span className="sync-badge__text">{pendingCount} Pending</span>
    </Link>
  );
}

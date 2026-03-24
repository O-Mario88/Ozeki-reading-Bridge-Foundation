"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb, SyncQueueItem } from "@/lib/offline-db";

export function SyncCenterClient() {
  const pendingItems = useLiveQuery(
    () => offlineDb.syncQueue.where("status").equals("pending").toArray(),
    []
  );

  const syncingItems = useLiveQuery(
    () => offlineDb.syncQueue.where("status").equals("syncing").toArray(),
    []
  );

  const failedItems = useLiveQuery(
    () => offlineDb.syncQueue.where("status").equals("failed").toArray(),
    []
  );

  const conflictItems = useLiveQuery(
    () => offlineDb.syncQueue.where("status").equals("conflict").toArray(),
    []
  );

  const handleRetry = async (id: string) => {
    await offlineDb.syncQueue.update(id, {
      status: "pending",
      attempts: 0,
      lastError: undefined,
    });
  };

  const handleDiscard = async (id: string) => {
    if (confirm("Are you sure you want to discard this and immediately lose your offline data?")) {
      await offlineDb.syncQueue.delete(id);
    }
  };

  const renderQueueTable = (title: string, items: SyncQueueItem[] | undefined, showActions: boolean) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="ds-panel" style={{ marginBottom: "2rem" }}>
        <h2 className="ds-panel-title">{title} ({items.length})</h2>
        <div className="table-responsive">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Action</th>
                <th>Created At</th>
                <th>Status</th>
                {showActions && <th>Details / Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.module}</strong></td>
                  <td><span className={`badge badge--${item.action}`}>{item.action}</span></td>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                  <td>
                    <span className={`status-pill status-pill--${item.status}`}>
                      {item.status}
                    </span>
                  </td>
                  {showActions && (
                    <td>
                      {item.lastError && (
                        <p className="form-inline-note form-inline-note--error" style={{ marginBottom: "0.5rem" }}>
                          {item.lastError}
                        </p>
                      )}
                      <div className="flex gap-2">
                         <button className="button button-sm" onClick={() => handleRetry(item.id)}>Retry</button>
                         <button className="button button-sm button-ghost" onClick={() => handleDiscard(item.id)}>Discard</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const totalItems = (pendingItems?.length || 0) + (syncingItems?.length || 0) + (conflictItems?.length || 0) + (failedItems?.length || 0);

  return (
    <>
      <div className="ds-panel" style={{ marginBottom: "2rem" }}>
        <h2 className="ds-panel-title">System Synchronization</h2>
        <p className="portal-muted">
          Your offline activity is managed here. When the network is restored, Priority Records sync automatically in the background. If errors occur (like server conflicts or validation failures), you must review and clear them here.
        </p>
      </div>

      {totalItems === 0 && (
        <div className="ds-panel empty-state">
          <h3>You are all caught up!</h3>
          <p className="portal-muted">There are no offline records waiting to be synced to the Ozeki remote servers.</p>
        </div>
      )}

      {renderQueueTable("Conflicts (Requires Action)", conflictItems, true)}
      {renderQueueTable("Failed (Connection/Server Errors)", failedItems, true)}
      {renderQueueTable("Syncing Now", syncingItems, false)}
      {renderQueueTable("Pending Sync", pendingItems, false)}
    </>
  );
}

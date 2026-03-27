"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { offlineDb } from "@/lib/offline-db";

/**
 * A custom hook to fetch and cache reference data (dropdowns, rosters, configurations) 
 * so forms remain functional in offline mode.
 * 
 * Flow:
 * 1. Checks memory/Dexie for cached data (instant return).
 * 2. If online, fetches fresh data from server.
 * 3. Updates Dexie and memory cache with fresh data.
 * 4. If offline or the fetch fails, seamlessly falls back to the Dexie cache.
 */
export function useOfflineReference<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  _ttlMs = 1000 * 60 * 60 * 24 // 24 hours default TTL before strict background refresh, though we try anyway
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOfflineFallback, setIsOfflineFallback] = useState<boolean>(false);

  // Store the latest fetcher in a ref to avoid infinite rendering loops
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const fetchWithCache = useCallback(async () => {
    if (!key) {
      setData(null);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);

        let cachedItem;
        try {
          cachedItem = await offlineDb.referenceData.get(key);
          if (cachedItem?.data) {
            setData(cachedItem.data as T);
            setIsOfflineFallback(true); // Treat as offline/stale until fresh data overrides
          }
        } catch (dbErr) {
          console.error("Dexie cache read failed:", dbErr);
        }

        // 2. Fetch fresh data if online
        if (typeof navigator !== "undefined" && navigator.onLine) {
          try {
            const freshData = await fetcherRef.current();

            setData(freshData);
            setIsOfflineFallback(false);
            setError(null);

            // 3. Persist fresh data into IndexedDB for future offline usage
            await offlineDb.referenceData.put({
              key,
              data: freshData,
              updatedAt: new Date().toISOString()
            });
            
          } catch (networkErr: unknown) {
            console.warn(`Network fetch failed for ${key}, falling back to cache.`, networkErr);
            if (!cachedItem) {
              setError(networkErr instanceof Error ? networkErr : new Error("Network error"));
            }
          }
        } else if (!cachedItem) {
          setError(new Error("You are offline and no cached data is available."));
        }
      } catch (err: unknown) {
         setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
  }, [key]);

  useEffect(() => {
    fetchWithCache();
  }, [fetchWithCache]);

  return { data, loading, error, isOfflineFallback, refetch: fetchWithCache };
}

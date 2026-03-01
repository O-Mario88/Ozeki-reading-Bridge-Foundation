"use client";

import { useState, useEffect } from "react";

interface GeoStats {
    regions: number;
    subregions: number;
    districts: number;
    subcounties: number;
    parishes: number;
}

export function GeoSyncPanel() {
    const [stats, setStats] = useState<GeoStats | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [loading, setLoading] = useState(true);

    async function fetchStats() {
        try {
            const res = await fetch("/api/portal/geo-sync");
            const data = await res.json();
            if (data.ok) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error("Failed to fetch geo stats", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchStats();
    }, []);

    async function handleSync() {
        setSyncing(true);
        setStatus(null);
        try {
            const res = await fetch("/api/portal/geo-sync", { method: "POST" });
            const data = await res.json();
            if (data.ok) {
                setStatus({ type: "success", message: `Sync complete! Regions: ${data.result.regions}, Sub-regions: ${data.result.subregions}, Districts: ${data.result.districts}, Sub-counties: ${data.result.subcounties}, Parishes: ${data.result.parishes}` });
                fetchStats();
            } else {
                throw new Error(data.error || "Sync failed");
            }
        } catch (error) {
            setStatus({ type: "error", message: error instanceof Error ? error.message : "Sync failed" });
        } finally {
            setSyncing(false);
        }
    }

    return (
        <section className="card" style={{ marginTop: "2rem" }}>
            <h2>🌍 Geography Synchronization</h2>
            <p>
                Ensure the canonical Uganda administrative hierarchy is up to date in the database.
                This tool refreshes Regions, Sub-regions, Districts, Sub-counties, and Parishes.
            </p>

            {loading ? (
                <p className="portal-muted">Loading geography stats...</p>
            ) : stats ? (
                <div className="portal-kpis" style={{ margin: "1.5rem 0" }}>
                    <div className="portal-kpi-card">
                        <p>Regions</p>
                        <strong>{stats.regions}</strong>
                    </div>
                    <div className="portal-kpi-card">
                        <p>Sub-regions</p>
                        <strong>{stats.subregions}</strong>
                    </div>
                    <div className="portal-kpi-card">
                        <p>Districts</p>
                        <strong>{stats.districts}</strong>
                    </div>
                    <div className="portal-kpi-card">
                        <p>Sub-counties</p>
                        <strong>{stats.subcounties}</strong>
                    </div>
                    <div className="portal-kpi-card">
                        <p>Parishes</p>
                        <strong>{stats.parishes}</strong>
                    </div>
                </div>
            ) : null}

            <div className="action-row">
                <button
                    className="button"
                    onClick={handleSync}
                    disabled={syncing}
                >
                    {syncing ? "Syncing..." : "Run Geo Hierarchy Sync"}
                </button>
                <p className="portal-muted" style={{ margin: 0 }}>
                    This will upsert records from the authoritative seed data and link schools.
                </p>
            </div>

            {status && (
                <p className={`form-message ${status.type === "success" ? "success" : "error"}`} style={{ marginTop: "1rem" }}>
                    {status.message}
                </p>
            )}
        </section>
    );
}

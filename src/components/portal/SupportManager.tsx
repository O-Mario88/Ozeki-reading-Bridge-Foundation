"use client";

import React, { useState } from "react";
import { SupportRequestRecord, SupportRequestStatus, PortalUserAdminRecord } from "@/lib/types";

interface Props {
    initialRequests: SupportRequestRecord[];
    staffMembers: PortalUserAdminRecord[];
}

const FILTER_STATUSES: Array<SupportRequestStatus | "All"> = [
    "All",
    "New",
    "Contacted",
    "Scheduled",
    "Delivered",
    "Closed",
];

export default function SupportManager({ initialRequests, staffMembers }: Props) {
    const [requests, setRequests] = useState(initialRequests);
    const [filterStatus, setFilterStatus] = useState<SupportRequestStatus | "All">("All");
    const [search, setSearch] = useState("");
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    const filteredRequests = requests.filter(req => {
        const matchesStatus = filterStatus === "All" || req.status === filterStatus;
        const matchesSearch =
            req.contactName.toLowerCase().includes(search.toLowerCase()) ||
            (req.locationText?.toLowerCase() || "").includes(search.toLowerCase()) ||
            req.message.toLowerCase().includes(search.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const handleUpdate = async (id: number, updates: Partial<SupportRequestRecord>) => {
        setUpdatingId(id);
        try {
            const res = await fetch(`/api/portal/support/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
            }
        } catch (err) {
            console.error("Failed to update support request:", err);
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div>
            <div className="ds-card-header" style={{ marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                    <h2 className="ds-card-title" style={{ fontSize: "1.25rem" }}>Support Tickets</h2>
                    <p className="ds-metric-sub" style={{ marginTop: "0.25rem" }}>Manage school support requests and assignments.</p>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {FILTER_STATUSES.map(status => {
                        const isActive = filterStatus === status;
                        return (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                style={{
                                    padding: "0.4rem 0.8rem", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, border: "none", cursor: "pointer", transition: "all 0.15s ease",
                                    background: isActive ? "var(--ds-accent-blue)" : "#f8f9fa",
                                    color: isActive ? "#fff" : "var(--ds-text-secondary)"
                                }}
                            >
                                {status}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
                <input
                    type="text"
                    placeholder="Search by contact, location or message..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: "100%", maxWidth: "400px", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #e4e6ef", fontSize: "0.85rem", color: "var(--ds-text-primary)", outline: "none" }}
                />
            </div>

            <div className="ds-table-wrap">
                <table className="ds-table">
                    <thead>
                            <tr>
                                <th>Submitted</th>
                                <th>Contact / School</th>
                                <th>Support Types</th>
                                <th>Urgency</th>
                                <th>Status</th>
                                <th>Assigned To</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRequests.map(req => (
                                <tr key={req.id}>
                                    <td style={{ color: "var(--ds-text-secondary)", fontSize: "0.8rem" }}>
                                        {new Date(req.createdAt).toLocaleDateString("en-GB")}
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 700, color: "var(--ds-text-primary)" }}>{req.contactName}</div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--ds-text-secondary)" }}>{req.locationText || "Internal School"}</div>
                                        <div style={{ fontSize: "0.7rem", color: "var(--ds-accent-blue)", fontStyle: "italic", marginTop: "0.2rem" }}>{req.contactInfo}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                                            {req.supportTypes.map(t => (
                                                <span key={t} style={{ background: "#f8f9fa", color: "var(--ds-text-secondary)", padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: req.urgency === 'high' ? 'var(--ds-accent-red)' : req.urgency === 'medium' ? 'var(--ds-accent-orange)' : 'var(--ds-accent-blue)' }}>
                                            {req.urgency}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`ds-badge ds-badge-${req.status === 'New' ? 'info' : req.status === 'Closed' ? 'default' : req.status === 'Scheduled' ? 'success' : 'warning'}`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td>
                                        <select
                                            value={req.assignedStaffId || ""}
                                            onChange={(e) => handleUpdate(req.id, { assignedStaffId: e.target.value ? Number(e.target.value) : undefined })}
                                            disabled={updatingId === req.id}
                                            style={{ background: "transparent", border: "none", fontSize: "0.8rem", color: "var(--ds-accent-blue)", fontWeight: 600, textDecoration: "underline", cursor: "pointer", outline: "none" }}
                                        >
                                            <option value="">Unassigned</option>
                                            {staffMembers.map(staff => (
                                                <option key={staff.id} value={staff.id}>{staff.fullName}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
                                            <select
                                                value={req.status}
                                                onChange={(e) => handleUpdate(req.id, { status: e.target.value as SupportRequestStatus })}
                                                disabled={updatingId === req.id}
                                                style={{ background: "var(--ds-accent-blue)", color: "white", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", padding: "0.3rem 0.5rem", borderRadius: "6px", border: "none", cursor: "pointer", outline: "none" }}
                                            >
                                                {["New", "Contacted", "Scheduled", "Delivered", "Closed"].map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>

                                            <div className="relative group" style={{ position: "relative" }}>
                                                <button style={{ padding: "0.2rem 0.5rem", borderRadius: "6px", background: "#f8f9fa", border: "1px solid #e4e6ef", cursor: "pointer", fontSize: "10px", fontWeight: 800, color: "var(--ds-text-secondary)" }}>
                                                    •••
                                                </button>
                                                <div className="hidden group-hover:block" style={{ position: "absolute", right: 0, bottom: "100%", marginBottom: "0.5rem", width: "160px", background: "white", border: "1px solid #e4e6ef", borderRadius: "8px", boxShadow: "0 4px 14px rgba(0,0,0,0.1)", zIndex: 20, padding: "0.25rem" }}>
                                                    <button
                                                        onClick={() => {
                                                            const params = new URLSearchParams();
                                                            params.set("schoolId", String(req.schoolId || ""));
                                                            params.set("notes", `Converted from Support Ticket #${req.id}: ${req.message}`);
                                                            window.location.href = `/portal/visits?new=true&${params.toString()}`;
                                                        }}
                                                        style={{ display: "block", width: "100%", textAlign: "left", padding: "0.5rem", fontSize: "0.75rem", background: "transparent", border: "none", cursor: "pointer", color: "var(--ds-text-primary)", borderRadius: "4px" }}
                                                        onMouseOver={e => e.currentTarget.style.background = "#f4f5f8"}
                                                        onMouseOut={e => e.currentTarget.style.background = "transparent"}
                                                    >
                                                        Convert to Visit
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const params = new URLSearchParams();
                                                            params.set("schoolId", String(req.schoolId || ""));
                                                            params.set("notes", `Converted from Support Ticket #${req.id}: ${req.message}`);
                                                            window.location.href = `/portal/trainings?new=true&${params.toString()}`;
                                                        }}
                                                        style={{ display: "block", width: "100%", textAlign: "left", padding: "0.5rem", fontSize: "0.75rem", background: "transparent", border: "none", cursor: "pointer", color: "var(--ds-text-primary)", borderRadius: "4px" }}
                                                        onMouseOver={e => e.currentTarget.style.background = "#f4f5f8"}
                                                        onMouseOut={e => e.currentTarget.style.background = "transparent"}
                                                    >
                                                        Convert to Training
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredRequests.length === 0 && (
                        <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--ds-text-muted)", fontSize: "0.85rem" }}>
                            No matching support requests found.
                        </div>
                    )}
                </div>
        </div>
    );
}

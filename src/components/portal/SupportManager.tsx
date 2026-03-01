"use client";

import React, { useState, useEffect } from "react";
import { SupportRequestRecord, SupportRequestStatus, PortalUserAdminRecord } from "@/lib/types";

interface Props {
    initialRequests: SupportRequestRecord[];
    staffMembers: PortalUserAdminRecord[];
}

const STATUS_COLORS: Record<SupportRequestStatus, string> = {
    New: "#2196f3",
    Contacted: "#ff9800",
    Scheduled: "#9c27b0",
    Delivered: "#4caf50",
    Closed: "#757575"
};

function Badge({ label, color }: { label: string; color: string }) {
    return (
        <span
            className="inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{
                backgroundColor: `${color}15`,
                color: color,
                border: `1px solid ${color}30`
            }}
        >
            {label}
        </span>
    );
}

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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Support Tickets</h2>
                    <p className="text-sm text-gray-500">Manage school support requests and assignments.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {["All", "New", "Contacted", "Scheduled", "Delivered", "Closed"].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === status
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                                : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                    <input
                        type="text"
                        placeholder="Search by contact, location or message..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full max-w-md px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/50 text-gray-400 font-medium uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Submitted</th>
                                <th className="px-6 py-4">Contact / School</th>
                                <th className="px-6 py-4">Support Types</th>
                                <th className="px-6 py-4">Urgency</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Assigned To</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredRequests.map(req => (
                                <tr key={req.id} className="hover:bg-gray-50/30 transition-colors group">
                                    <td className="px-6 py-4 text-gray-400 text-xs">
                                        {new Date(req.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{req.contactName}</div>
                                        <div className="text-xs text-gray-500">{req.locationText || "Internal School"}</div>
                                        <div className="text-[10px] text-indigo-500 italic mt-0.5">{req.contactInfo}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {req.supportTypes.map(t => (
                                                <span key={t} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-bold uppercase ${req.urgency === 'high' ? 'text-red-500' : req.urgency === 'medium' ? 'text-orange-500' : 'text-blue-500'
                                            }`}>
                                            {req.urgency}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge label={req.status} color={STATUS_COLORS[req.status]} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={req.assignedStaffId || ""}
                                            onChange={(e) => handleUpdate(req.id, { assignedStaffId: e.target.value ? Number(e.target.value) : undefined })}
                                            disabled={updatingId === req.id}
                                            className="bg-transparent text-xs border-none focus:ring-0 p-0 cursor-pointer text-indigo-600 font-medium underline decoration-indigo-200"
                                        >
                                            <option value="">Unassigned</option>
                                            {staffMembers.map(staff => (
                                                <option key={staff.id} value={staff.id}>{staff.fullName}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={req.status}
                                                onChange={(e) => handleUpdate(req.id, { status: e.target.value as SupportRequestStatus })}
                                                disabled={updatingId === req.id}
                                                className="bg-indigo-600 text-white text-[10px] font-bold uppercase rounded-lg border-none px-2 py-1 cursor-pointer hover:bg-indigo-700 transition-colors"
                                            >
                                                {["New", "Contacted", "Scheduled", "Delivered", "Closed"].map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>

                                            <div className="relative group/menu">
                                                <button className="p-1 px-2 rounded-lg bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors text-[10px] font-black">
                                                    •••
                                                </button>
                                                <div className="absolute right-0 bottom-full mb-2 w-48 bg-white border border-gray-100 rounded-xl shadow-2xl p-1 hidden group-hover/menu:block z-20">
                                                    <button
                                                        onClick={() => {
                                                            const params = new URLSearchParams();
                                                            params.set("schoolId", String(req.schoolId || ""));
                                                            params.set("notes", `Converted from Support Ticket #${req.id}: ${req.message}`);
                                                            window.location.href = `/portal/visits?new=true&${params.toString()}`;
                                                        }}
                                                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg text-xs text-gray-700 font-medium"
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
                                                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg text-xs text-gray-700 font-medium"
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
                        <div className="p-12 text-center text-gray-400">
                            No matching support requests found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

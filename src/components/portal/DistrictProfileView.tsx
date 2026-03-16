"use client";

import { DistrictStats, SchoolSupportStatusRecord } from "@/lib/types";
import Link from "next/link";
import { useMemo, useState } from "react";

interface DistrictProfileViewProps {
    stats: DistrictStats;
    initialSupportStatuses: SchoolSupportStatusRecord[];
    initialSchools: Array<{
        id: number;
        name: string;
        district: string;
        subCounty: string;
        parish: string;
        status: string;
        enrollment: number;
    }>;
}

export function DistrictProfileView({ stats, initialSupportStatuses, initialSchools }: DistrictProfileViewProps) {
    const [activeTab, setActiveTab] = useState<"schools" | "impact">("schools");
    const statusCounts = useMemo(() => {
        const counts = new Map<string, number>();
        initialSupportStatuses.forEach((row) => {
            counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
        });
        return counts;
    }, [initialSupportStatuses]);

    return (
        <div className="profile-container">
            {/* Header Section */}
            <div className="profile-header">
                <div className="profile-header-top">
                    <div className="breadcrumbs">
                        <Link href={`/portal/regions/${stats.region}`} className="breadcrumb-link">
                            Regions
                        </Link>
                        <span className="breadcrumb-separator">/</span>
                        <Link href={`/portal/regions/${stats.region}`} className="breadcrumb-link">
                            {stats.region}
                        </Link>
                        <span className="breadcrumb-separator">/</span>
                        <span className="breadcrumb-current">{stats.district}</span>
                    </div>
                </div>

                <div className="title-section">
                    <div className="icon-box">
                        <span className="emoji-icon">📍</span>
                    </div>
                    <div className="info-box">
                        <div className="type-label">District</div>
                        <h1>{stats.district}</h1>
                    </div>
                </div>

                {/* Highlights */}
                <div className="highlights-row">
                    <div className="highlight-item">
                        <span className="label">Region</span>
                        <Link href={`/portal/regions/${stats.region}`} className="value link">{stats.region}</Link>
                    </div>
                    <div className="highlight-item">
                        <span className="label">Total Schools</span>
                        <span className="value">{stats.totalSchools}</span>
                    </div>
                    <div className="highlight-item">
                        <span className="label">Total Learners</span>
                        <span className="value">{stats.totalLearners.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="content-grid">
                <div className="main-column">

                    {/* Tabs */}
                    <div className="tabs-container">
                        <div className="tabs-header">
                            <button
                                className={`tab-btn ${activeTab === "schools" ? "active" : ""}`}
                                onClick={() => setActiveTab("schools")}
                            >
                                Schools
                            </button>
                            <button
                                className={`tab-btn ${activeTab === "impact" ? "active" : ""}`}
                                onClick={() => setActiveTab("impact")}
                            >
                                Impact
                            </button>
                        </div>

                        <div className="tab-content">
                            {activeTab === "schools" && (
                                <div className="list-view">
                                    <h3>Schools in {stats.district}</h3>
                                    <div className="table-wrap">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>School Name</th>
                                                    <th>Sub-county</th>
                                                    <th>Parish</th>
                                                    <th>Status</th>
                                                    <th>Enrollment</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {initialSchools.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="empty-state-row">
                                                            No schools found for this district.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    initialSchools.map((school) => (
                                                        <tr key={school.id}>
                                                            <td>
                                                                <Link href={`/portal/schools/${school.id}`} className="value link">
                                                                    {school.name}
                                                                </Link>
                                                            </td>
                                                            <td>{school.subCounty}</td>
                                                            <td>{school.parish}</td>
                                                            <td>{school.status}</td>
                                                            <td>{school.enrollment.toLocaleString()}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div style={{ marginTop: "1rem" }}>
                                        <Link href={`/portal/schools?district=${stats.district}`} className="action-link">
                                            View in Schools Directory &rarr;
                                        </Link>
                                    </div>
                                </div>
                            )}


                            {activeTab === "impact" && (
                                <div className="list-view">
                                    <h3>School Support Status ({stats.district})</h3>
                                    <div className="impact-status-grid">
                                        <article className="impact-status-card">
                                            <span>Requires Remedial & Catch-Up</span>
                                            <strong>{statusCounts.get("Requires Remedial & Catch-Up") ?? 0}</strong>
                                        </article>
                                        <article className="impact-status-card">
                                            <span>Progressing</span>
                                            <strong>{statusCounts.get("Progressing (Maintain + Strengthen)") ?? 0}</strong>
                                        </article>
                                        <article className="impact-status-card">
                                            <span>Graduation Prep</span>
                                            <strong>{statusCounts.get("Graduation Prep (Approaching criteria)") ?? 0}</strong>
                                        </article>
                                        <article className="impact-status-card">
                                            <span>Graduation Eligible</span>
                                            <strong>{statusCounts.get("Graduation Eligible") ?? 0}</strong>
                                        </article>
                                    </div>
                                    <div className="table-wrap">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>School</th>
                                                    <th>Status</th>
                                                    <th>Period</th>
                                                    <th>Non-readers %</th>
                                                    <th>Below minimum %</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {initialSupportStatuses.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="empty-state-row">
                                                            No support-status snapshots available yet.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    initialSupportStatuses.map((row) => (
                                                        <tr key={row.id}>
                                                            <td>
                                                                <Link href={`/portal/schools/${row.schoolId}`} className="value link">
                                                                    {row.schoolName}
                                                                </Link>
                                                            </td>
                                                            <td>{row.status}</td>
                                                            <td>{row.periodKey}</td>
                                                            <td>
                                                                {typeof row.metrics.nonReadersPct === "number"
                                                                    ? `${row.metrics.nonReadersPct}%`
                                                                    : "N/A"}
                                                            </td>
                                                            <td>
                                                                {typeof row.metrics.belowMinimumPct === "number"
                                                                    ? `${row.metrics.belowMinimumPct}%`
                                                                    : "N/A"}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
        .profile-container {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
          background-color: #f3f4f6;
          min-height: 100vh;
          padding-bottom: 2rem;
        }
        
        /* Header */
        .profile-header {
          background-color: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 1rem 1.5rem;
          margin-bottom: 1.5rem;
        }

        .profile-header-top {
          margin-bottom: 1rem;
        }

        .breadcrumbs {
          font-size: 0.875rem;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .breadcrumb-link {
            color: #6b7280;
            text-decoration: none;
        }
        
        .breadcrumb-link:hover {
            color: #4f46e5;
            text-decoration: underline;
        }

        .title-section {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .icon-box {
          width: 48px;
          height: 48px;
          background-color: #dbeafe;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .emoji-icon {
            font-size: 1.5rem;
        }

        .type-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #6b7280;
          letter-spacing: 0.05em;
        }

        h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
          line-height: 1.2;
        }

        .highlights-row {
          display: flex;
          gap: 2rem;
          padding-top: 0.5rem;
        }

        .highlight-item {
          display: flex;
          flex-direction: column;
        }

        .highlight-item .label {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.125rem;
        }

        .highlight-item .value {
          font-size: 0.875rem;
          color: #111827;
          font-weight: 500;
        }

        .highlight-item .value.link {
            color: #4f46e5;
            text-decoration: none;
            cursor: pointer;
        }
        
        .highlight-item .value.link:hover {
            text-decoration: underline;
        }

        /* Content Grid */
        .content-grid {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        .tabs-container {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          min-height: 400px;
        }

        .tabs-header {
          display: flex;
          border-bottom: 1px solid #e5e7eb;
          background-color: #f9fafb;
        }

        .tab-btn {
          padding: 0.75rem 1.25rem;
          font-size: 0.82rem;
          font-weight: 600;
          color: #6b7280;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
        }

        .tab-btn:hover {
            color: #111827;
        }

        .tab-btn.active {
          color: #4f46e5;
          border-bottom-color: #4f46e5;
          background-color: white;
          border-top: 2px solid transparent;
        }
        
        .tab-content {
            padding: 1.5rem;
        }

        .placeholder-view {
            color: #6b7280;
            text-align: center;
            padding: 3rem 0;
        }

        .action-link {
            display: inline-block;
            margin-top: 1rem;
            color: #4f46e5;
            font-weight: 500;
            text-decoration: none;
        }
        
        .action-link:hover {
            text-decoration: underline;
        }

        .impact-status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 0.75rem;
            margin-bottom: 1rem;
        }

        .impact-status-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 0.65rem 0.8rem;
            background: #f8fafc;
            display: grid;
            gap: 0.2rem;
        }

        .impact-status-card span {
            font-size: 0.72rem;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.02em;
        }

        .impact-status-card strong {
            font-size: 1rem;
            color: #111827;
        }

        .table-wrap {
            overflow-x: auto;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            background: #fff;
        }

        th, td {
            text-align: left;
            padding: 0.6rem 0.7rem;
            border-bottom: 1px solid #f1f5f9;
            font-size: 0.82rem;
            color: #334155;
        }

        th {
            font-size: 0.73rem;
            color: #64748b;
            background: #f8fafc;
            text-transform: uppercase;
            letter-spacing: 0.02em;
        }

        .empty-state-row {
            text-align: center;
            color: #94a3b8;
            font-style: italic;
            padding: 1rem;
        }
      `}</style>
        </div>
    );
}

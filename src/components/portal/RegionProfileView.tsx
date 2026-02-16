"use client";

import { RegionStats } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

interface RegionProfileViewProps {
    stats: RegionStats;
}

export function RegionProfileView({ stats }: RegionProfileViewProps) {
    const [activeTab, setActiveTab] = useState<"districts" | "schools" | "impact">("districts");

    return (
        <div className="profile-container">
            {/* Header Section */}
            <div className="profile-header">
                <div className="profile-header-top">
                    <div className="breadcrumbs">
                        <span className="breadcrumb-link-disabled">Regions</span>
                        <span className="breadcrumb-separator">/</span>
                        <span className="breadcrumb-current">{stats.region}</span>
                    </div>
                </div>

                <div className="title-section">
                    <div className="icon-box">
                        <span className="emoji-icon">🗺️</span>
                    </div>
                    <div className="info-box">
                        <div className="type-label">Region</div>
                        <h1>{stats.region}</h1>
                    </div>
                </div>

                {/* Highlights */}
                <div className="highlights-row">
                    <div className="highlight-item">
                        <span className="label">Total Districts</span>
                        <span className="value">{stats.totalDistricts}</span>
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
                                className={`tab-btn ${activeTab === "districts" ? "active" : ""}`}
                                onClick={() => setActiveTab("districts")}
                            >
                                Districts
                            </button>
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
                            {activeTab === "districts" && (
                                <div className="list-view">
                                    <h3>Districts in {stats.region}</h3>
                                    {stats.districts.length > 0 ? (
                                        <div className="items-grid">
                                            {stats.districts.map((district) => (
                                                <Link key={district} href={`/portal/districts/${district}`} className="item-card">
                                                    <div className="item-icon">📍</div>
                                                    <div className="item-name">{district}</div>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="empty-state">No districts found in this region.</div>
                                    )}
                                </div>
                            )}

                            {activeTab === "schools" && (
                                <div className="placeholder-view">
                                    <p>List of all {stats.totalSchools} schools in {stats.region} would appear here.</p>
                                    <Link href={`/portal/schools?region=${stats.region}`} className="action-link">
                                        View in Schools Directory &rarr;
                                    </Link>
                                </div>
                            )}

                            {activeTab === "impact" && (
                                <div className="placeholder-view">
                                    <p>Aggregated impact reports and charts for {stats.region} will appear here.</p>
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

        .breadcrumb-link-disabled {
            color: #9ca3af;
            cursor: default;
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
          background-color: #e0e7ff;
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
          padding: 1rem 1.5rem;
          font-size: 0.875rem;
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

        .list-view h3 {
            font-size: 1rem;
            margin-top: 0;
            margin-bottom: 1rem;
            color: #374151;
        }

        .items-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1rem;
        }

        .item-card {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            text-decoration: none;
            color: #111827;
            background-color: white;
            transition: all 0.15s;
        }

        .item-card:hover {
            border-color: #4f46e5;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            color: #4f46e5;
        }

        .item-icon {
            font-size: 1.25rem;
        }
        
        .item-name {
            font-weight: 500;
            font-size: 0.9rem;
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

        .empty-state {
            color: #9ca3af;
            padding: 1rem;
            font-style: italic;
        }
      `}</style>
        </div>
    );
}

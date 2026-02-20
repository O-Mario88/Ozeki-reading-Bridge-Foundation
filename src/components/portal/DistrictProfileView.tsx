"use client";

import { DistrictStats } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

interface DistrictProfileViewProps {
    stats: DistrictStats;
}

export function DistrictProfileView({ stats }: DistrictProfileViewProps) {
    const [activeTab, setActiveTab] = useState<"schools" | "impact">("schools");

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
                                <div className="placeholder-view">
                                    <p>List of all {stats.totalSchools} schools in {stats.district} District.</p>
                                    <Link href={`/portal/schools?district=${stats.district}`} className="action-link">
                                        View in Schools Directory &rarr;
                                    </Link>
                                </div>
                            )}

                            {activeTab === "impact" && (
                                <div className="placeholder-view">
                                    <p>Aggregated impact reports and charts for {stats.district} will appear here.</p>
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
      `}</style>
        </div>
    );
}

"use client";

import { SchoolDirectoryRecord } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

interface SchoolProfileViewProps {
  school: SchoolDirectoryRecord;
}

export function SchoolProfileView({ school }: SchoolProfileViewProps) {
  const [activeTab, setActiveTab] = useState<"details" | "related" | "activity">("details");

  return (
    <div className="school-profile-container">
      {/* Header Section */}
      <div className="school-header">
        <div className="school-header-top">
          <div className="breadcrumbs">
            <Link href="/portal/schools" className="breadcrumb-link">Schools</Link>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{school.name}</span>
          </div>
          <div className="header-actions">
            <button className="button button-outline button-sm">
              ✏️ Edit
            </button>
            <button className="button button-primary button-sm">
              👤 Change Owner
            </button>
          </div>
        </div>

        <div className="school-title-section">
          <div className="school-icon">
            <div className="school-avatar">
              {school.name.charAt(0)}
            </div>
          </div>
          <div className="school-info">
            <div className="school-type">Account</div>
            <h1>{school.name}</h1>
          </div>
        </div>

        {/* Quick Actions / Highlights */}
        <div className="school-highlights">
          <div className="highlight-item">
            <span className="label">School ID</span>
            <span className="value">{school.schoolCode}</span>
          </div>
          <div className="highlight-item">
            <span className="label">District</span>
            <span className="value">{school.district}</span>
          </div>
          <div className="highlight-item">
            <span className="label">Total Enrollment</span>
            <span className="value">{school.enrolledLearners.toLocaleString()}</span>
          </div>
          <div className="highlight-item">
            <span className="label">Phone</span>
            <span className="value">{school.contactPhone || "-"}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="school-content-grid">

        {/* Left/Main Column */}
        <div className="main-column">

          {/* Related Quick Links */}
          <div className="quick-links-grid">
            <Link href={`/portal/contacts?school=${school.id}`} className="quick-link-card">
              <div className="icon-wrapper purple">👥</div>
              <span className="link-title">Contacts</span>
              <span className="link-count">(1)</span>
            </Link>

            <Link href={`/portal/assessments?school=${school.id}`} className="quick-link-card">
              <div className="icon-wrapper blue">📖</div>
              <span className="link-title">Literacy Assessments</span>
              <span className="link-count">(0)</span>
            </Link>

            <Link href={`/portal/trainings?school=${school.id}`} className="quick-link-card">
              <div className="icon-wrapper green">📋</div>
              <span className="link-title">Training Sessions</span>
              <span className="link-count">(0)</span>
            </Link>

            <Link href={`/portal/visits?school=${school.id}`} className="quick-link-card">
              <div className="icon-wrapper orange">📍</div>
              <span className="link-title">School Visits</span>
              <span className="link-count">(0)</span>
            </Link>

            <Link href={`/portal/story?school=${school.id}`} className="quick-link-card">
              <div className="icon-wrapper red">📄</div>
              <span className="link-title">MSC Stories</span>
              <span className="link-count">(0)</span>
            </Link>

            <Link href={`/portal/resources?school=${school.id}`} className="quick-link-card">
              <div className="icon-wrapper teal">📚</div>
              <span className="link-title">Resource Engagements</span>
              <span className="link-count">(0)</span>
            </Link>
          </div>

          {/* Tabs */}
          <div className="tabs-container">
            <div className="tabs-header">
              <button
                className={`tab-btn ${activeTab === "details" ? "active" : ""}`}
                onClick={() => setActiveTab("details")}
              >
                Details
              </button>
              <button
                className={`tab-btn ${activeTab === "related" ? "active" : ""}`}
                onClick={() => setActiveTab("related")}
              >
                Related
              </button>
              <button
                className={`tab-btn ${activeTab === "activity" ? "active" : ""}`}
                onClick={() => setActiveTab("activity")}
              >
                Most Recent Activity
              </button>
            </div>

            <div className="tab-content">
              {activeTab === "details" && (
                <div className="details-view">
                  <div className="detail-section">
                    <h3>School Details</h3>
                    <div className="detail-row">
                      <div className="detail-group">
                        <label>Account Name</label>
                        <div className="detail-value">{school.name}</div>
                      </div>
                      <div className="detail-group">
                        <label>Parent Account</label>
                        <div className="detail-value link">Uganda</div>
                      </div>
                    </div>
                    <div className="detail-row">
                      <div className="detail-group">
                        <label>School Record Type</label>
                        <div className="detail-value">School</div>
                      </div>
                      <div className="detail-group">
                        <label>School Status</label>
                        <div className="detail-value">Open</div>
                      </div>
                    </div>
                    <div className="detail-row">
                      <div className="detail-group">
                        <label>School ID</label>
                        <div className="detail-value">{school.schoolCode}</div>
                      </div>
                      <div className="detail-group">
                        <label>School/Edify Relationship Status</label>
                        <div className="detail-value">Partner</div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Address Information</h3>
                    <div className="detail-row">
                      <div className="detail-group">
                        <label>Region</label>
                        <div className="detail-value">
                          {school.notes?.includes("Region:") ? (
                            <Link href={`/portal/regions/${school.notes.split("Region:")[1].split(",")[0].trim()}`} className="link">
                              {school.notes.split("Region:")[1].split(",")[0].trim()}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </div>
                      </div>
                      <div className="detail-group">
                        <label>District</label>
                        <div className="detail-value">
                          <Link href={`/portal/districts/${school.district}`} className="link">
                            {school.district}
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div className="detail-row">
                      <div className="detail-group">
                        <label>Sub-county</label>
                        <div className="detail-value">{school.subCounty}</div>
                      </div>
                      <div className="detail-group">
                        <label>Parish</label>
                        <div className="detail-value">{school.parish}</div>
                      </div>
                    </div>
                    <div className="detail-row">
                      <div className="detail-group">
                        <label>Village</label>
                        <div className="detail-value">{school.village || "-"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Enrollment Information</h3>
                    <div className="detail-row">
                      <div className="detail-group">
                        <label>Enrolled Boys</label>
                        <div className="detail-value">{school.enrolledBoys.toLocaleString()}</div>
                      </div>
                      <div className="detail-group">
                        <label>Enrolled Girls</label>
                        <div className="detail-value">{school.enrolledGirls.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="detail-row">
                      <div className="detail-group">
                        <label>Total Learners</label>
                        <div className="detail-value">{school.enrolledLearners.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "related" && (
                <div className="related-view p-6 text-gray-500">
                  Related lists will appear here.
                </div>
              )}
              {activeTab === "activity" && (
                <div className="activity-view p-6 text-gray-500">
                  Recent timeline activity will appear here.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="sidebar-column">
          <div className="sidebar-card">
            <h3>Knowledge</h3>
            <div className="sidebar-content">
              <input type="text" placeholder="Search Knowledge..." className="sidebar-search" />
              <div className="empty-state">No knowledge articles found.</div>
            </div>
          </div>

          <div className="sidebar-card">
            <h3>Location</h3>
            <div className="sidebar-content map-placeholder">
              {school.gpsLat && school.gpsLng ? (
                <div className="map-coordinates">
                  <div>Lat: {school.gpsLat}</div>
                  <div>Lng: {school.gpsLng}</div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${school.gpsLat},${school.gpsLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="map-link"
                  >
                    View on Google Maps ↗
                  </a>
                </div>
              ) : (
                <div className="no-map">No GPS coordinates available.</div>
              )}
            </div>
          </div>
        </div>

      </div>

      <style jsx>{`
        .school-profile-container {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
          background-color: #f3f4f6;
          min-height: 100vh;
          padding-bottom: 2rem;
        }
        
        /* Header */
        .school-header {
          background-color: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 1rem 1.5rem;
          margin-bottom: 1.5rem;
        }

        .school-header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .breadcrumbs {
          font-size: 0.875rem;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .breadcrumb-link:hover {
          text-decoration: underline;
          color: #1d4ed8;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
        }

        .button-sm {
          padding: 0.4rem 0.8rem;
          font-size: 0.875rem;
        }

        .school-title-section {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .school-icon {
          width: 48px;
          height: 48px;
          background-color: #4f46e5;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .school-avatar {
          color: white;
          font-size: 1.5rem;
          font-weight: bold;
        }

        .school-type {
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

        .school-highlights {
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
        .school-content-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 1.5rem;
          max-width: 1600px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        @media (max-width: 1024px) {
          .school-content-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Quick Links */
        .quick-links-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .quick-link-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          padding: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          color: #374151;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .quick-link-card:hover {
          border-color: #d1d5db;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          color: #1d4ed8;
        }

        .icon-wrapper {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }
        
        .icon-wrapper.purple { background-color: #f3e8ff; color: #9333ea; }
        .icon-wrapper.blue { background-color: #dbeafe; color: #2563eb; }
        .icon-wrapper.green { background-color: #dcfce7; color: #16a34a; }
        .icon-wrapper.orange { background-color: #ffedd5; color: #ea580c; }
        .icon-wrapper.red { background-color: #fee2e2; color: #dc2626; }
        .icon-wrapper.teal { background-color: #ccfbf1; color: #0d9488; }


        .link-title {
          font-size: 0.75rem;
          font-weight: 600;
          flex-grow: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .link-count {
           font-size: 0.75rem;
           color: #9ca3af;
        }

        /* Tabs */
        .tabs-container {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          min-height: 500px;
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
          color: #1d4ed8;
          border-bottom-color: #1d4ed8;
          background-color: white;
          border-top: 2px solid transparent; /* balance */
        }
        
        .details-view {
          padding: 1.5rem;
        }

        .detail-section {
          margin-bottom: 2rem;
          border-bottom: 1px solid #f3f4f6;
          padding-bottom: 1rem;
        }

        .detail-section:last-child {
          border-bottom: none;
        }

        .detail-section h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 1rem;
          margin-top: 0;
        }

        .detail-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 1rem;
        }

        .detail-group {
          display: flex;
          flex-direction: column;
        }
        
        .detail-group label {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.25rem;
        }

        .detail-value {
          font-size: 0.875rem;
          color: #111827;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid transparent;
        }

        .detail-value.link {
            color: #1d4ed8;
            cursor: pointer;
        }
        
        .detail-value.link:hover {
            text-decoration: underline;
        }

        /* Sidebar */
        .sidebar-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .sidebar-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .sidebar-card h3 {
          margin: 0;
          padding: 1rem;
          font-size: 1rem;
          font-weight: 600;
          border-bottom: 1px solid #e5e7eb;
          background-color: #f9fafb;
        }

        .sidebar-content {
          padding: 1rem;
        }
        
        .sidebar-search {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 0.875rem;
        }

        .empty-state {
            font-size: 0.875rem;
            color: #9ca3af;
            text-align: center;
            padding: 2rem 0;
        }
        
        .map-placeholder {
            min-height: 200px;
            background-color: #f0f9ff;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
        }
        
        .map-coordinates {
          text-align: center;
          font-size: 0.875rem;
        }
        
        .map-link {
          display: inline-block;
          margin-top: 0.5rem;
          color: #1d4ed8;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

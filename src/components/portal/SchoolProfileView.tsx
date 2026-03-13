"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  GraduationEligibilityRecord,
  SchoolAccountProfile,
  SchoolSupportStatusRecord,
} from "@/lib/types";
import { GraduationReviewModal } from "./GraduationReviewModal";

type SupervisorOption = {
  id: number;
  fullName: string;
};

interface SchoolProfileViewProps {
  profile: SchoolAccountProfile;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-UG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-UG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString();
}

function formatYesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function mapUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  return value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
}

export function SchoolProfileView({ profile }: SchoolProfileViewProps) {
  const { school, counts, recentTrainings, recentInteractions, summary } = profile;
  const [activeTab, setActiveTab] = useState<"details" | "related" | "trainings" | "interactions">("details");
  const [graduationLoading, setGraduationLoading] = useState(false);
  const [graduationError, setGraduationError] = useState("");
  const [graduationOpen, setGraduationOpen] = useState(false);
  const [graduationEligibility, setGraduationEligibility] = useState<GraduationEligibilityRecord | null>(null);
  const [graduationSupervisors, setGraduationSupervisors] = useState<SupervisorOption[]>([]);
  const [supportStatusLoading, setSupportStatusLoading] = useState(false);
  const [supportStatusError, setSupportStatusError] = useState("");
  const [schoolSupportStatus, setSchoolSupportStatus] = useState<SchoolSupportStatusRecord | null>(null);

  useEffect(() => {
    let active = true;
    setGraduationLoading(true);
    setGraduationError("");

    fetch(`/api/portal/graduation/school/${school.id}`, { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as {
          eligibility?: GraduationEligibilityRecord;
          supervisors?: SupervisorOption[];
          error?: string;
        };
        if (!response.ok || !json.eligibility) {
          throw new Error(json.error ?? "Could not load graduation status.");
        }
        if (!active) {
          return;
        }
        setGraduationEligibility(json.eligibility);
        setGraduationSupervisors(Array.isArray(json.supervisors) ? json.supervisors : []);
      })
      .catch((error) => {
        if (active) {
          setGraduationError(error instanceof Error ? error.message : "Could not load graduation status.");
        }
      })
      .finally(() => {
        if (active) {
          setGraduationLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [school.id]);

  useEffect(() => {
    let active = true;
    setSupportStatusLoading(true);
    setSupportStatusError("");
    fetch(`/api/portal/automation/support-status?type=school&schoolId=${school.id}&limit=1`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const json = (await response.json()) as {
          records?: SchoolSupportStatusRecord[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(json.error ?? "Could not load school support status.");
        }
        if (!active) {
          return;
        }
        const first = Array.isArray(json.records) && json.records.length > 0 ? json.records[0] : null;
        setSchoolSupportStatus(first);
      })
      .catch((error) => {
        if (active) {
          setSupportStatusError(error instanceof Error ? error.message : "Could not load school support status.");
        }
      })
      .finally(() => {
        if (active) {
          setSupportStatusLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [school.id]);

  const detailsLeft = useMemo(
    () => [
      ["Account Name", school.name],
      ["Alternate School Names", school.alternateSchoolNames || "-"],
      ["Account Record Type", school.accountRecordType],
      ["Type", school.schoolType],
      ["School ID", school.schoolCode || String(school.id)],
      ["Primary Contact", school.primaryContactName || school.contactName || "-"],
      ["Country", school.country],
      ["Region", school.region || "-"],
      ["District", school.district],
      ["GPS Coordinates", school.gpsLat && school.gpsLng ? `${school.gpsLat}, ${school.gpsLng}` : "-"],
      ["Year Founded", school.yearFounded ? String(school.yearFounded) : "-"],
      ["Client School Number", String(school.clientSchoolNumber ?? 0)],
      ["First Metric Date", formatDate(school.firstMetricDate)],
      ["Metric Count", formatNumber(school.metricCount)],
      ["Running Total Max Enrollment", formatNumber(school.runningTotalMaxEnrollment)],
      ["Partner Type", school.partnerType || "-"],
      ["School Visits this FY", formatNumber(summary.schoolVisitsThisFy)],
      ["School Visits last FY", formatNumber(summary.schoolVisitsLastFy)],
      ["Date of Last Staff Visit", formatDate(summary.dateOfLastStaffVisit)],
    ],
    [school, summary],
  );

  const detailsRight = useMemo(
    () => [
      ["Parent Account", school.parentAccountLabel],
      ["School Status", school.schoolStatus],
      ["School Status Date", formatDate(school.schoolStatusDate)],
      ["School Relationship Status", school.schoolRelationshipStatus || "-"],
      ["Relationship Status Date", formatDate(school.schoolRelationshipStatusDate)],
      ["School is Active?", formatYesNo(school.schoolActive)],
      ["Current Partner School", formatYesNo(school.currentPartnerSchool)],
      ["Current Partner Type", school.currentPartnerType],
      ["Denomination", school.denomination || "-"],
      ["Protestant Denomination", school.protestantDenomination || "-"],
      ["Phone", school.contactPhone || "-"],
      ["Email", school.contactEmail || "-"],
      ["Website", school.website || "-"],
      ["Last Metrics Date", formatDate(summary.lastMetricsDate)],
      ["Date of Last Activity", formatDate(summary.dateOfLastActivity)],
      ["Description", school.description || school.notes || "-"],
    ],
    [school, summary],
  );

  const openMapsUrl =
    school.gpsLat && school.gpsLng
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${school.gpsLat},${school.gpsLng}`)}`
      : null;

  return (
    <div className="school-crm-page">
      <section className="school-crm-hero">
        <div className="school-crm-hero-main">
          <div className="school-crm-badge">Account</div>
          <h1>{school.name}</h1>
          <div className="school-crm-overview">
            <div>
              <span>Country</span>
              <strong>{school.country}</strong>
            </div>
            <div>
              <span>Region</span>
              <strong>{school.region || "-"}</strong>
            </div>
            <div>
              <span>School Status</span>
              <strong>{school.schoolStatus}</strong>
            </div>
            <div>
              <span>Current Partner Type</span>
              <strong>{school.currentPartnerType}</strong>
            </div>
            <div>
              <span>School Status Date</span>
              <strong>{formatDate(school.schoolStatusDate)}</strong>
            </div>
            <div>
              <span>Year Founded</span>
              <strong>{school.yearFounded ? String(school.yearFounded) : "-"}</strong>
            </div>
          </div>
        </div>
        <div className="school-crm-hero-actions">
          <Link className="school-crm-button school-crm-button-ghost" href="/portal/schools">
            Back to Accounts
          </Link>
          <Link className="school-crm-button" href={`/portal/trainings?new=1&schoolId=${school.id}`}>
            New Training
          </Link>
          <Link className="school-crm-button" href={`/portal/events`}>
            Online Training
          </Link>
          <Link className="school-crm-button" href={`/portal/visits?new=1&schoolId=${school.id}`}>
            New Visit
          </Link>
          <Link className="school-crm-button" href={`/portal/assessments?new=1&schoolId=${school.id}`}>
            New Assessment
          </Link>
        </div>
      </section>

      <section className="school-crm-notice">
        <strong>School account is active.</strong>
        <span>
          Profile-linked records for trainings, online trainings, visits, assessments, and teacher
          evaluations are available from the related sections below.
        </span>
      </section>

      {graduationEligibility?.isEligible ? (
        <section className="school-crm-banner school-crm-banner-accent">
          <div>
            <h3>Graduation Eligible</h3>
            <p>
              This school meets the configured graduation criteria. Review the evidence before final
              confirmation.
            </p>
            <p className="school-crm-muted">
              {graduationEligibility.eligibilityScorecard.readingSampleSize.toLocaleString()} assessed learners •{" "}
              {graduationEligibility.eligibilityScorecard.teachingEvaluationsCount.toLocaleString()} teacher
              evaluations • {graduationEligibility.eligibilityScorecard.publishedStoryCount.toLocaleString()}{" "}
              published stories
            </p>
          </div>
          <div className="school-crm-banner-actions">
            <button className="school-crm-button" onClick={() => setGraduationOpen(true)}>
              Review Graduation
            </button>
            <Link href="/portal/graduation-queue" className="school-crm-button school-crm-button-ghost">
              Open Queue
            </Link>
          </div>
        </section>
      ) : null}
      {graduationLoading ? <p className="school-crm-muted">Checking graduation eligibility…</p> : null}
      {!graduationLoading && graduationError ? <p className="school-crm-muted">{graduationError}</p> : null}

      <div className="school-crm-layout">
        <div className="school-crm-main">
          <section className="school-crm-card">
            <div className="school-crm-card-header">
              <h2>Related List Quick Links</h2>
            </div>
            <div className="school-crm-links-grid">
              <Link className="school-crm-link-card" href="/portal/contacts">
                <span className="school-crm-link-title">Contacts</span>
                <strong>{counts.contacts}</strong>
              </Link>
              <Link className="school-crm-link-card" href="/portal/trainings">
                <span className="school-crm-link-title">Trainings</span>
                <strong>{counts.trainings}</strong>
              </Link>
              <Link className="school-crm-link-card" href="/portal/events">
                <span className="school-crm-link-title">Online Trainings</span>
                <strong>{counts.onlineTrainings}</strong>
              </Link>
              <Link className="school-crm-link-card" href="/portal/visits">
                <span className="school-crm-link-title">School Visits</span>
                <strong>{counts.visits}</strong>
              </Link>
              <Link className="school-crm-link-card" href="/portal/assessments">
                <span className="school-crm-link-title">Assessments</span>
                <strong>{counts.assessments}</strong>
              </Link>
              <button className="school-crm-link-card" type="button" onClick={() => setActiveTab("interactions")}>
                <span className="school-crm-link-title">Teacher Evaluations</span>
                <strong>{counts.teacherEvaluations}</strong>
              </button>
            </div>
          </section>

          <section className="school-crm-card">
            <div className="school-crm-tabs">
              <button
                className={activeTab === "details" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveTab("details")}
              >
                Details
              </button>
              <button
                className={activeTab === "related" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveTab("related")}
              >
                Related
              </button>
              <button
                className={activeTab === "trainings" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveTab("trainings")}
              >
                Most Recent Trainings
              </button>
              <button
                className={activeTab === "interactions" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveTab("interactions")}
              >
                Most Recent Interactions
              </button>
            </div>

            {activeTab === "details" ? (
              <div className="school-crm-details-grid">
                <div className="school-crm-details-column">
                  {detailsLeft.map(([label, value]) => (
                    <div key={label} className="school-crm-detail-row">
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                <div className="school-crm-details-column">
                  {detailsRight.map(([label, value]) => (
                    <div key={label} className="school-crm-detail-row">
                      <span>{label}</span>
                      {label === "Website" && school.website ? (
                        <a href={mapUrl(school.website) ?? "#"} target="_blank" rel="noreferrer">
                          {value}
                        </a>
                      ) : label === "Email" && school.contactEmail ? (
                        <a href={`mailto:${school.contactEmail}`}>{value}</a>
                      ) : (
                        <strong>{value}</strong>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === "related" ? (
              <div className="school-crm-related-grid">
                <article id="school-contacts" className="school-crm-related-card">
                  <h3>Contacts</h3>
                  <p>{counts.contacts} contacts linked to this school account.</p>
                  <strong>
                    {school.primaryContactName || school.contactName || "No primary contact linked yet"}
                  </strong>
                </article>
                <article className="school-crm-related-card">
                  <h3>Trainings</h3>
                  <p>{counts.trainings} historical training records linked to this school.</p>
                  <Link href="/portal/trainings">Open trainings workspace</Link>
                </article>
                <article className="school-crm-related-card">
                  <h3>Online Trainings</h3>
                  <p>{counts.onlineTrainings} scheduled or completed online sessions linked to this school.</p>
                  <Link href="/portal/events">Open online trainings</Link>
                </article>
                <article className="school-crm-related-card">
                  <h3>Visits</h3>
                  <p>{counts.visits} school visits recorded for this school profile.</p>
                  <Link href="/portal/visits">Open visits workspace</Link>
                </article>
                <article className="school-crm-related-card">
                  <h3>Assessments</h3>
                  <p>{counts.assessments} assessment sessions linked to this school.</p>
                  <Link href="/portal/assessments">Open assessments workspace</Link>
                </article>
                <article className="school-crm-related-card">
                  <h3>Teacher Evaluations</h3>
                  <p>{counts.teacherEvaluations} lesson evaluation records linked to this school.</p>
                  <button type="button" onClick={() => setActiveTab("interactions")}>
                    Review teacher evaluation activity
                  </button>
                </article>
              </div>
            ) : null}

            {activeTab === "trainings" ? (
              <div className="school-crm-list">
                {recentTrainings.length === 0 ? (
                  <p className="school-crm-empty">No training activity has been linked to this school yet.</p>
                ) : (
                  recentTrainings.map((item) => (
                    <Link key={`${item.module}-${item.id}`} href={item.href} className="school-crm-list-row">
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.subtitle || item.module}</span>
                      </div>
                      <div className="school-crm-list-meta">
                        <span>{formatDateTime(item.date)}</span>
                        <span>{item.status || "-"}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            ) : null}

            {activeTab === "interactions" ? (
              <div id="recent-interactions" className="school-crm-list">
                {recentInteractions.length === 0 ? (
                  <p className="school-crm-empty">No recent interactions have been linked to this school yet.</p>
                ) : (
                  recentInteractions.map((item) => (
                    <Link key={`${item.module}-${item.id}`} href={item.href} className="school-crm-list-row">
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.subtitle || item.module}</span>
                      </div>
                      <div className="school-crm-list-meta">
                        <span>{formatDateTime(item.date)}</span>
                        <span>{item.status || "-"}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="school-crm-side">
          <section className="school-crm-card">
            <div className="school-crm-card-header">
              <h2>Knowledge</h2>
            </div>
            <div className="school-crm-search-box">
              <input placeholder="Search school knowledge..." readOnly value="" />
            </div>
          </section>

          <section className="school-crm-card">
            <div className="school-crm-card-header">
              <h2>Map</h2>
            </div>
            <div className="school-crm-map">
              {school.gpsLat && school.gpsLng ? (
                <>
                  <strong>{school.gpsLat}, {school.gpsLng}</strong>
                  {openMapsUrl ? (
                    <a href={openMapsUrl} target="_blank" rel="noreferrer">
                      Open in Google Maps
                    </a>
                  ) : null}
                </>
              ) : (
                <span>GPS coordinates have not been logged for this school.</span>
              )}
            </div>
          </section>

          <section className="school-crm-card">
            <div className="school-crm-card-header">
              <h2>Activity</h2>
            </div>
            <div className="school-crm-side-stack">
              <div>
                <span>Last activity</span>
                <strong>{formatDate(summary.dateOfLastActivity)}</strong>
              </div>
              <div>
                <span>Visits this FY</span>
                <strong>{formatNumber(summary.schoolVisitsThisFy)}</strong>
              </div>
              <div>
                <span>Visits last FY</span>
                <strong>{formatNumber(summary.schoolVisitsLastFy)}</strong>
              </div>
              <div>
                <span>Support status</span>
                <strong>
                  {supportStatusLoading
                    ? "Computing..."
                    : schoolSupportStatus?.status || "No snapshot"}
                </strong>
              </div>
              {supportStatusError ? <p className="school-crm-muted">{supportStatusError}</p> : null}
            </div>
          </section>
        </aside>
      </div>

      <GraduationReviewModal
        open={graduationOpen}
        onClose={() => setGraduationOpen(false)}
        eligibility={graduationEligibility}
        supervisors={graduationSupervisors}
      />

      <style jsx>{`
        .school-crm-page {
          display: grid;
          gap: 1rem;
        }

        .school-crm-hero,
        .school-crm-notice,
        .school-crm-card,
        .school-crm-banner {
          background: #f8f8f8;
          border: 1px solid #d1d5db;
          border-radius: 0.65rem;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
        }

        .school-crm-hero {
          align-items: start;
          display: grid;
          gap: 1rem;
          grid-template-columns: minmax(0, 1fr) auto;
          padding: 1.2rem;
        }

        .school-crm-badge {
          color: #4b5563;
          font-size: 0.85rem;
          margin-bottom: 0.2rem;
        }

        .school-crm-hero h1 {
          font-size: clamp(1.6rem, 2.3vw, 2.3rem);
          line-height: 1.1;
          margin: 0 0 1rem;
        }

        .school-crm-overview {
          display: grid;
          gap: 0.9rem;
          grid-template-columns: repeat(6, minmax(0, 1fr));
        }

        .school-crm-overview div {
          display: grid;
          gap: 0.18rem;
        }

        .school-crm-overview span,
        .school-crm-side-stack span,
        .school-crm-detail-row span,
        .school-crm-list-row span,
        .school-crm-link-title {
          color: #4b5563;
          font-size: 0.85rem;
        }

        .school-crm-overview strong,
        .school-crm-side-stack strong {
          color: #111827;
          font-size: 1.05rem;
        }

        .school-crm-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
          justify-content: flex-end;
        }

        .school-crm-button {
          align-items: center;
          background: #14532d;
          border: 1px solid #14532d;
          border-radius: 0.5rem;
          color: #ffffff;
          display: inline-flex;
          font-size: 0.88rem;
          font-weight: 600;
          justify-content: center;
          min-height: 42px;
          padding: 0.65rem 0.9rem;
          text-decoration: none;
        }

        .school-crm-button-ghost {
          background: #ffffff;
          color: #14532d;
        }

        .school-crm-notice {
          align-items: center;
          display: flex;
          gap: 0.8rem;
          padding: 1rem 1.1rem;
        }

        .school-crm-notice strong {
          color: #111827;
          flex: 0 0 auto;
        }

        .school-crm-notice span,
        .school-crm-muted,
        .school-crm-empty {
          color: #4b5563;
          font-size: 0.9rem;
        }

        .school-crm-banner {
          align-items: start;
          display: flex;
          gap: 1rem;
          justify-content: space-between;
          padding: 1rem 1.1rem;
        }

        .school-crm-banner h3 {
          margin: 0 0 0.25rem;
        }

        .school-crm-banner p {
          margin: 0.15rem 0;
        }

        .school-crm-banner-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .school-crm-layout {
          display: grid;
          gap: 1rem;
          grid-template-columns: minmax(0, 2.1fr) minmax(320px, 0.95fr);
        }

        .school-crm-main,
        .school-crm-side {
          display: grid;
          gap: 1rem;
        }

        .school-crm-card-header {
          align-items: center;
          border-bottom: 1px solid #d1d5db;
          display: flex;
          justify-content: space-between;
          padding: 1rem 1rem 0.9rem;
        }

        .school-crm-card-header h2 {
          font-size: 1.05rem;
          margin: 0;
        }

        .school-crm-links-grid {
          display: grid;
          gap: 0.8rem;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          padding: 1rem;
        }

        .school-crm-link-card {
          align-items: start;
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          color: #0f172a;
          cursor: pointer;
          display: grid;
          gap: 0.4rem;
          min-height: 92px;
          padding: 0.85rem;
          text-align: left;
          text-decoration: none;
        }

        .school-crm-link-card strong {
          color: #14532d;
          font-size: 1.3rem;
        }

        .school-crm-tabs {
          border-bottom: 1px solid #d1d5db;
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          padding: 0 1rem;
        }

        .school-crm-tabs button {
          background: transparent;
          border: 0;
          border-bottom: 2px solid transparent;
          color: #374151;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          padding: 1rem 0.85rem 0.9rem;
        }

        .school-crm-tabs button.is-active {
          border-bottom-color: #2563eb;
          color: #111827;
        }

        .school-crm-details-grid {
          display: grid;
          gap: 1.5rem;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          padding: 1rem;
        }

        .school-crm-details-column {
          display: grid;
        }

        .school-crm-detail-row {
          border-bottom: 1px solid #d1d5db;
          display: grid;
          gap: 0.28rem;
          padding: 0.85rem 0;
        }

        .school-crm-detail-row strong,
        .school-crm-detail-row a {
          color: #111827;
          font-size: 1rem;
          text-decoration: none;
          word-break: break-word;
        }

        .school-crm-detail-row a:hover {
          color: #2563eb;
        }

        .school-crm-related-grid {
          display: grid;
          gap: 0.85rem;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          padding: 1rem;
        }

        .school-crm-related-card {
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          display: grid;
          gap: 0.35rem;
          padding: 0.9rem;
        }

        .school-crm-related-card h3 {
          margin: 0;
        }

        .school-crm-related-card p {
          color: #4b5563;
          font-size: 0.9rem;
          margin: 0;
        }

        .school-crm-related-card a,
        .school-crm-related-card button {
          background: transparent;
          border: 0;
          color: #2563eb;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 600;
          padding: 0;
          text-align: left;
          text-decoration: none;
        }

        .school-crm-list {
          display: grid;
          gap: 0.75rem;
          padding: 1rem;
        }

        .school-crm-list-row {
          align-items: center;
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          color: inherit;
          display: grid;
          gap: 0.5rem;
          grid-template-columns: minmax(0, 1fr) auto;
          padding: 0.85rem 0.95rem;
          text-decoration: none;
        }

        .school-crm-list-row strong {
          color: #111827;
          display: block;
          margin-bottom: 0.2rem;
        }

        .school-crm-list-meta {
          display: grid;
          gap: 0.2rem;
          justify-items: end;
          min-width: 120px;
        }

        .school-crm-search-box,
        .school-crm-side-stack,
        .school-crm-map {
          padding: 1rem;
        }

        .school-crm-search-box input {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          min-height: 46px;
          padding: 0 0.85rem;
          width: 100%;
        }

        .school-crm-map {
          align-items: center;
          background: #d9f2ff;
          display: grid;
          justify-items: center;
          min-height: 220px;
          text-align: center;
        }

        .school-crm-map a {
          color: #14532d;
          font-weight: 700;
          text-decoration: none;
        }

        .school-crm-side-stack {
          display: grid;
          gap: 0.85rem;
        }

        .school-crm-side-stack div {
          display: grid;
          gap: 0.2rem;
        }

        @media (max-width: 1200px) {
          .school-crm-hero,
          .school-crm-layout {
            grid-template-columns: 1fr;
          }

          .school-crm-overview,
          .school-crm-links-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .school-crm-overview,
          .school-crm-links-grid,
          .school-crm-details-grid,
          .school-crm-related-grid {
            grid-template-columns: 1fr;
          }

          .school-crm-list-row {
            grid-template-columns: 1fr;
          }

          .school-crm-list-meta {
            justify-items: start;
          }
        }
      `}</style>
    </div>
  );
}

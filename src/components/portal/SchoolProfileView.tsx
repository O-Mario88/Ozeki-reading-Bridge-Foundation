"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  GraduationEligibilityRecord,
  SchoolAccountProfile,
  SchoolSupportStatusRecord,
} from "@/lib/types";
import { EnrollmentFormModal } from "./EnrollmentFormModal";
import { LiteracyImpactFormModal } from "./LiteracyImpactFormModal";
import type { SchoolEnrollmentRecord, SchoolLiteracyImpactRecord } from "@/lib/types";
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


export function SchoolProfileView({ profile }: SchoolProfileViewProps) {
  const { school, counts, recentTrainings, recentInteractions, summary, progress } = profile;
  const [activeTab, setActiveTab] = useState<"details" | "metrics" | "contacts" | "related" | "trainings" | "interactions">("details");
  const [graduationLoading, setGraduationLoading] = useState(false);
  const [graduationError, setGraduationError] = useState("");
  const [graduationOpen, setGraduationOpen] = useState(false);
  const [enrollmentOpen, setEnrollmentOpen] = useState(false);
  const [literacyImpactOpen, setLiteracyImpactOpen] = useState(false);

  const [enrollments, setEnrollments] = useState<SchoolEnrollmentRecord[]>([]);
  const [literacyImpacts, setLiteracyImpacts] = useState<SchoolLiteracyImpactRecord[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
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

  function fetchMetricsHistory() {
    setMetricsLoading(true);
    Promise.all([
      fetch(`/api/portal/schools/${school.id}/enrollments`).then((r) => r.json()),
      fetch(`/api/portal/schools/${school.id}/literacy-impacts`).then((r) => r.json()),
    ])
      .then(([enrollmentData, impactData]) => {
        if (enrollmentData.items) setEnrollments(enrollmentData.items);
        if (impactData.items) setLiteracyImpacts(impactData.items);
      })
      .catch((err) => console.error("Failed to load metrics history:", err))
      .finally(() => setMetricsLoading(false));
  }

  useEffect(() => {
    fetchMetricsHistory();
  }, [school.id]);

  const detailsLeft = useMemo(
    () => [
      ["Account Name", school.name],
      ["Alternate School Names", school.alternateSchoolNames || "-"],
      ["School ID", school.schoolCode || String(school.id)],
      ["Primary Contact", school.primaryContactName || school.contactName || "-"],
      ["Country", school.country],
      ["Region", school.region || "-"],
      ["District", school.district],
      ["Year Founded", school.yearFounded ? String(school.yearFounded) : "-"],
      [
        "Classes Offered",
        (() => {
          try {
            const parsed = JSON.parse(school.classesJson || "[]");
            return Array.isArray(parsed) && parsed.length > 0 ? parsed.join(", ") : "-";
          } catch {
            return "-";
          }
        })(),
      ],
      ["Client School Number", String(school.clientSchoolNumber ?? 0)],
      ["Metric Count", formatNumber(school.metricCount)],
      ["Running Total Max Enrollment", formatNumber(school.runningTotalMaxEnrollment)],
      ["School Visits this FY", formatNumber(summary.schoolVisitsThisFy)],
      ["School Visits last FY", formatNumber(summary.schoolVisitsLastFy)],
      ["Date of Last Staff Visit", formatDate(summary.dateOfLastStaffVisit)],
    ],
    [school, summary],
  );

  const detailsRight = useMemo(
    () => [
      ["School Status", school.schoolStatus],
      ["School Status Date", formatDate(school.schoolStatusDate)],
      ["School is Active?", formatYesNo(school.schoolActive)],
      ["Current Partner School", formatYesNo(school.currentPartnerSchool)],
      ["Current Partner Type", school.currentPartnerType],
      ["Phone", school.contactPhone || "-"],
      ["Email", school.contactEmail || "-"],
      ["Last Metrics Date", formatDate(summary.lastMetricsDate)],
      ["Date of Last Activity", formatDate(summary.dateOfLastActivity)],
    ],
    [school, summary],
  );

  return (
    <div className="ds-metric-grid" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)" }}>
      <section className="ds-card ds-card-flat" style={{ gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "flex-start", justifyItems: "space-between" }}>
        <div className="ds-hero-main" style={{ flex: 1 }}>
          <div className="ds-badge ds-badge-default">Account</div>
          <h1>{school.name}</h1>
          <div className="ds-action-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", marginTop: "1rem" }}>
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
          <Link className="button button-ghost" href="/portal/schools">
            Back to Accounts
          </Link>
          <button className="button" onClick={() => setEnrollmentOpen(true)}>
            New Enrollment
          </button>
          <button className="button" onClick={() => setLiteracyImpactOpen(true)}>
            New Literacy Impact
          </button>
          <Link className="button" href={`/portal/trainings?new=1&schoolId=${school.id}`}>
            New Training
          </Link>
          <Link className="button" href={`/portal/events`}>
            Online Training
          </Link>
          <Link className="button" href={`/portal/visits?new=1&schoolId=${school.id}`}>
            New Visit
          </Link>
          <Link className="button" href={`/portal/assessments?new=1&schoolId=${school.id}`}>
            New Assessment
          </Link>
        </div>
      </section>

      <section className="ds-alert-banner" style={{ gridColumn: "1 / -1", padding: "1rem" }}>
        <strong>School account is active.</strong>
        <span>
          Profile-linked records for trainings, online trainings, visits, assessments, and teacher
          evaluations are available from the related sections below.
        </span>
      </section>

      {graduationEligibility?.isEligible ? (
        <section className="ds-alert-banner" style={{ gridColumn: "1 / -1", background: "var(--ds-accent-blue)", color: "white" }}>
          <div>
            <h3>Graduation Eligible</h3>
            <p>
              This school meets the configured graduation criteria. Review the evidence before final
              confirmation.
            </p>
            <p className="ds-text-secondary">
              {graduationEligibility.eligibilityScorecard.readingSampleSize.toLocaleString()} assessed learners •{" "}
              {graduationEligibility.eligibilityScorecard.teachingEvaluationsCount.toLocaleString()} teacher
              evaluations • {graduationEligibility.eligibilityScorecard.publishedStoryCount.toLocaleString()}{" "}
              published stories
            </p>
          </div>
          <div className="school-crm-banner-actions">
            <button className="button" onClick={() => setGraduationOpen(true)}>
              Review Graduation
            </button>
            <Link href="/portal/graduation-queue" className="button button-ghost">
              Open Queue
            </Link>
          </div>
        </section>
      ) : null}
      {graduationLoading ? <p className="ds-text-secondary">Checking graduation eligibility…</p> : null}
      {!graduationLoading && graduationError ? <p className="ds-text-secondary">{graduationError}</p> : null}

      <div className="school-crm-layout">
        <div className="school-crm-main">
          <section className="ds-card">
            <div className="ds-card-header">
              <h2>Related List Quick Links</h2>
            </div>
            <div className="ds-action-grid" style={{ padding: "1rem" }}>
              <Link className="ds-card ds-card-flat" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem", textDecoration: "none" }} href="/portal/contacts">
                <span className="school-crm-link-title">Contacts</span>
                <strong>{counts.contacts}</strong>
              </Link>
              <Link className="ds-card ds-card-flat" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem", textDecoration: "none" }} href="/portal/trainings">
                <span className="school-crm-link-title">Trainings</span>
                <strong>{counts.trainings}</strong>
              </Link>
              <Link className="ds-card ds-card-flat" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem", textDecoration: "none" }} href="/portal/events">
                <span className="school-crm-link-title">Online Trainings</span>
                <strong>{counts.onlineTrainings}</strong>
              </Link>
              <Link className="ds-card ds-card-flat" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem", textDecoration: "none" }} href="/portal/visits">
                <span className="school-crm-link-title">School Visits</span>
                <strong>{counts.visits}</strong>
              </Link>
              <Link className="ds-card ds-card-flat" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem", textDecoration: "none" }} href="/portal/assessments">
                <span className="school-crm-link-title">Assessments</span>
                <strong>{counts.assessments}</strong>
              </Link>
              <button className="ds-card ds-card-flat" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem", textDecoration: "none" }} type="button" onClick={() => setActiveTab("interactions")}>
                <span className="school-crm-link-title">Teacher Evaluations</span>
                <strong>{counts.teacherEvaluations}</strong>
              </button>
            </div>
          </section>

          <section className="ds-card">
            <div className="ds-tabs" style={{ display: "flex", gap: "1rem", borderBottom: "1px solid #d1d5db", padding: "0 1rem" }}>
              <button
                className={activeTab === "details" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveTab("details")}
              >
                Details
              </button>
              <button
                className={activeTab === "metrics" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveTab("metrics")}
              >
                Metrics History
              </button>
              <button
                className={activeTab === "contacts" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveTab("contacts")}
              >
                Contacts
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
              <div className="ds-action-grid" style={{ padding: "1rem" }}>
                <div className="school-crm-details-column">
                  {detailsLeft.map(([label, value]) => (
                    <div key={label} className="ds-detail-row" style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px dashed #e5e7eb" }}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                <div className="school-crm-details-column">
                  {detailsRight.map(([label, value]) => (
                    <div key={label} className="ds-detail-row" style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px dashed #e5e7eb" }}>
                      <span>{label}</span>
                      {label === "Email" && school.contactEmail ? (
                        <a href={`mailto:${school.contactEmail}`}>{value}</a>
                      ) : (
                        <strong>{value}</strong>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === "metrics" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "2rem", padding: "1.5rem" }}>
                <div>
                  <h3 style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "0.5rem", marginBottom: "1rem" }}>Enrollment History</h3>
                  {metricsLoading ? (
                    <p className="ds-text-secondary">Loading enrollment history...</p>
                  ) : enrollments.length === 0 ? (
                    <p className="ds-text-muted">No historical general enrollment snapshot records found.</p>
                  ) : (
                    <table className="portal-table full-width">
                      <thead>
                        <tr>
                          <th>Date Recorded</th>
                          <th>Total Enrollment</th>
                          <th>Boys</th>
                          <th>Girls</th>
                          <th>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map((env) => (
                          <tr key={env.id}>
                            <td>{formatDateTime(env.createdAt)}</td>
                            <td><strong>{formatNumber(env.totalEnrollment)}</strong></td>
                            <td>{formatNumber(env.boysCount)}</td>
                            <td>{formatNumber(env.girlsCount)}</td>
                            <td>{env.updatedFrom}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div>
                  <h3 style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "0.5rem", marginBottom: "1rem" }}>Literacy Impact History</h3>
                  {metricsLoading ? (
                    <p className="ds-text-secondary">Loading literacy impact history...</p>
                  ) : literacyImpacts.length === 0 ? (
                    <p className="ds-text-muted">No literacy impact snapshots have been verified yet.</p>
                  ) : (
                    <table className="portal-table full-width">
                      <thead>
                        <tr>
                          <th>Date Recorded</th>
                          <th>Total Impacted</th>
                          <th>Baby</th>
                          <th>Middle</th>
                          <th>Top</th>
                          <th>P1</th>
                          <th>P2</th>
                          <th>P3</th>
                        </tr>
                      </thead>
                      <tbody>
                        {literacyImpacts.map((imp) => (
                          <tr key={imp.id}>
                            <td>{formatDateTime(imp.createdAt)}</td>
                            <td><strong>{formatNumber(imp.totalImpacted)}</strong></td>
                            <td>{formatNumber(imp.babyClassImpacted)}</td>
                            <td>{formatNumber(imp.middleClassImpacted)}</td>
                            <td>{formatNumber(imp.topClassImpacted)}</td>
                            <td>{formatNumber(imp.p1Impacted)}</td>
                            <td>{formatNumber(imp.p2Impacted)}</td>
                            <td>{formatNumber(imp.p3Impacted)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : null}

            {activeTab === "contacts" ? (
              <div className="ds-list" style={{ display: "flex", flexDirection: "column" }}>
                {profile.contacts.length === 0 ? (
                  <p className="ds-text-muted" style={{ padding: "2rem", textAlign: "center" }}>No contacts have been linked to this school yet.</p>
                ) : (
                  profile.contacts.map((contact) => (
                    <div key={contact.contactId} className="ds-list-row" style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", borderBottom: "1px solid #f3f4f6", textDecoration: "none", alignItems: "start" }}>
                      <div>
                        <strong>{contact.fullName}</strong>
                        <span>{contact.roleTitle || contact.category} {contact.isPrimaryContact ? " (Primary)" : ""}</span>
                      </div>
                      <div className="school-crm-list-meta" style={{ textAlign: "right" }}>
                        <span>{contact.phone || "No phone"}</span>
                        <span>{contact.email || "No email"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {activeTab === "related" ? (
              <div className="ds-action-grid" style={{ padding: "1rem" }}>
                <article id="school-contacts" className="ds-card ds-card-flat" style={{ padding: "1rem" }}>
                  <h3>Contacts</h3>
                  <p>{counts.contacts} contacts linked to this school account.</p>
                  <button type="button" onClick={() => setActiveTab("contacts")}>
                    View {counts.contacts} contacts
                  </button>
                </article>
                <article className="ds-card ds-card-flat" style={{ padding: "1rem" }}>
                  <h3>Trainings</h3>
                  <p>{counts.trainings} historical training records linked to this school.</p>
                  <Link href="/portal/trainings">Open trainings workspace</Link>
                </article>
                <article className="ds-card ds-card-flat" style={{ padding: "1rem" }}>
                  <h3>Online Trainings</h3>
                  <p>{counts.onlineTrainings} scheduled or completed online sessions linked to this school.</p>
                  <Link href="/portal/events">Open online trainings</Link>
                </article>
                <article className="ds-card ds-card-flat" style={{ padding: "1rem" }}>
                  <h3>Visits</h3>
                  <p>{counts.visits} school visits recorded for this school profile.</p>
                  <Link href="/portal/visits">Open visits workspace</Link>
                </article>
                <article className="ds-card ds-card-flat" style={{ padding: "1rem" }}>
                  <h3>Assessments</h3>
                  <p>{counts.assessments} assessment sessions linked to this school.</p>
                  <Link href="/portal/assessments">Open assessments workspace</Link>
                </article>
                <article className="ds-card ds-card-flat" style={{ padding: "1rem" }}>
                  <h3>Teacher Evaluations</h3>
                  <p>{counts.teacherEvaluations} lesson evaluation records linked to this school.</p>
                  <button type="button" onClick={() => setActiveTab("interactions")}>
                    Review teacher evaluation activity
                  </button>
                </article>
              </div>
            ) : null}

            {activeTab === "trainings" ? (
              <div className="ds-list" style={{ display: "flex", flexDirection: "column" }}>
                {recentTrainings.length === 0 ? (
                  <p className="ds-text-muted" style={{ padding: "2rem", textAlign: "center" }}>No training activity has been linked to this school yet.</p>
                ) : (
                  recentTrainings.map((item) => (
                    <Link key={`${item.module}-${item.id}`} href={item.href} target="_blank" className="ds-list-row" style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", borderBottom: "1px solid #f3f4f6", textDecoration: "none" }}>
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
              <div id="recent-interactions" className="ds-list" style={{ display: "flex", flexDirection: "column" }}>
                {recentInteractions.length === 0 ? (
                  <p className="ds-text-muted" style={{ padding: "2rem", textAlign: "center" }}>No recent interactions have been linked to this school yet.</p>
                ) : (
                  recentInteractions.map((item) => (
                    <Link key={`${item.module}-${item.id}`} href={item.href} target="_blank" className="ds-list-row" style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", borderBottom: "1px solid #f3f4f6", textDecoration: "none" }}>
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
          <section className="ds-card">
            <div className="ds-card-header">
              <h2>Knowledge</h2>
            </div>
            <div className="school-crm-search-box">
              <input placeholder="Search school knowledge..." readOnly value="" />
            </div>
          </section>

          <section className="ds-card">
            <div className="ds-card-header">
              <h2>Activity</h2>
            </div>
            <div className="ds-side-stack" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem" }}>
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
              {supportStatusError ? <p className="ds-text-secondary">{supportStatusError}</p> : null}
            </div>
          </section>

          <section className="ds-card">
            <div className="ds-card-header">
              <h2>Literacy Progress</h2>
            </div>
            <div className="ds-side-stack" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem" }}>
              <div>
                <span>Learners Assessed</span>
                <strong>{formatNumber(progress?.learnersAssessed)}</strong>
              </div>
              <div>
                <span>Story Reading Avg</span>
                <strong>{progress?.storyReadingAvg ?? "Data not available"}</strong>
              </div>
              <div>
                <span>Comprehension Avg</span>
                <strong>{progress?.comprehensionAvg ?? "Data not available"}</strong>
              </div>
              <div>
                <span>At / Above Benchmark</span>
                <strong>
                  {progress?.onBenchmarkPct === null || progress?.onBenchmarkPct === undefined
                    ? "Data not available"
                    : `${progress.onBenchmarkPct}%`}
                </strong>
              </div>
              <div>
                <span>Fluent Reader Share</span>
                <strong>
                  {progress?.fluentReaderPct === null || progress?.fluentReaderPct === undefined
                    ? "Data not available"
                    : `${progress.fluentReaderPct}%`}
                </strong>
              </div>
              <div>
                <span>Latest Reading Stage</span>
                <strong>{progress?.latestReadingStage || "Data not available"}</strong>
              </div>
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

      <EnrollmentFormModal
        open={enrollmentOpen}
        onClose={() => setEnrollmentOpen(false)}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        school={school as any}
        onSuccess={() => {
          fetchMetricsHistory();
          window.location.reload();
        }}
      />

      <LiteracyImpactFormModal
        open={literacyImpactOpen}
        onClose={() => setLiteracyImpactOpen(false)}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        school={school as any}
        onSuccess={() => {
          fetchMetricsHistory();
          window.location.reload();
        }}
      />

      
    </div>
  );
}

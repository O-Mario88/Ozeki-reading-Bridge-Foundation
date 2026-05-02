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
import { NewContactModal } from "./NewContactModal";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";
import type { SchoolEnrollmentRecord, SchoolLiteracyImpactRecord } from "@/lib/types";
import { GraduationReviewModal } from "./GraduationReviewModal";
import { ReAuthModal } from "@/components/auth/ReAuthModal";

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
  const [newContactOpen, setNewContactOpen] = useState(false);

  const [enrollments, setEnrollments] = useState<SchoolEnrollmentRecord[]>([]);
  const [literacyImpacts, setLiteracyImpacts] = useState<SchoolLiteracyImpactRecord[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [graduationEligibility, setGraduationEligibility] = useState<GraduationEligibilityRecord | null>(null);
  const [graduationSupervisors, setGraduationSupervisors] = useState<SupervisorOption[]>([]);
  const [supportStatusLoading, setSupportStatusLoading] = useState(false);
  const [supportStatusError, setSupportStatusError] = useState("");
  const [schoolSupportStatus, setSchoolSupportStatus] = useState<SchoolSupportStatusRecord | null>(null);

  // ── Delete school state ──
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDeleteSchool() {
    if (deleteConfirmName.trim().toLowerCase() !== school.name.trim().toLowerCase()) {
      setDeleteError("School name does not match. Please type it exactly to confirm.");
      return;
    }
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/portal/schools/${school.id}`, { method: "DELETE" });
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to delete school.");
      }
      window.location.href = "/portal/schools";
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Deletion failed. Please try again.");
      setDeleteLoading(false);
    }
  }

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

  /* ── stat cards data ── */
  const statCards = [
    { icon: "👤", count: counts.contacts, label: "Contacts", href: "/portal/contacts", tab: null },
    { icon: "🎓", count: counts.trainings, label: "Trainings", href: "/portal/trainings", tab: null },
    { icon: "💻", count: counts.onlineTrainings, label: "Online Trainings", href: "/portal/events", tab: null },
    { icon: "🏫", count: counts.visits, label: "School Visits", href: "/portal/visits", tab: null },
    { icon: "📋", count: counts.assessments, label: "Assessments", href: "/portal/assessments", tab: null },
    { icon: "📝", count: counts.teacherEvaluations, label: "Evaluations", href: null, tab: "interactions" as const },
  ];

  return (
    <div className="school-profile-page">
      {/* ═══════════ HERO / PROFILE SUMMARY ═══════════ */}
      <section className="sp-hero">
        <div className="sp-hero-left">
          <div className="sp-avatar">{school.name.charAt(0)}</div>
          <div className="sp-hero-meta">
            <div className="sp-badge">Account</div>
            <h1>{school.name}</h1>
            <div className="sp-hero-fields">
              <div><span>Country</span><strong>{school.country}</strong></div>
              <div><span>Region</span><strong>{school.region || "-"}</strong></div>
              <div><span>Status</span><strong>{school.schoolStatus}</strong></div>
              <div><span>Partner Type</span><strong>{school.currentPartnerType}</strong></div>
              <div><span>Status Date</span><strong>{formatDate(school.schoolStatusDate)}</strong></div>
              <div><span>Founded</span><strong>{school.yearFounded ? String(school.yearFounded) : "-"}</strong></div>
            </div>
          </div>
        </div>
        <div className="sp-hero-actions">
          <Link className="sp-btn sp-btn--ghost" href="/portal/schools">Back to Accounts</Link>
          <button className="sp-btn" type="button" onClick={() => setNewContactOpen(true)}>New Contact</button>
          <button className="sp-btn" type="button" onClick={() => setEnrollmentOpen(true)}>New Enrollment</button>
          <button className="sp-btn" type="button" onClick={() => setLiteracyImpactOpen(true)}>New Literacy Impact</button>
          <Link className="sp-btn" href={`/portal/trainings?new=1&schoolId=${school.id}`}>New Training</Link>
          <Link className="sp-btn" href={`/portal/events`}>Online Training</Link>
          <Link className="sp-btn" href={`/portal/visits?new=1&schoolId=${school.id}`}>New Visit</Link>
          <Link className="sp-btn" href={`/portal/assessments?new=1&schoolId=${school.id}`}>New Assessment</Link>
          <ReAuthModal
            triggerLabel="Delete School"
            actionName="Delete School"
            triggerClassName="sp-btn sp-btn--danger"
            onVerify={() => { setDeleteConfirmOpen(true); setDeleteConfirmName(""); setDeleteError(""); }}
          />
        </div>
      </section>

      {/* ═══════════ NOTICE ═══════════ */}
      <section className="sp-notice">
        <strong>School account is active.</strong>
        <span>
          Profile-linked records for trainings, online trainings, visits, assessments, and teacher
          evaluations are available from the related sections below.
        </span>
      </section>

      {/* ═══════════ GRADUATION BANNER ═══════════ */}
      {graduationEligibility?.isEligible ? (
        <section className="sp-graduation-banner">
          <div>
            <h3>🎓 Graduation Eligible</h3>
            <p>
              This school meets the configured graduation criteria. Review the evidence before final
              confirmation.
            </p>
            <p className="sp-text-muted">
              {graduationEligibility.eligibilityScorecard.readingSampleSize.toLocaleString()} assessed learners •{" "}
              {graduationEligibility.eligibilityScorecard.teachingEvaluationsCount.toLocaleString()} teacher
              evaluations • {graduationEligibility.eligibilityScorecard.publishedStoryCount.toLocaleString()}{" "}
              published stories
            </p>
          </div>
          <div className="sp-graduation-actions">
            <button className="sp-btn" type="button" onClick={() => setGraduationOpen(true)}>
              Review Graduation
            </button>
            <Link href="/portal/graduation-queue" className="sp-btn sp-btn--ghost">
              Open Queue
            </Link>
          </div>
        </section>
      ) : null}
      {graduationLoading ? <p className="sp-text-muted">Checking graduation eligibility…</p> : null}
      {!graduationLoading && graduationError && !graduationError.toLowerCase().includes("school not found") ? <p className="sp-text-muted">{graduationError}</p> : null}

      {/* ═══════════ STAT COUNTER CARDS ═══════════ */}
      <section className="sp-stats-row">
        {statCards.map((card) => (
          card.href ? (
            <Link key={card.label} href={card.href} className="sp-stat-card">
              <div className="sp-stat-icon">{card.icon}</div>
              <div className="sp-stat-count">{card.count}</div>
              <div className="sp-stat-label">{card.label}</div>
            </Link>
          ) : (
            <button key={card.label} type="button" className="sp-stat-card" onClick={() => card.tab && setActiveTab(card.tab)}>
              <div className="sp-stat-icon">{card.icon}</div>
              <div className="sp-stat-count">{card.count}</div>
              <div className="sp-stat-label">{card.label}</div>
            </button>
          )
        ))}
      </section>

      {/* ═══════════ MAIN + SIDEBAR ═══════════ */}
      <div className="sp-layout">
        <div className="sp-main">
          <section className="sp-card">
            <div className="sp-tabs">
              <button className={activeTab === "details" ? "is-active" : ""} type="button" onClick={() => setActiveTab("details")}>Details</button>
              <button className={activeTab === "metrics" ? "is-active" : ""} type="button" onClick={() => setActiveTab("metrics")}>Metrics History</button>
              <button className={activeTab === "contacts" ? "is-active" : ""} type="button" onClick={() => setActiveTab("contacts")}>Contacts</button>
              <button className={activeTab === "related" ? "is-active" : ""} type="button" onClick={() => setActiveTab("related")}>Related</button>
              <button className={activeTab === "trainings" ? "is-active" : ""} type="button" onClick={() => setActiveTab("trainings")}>Recent Trainings</button>
              <button className={activeTab === "interactions" ? "is-active" : ""} type="button" onClick={() => setActiveTab("interactions")}>Recent Interactions</button>
            </div>

            {/* ── Details Tab ── */}
            {activeTab === "details" ? (
              <div className="sp-details-grid">
                <div className="sp-details-col">
                  {detailsLeft.map(([label, value]) => (
                    <div key={label} className="sp-detail-row">
                      <span>{label}</span>
                      {label === "Email" && school.contactEmail ? (
                        <a href={`mailto:${school.contactEmail}`}>{value}</a>
                      ) : (
                        <strong>{value}</strong>
                      )}
                    </div>
                  ))}
                </div>
                <div className="sp-details-col">
                  {detailsRight.map(([label, value]) => (
                    <div key={label} className="sp-detail-row">
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* ── Metrics Tab ── */}
            {activeTab === "metrics" ? (
              <div className="sp-metrics-wrap">
                <div>
                  <h3 className="sp-section-title">Enrollment History</h3>
                  {metricsLoading ? (
                    <p className="sp-text-muted">Loading enrollment history...</p>
                  ) : enrollments.length === 0 ? (
                    <p className="sp-empty">No historical general enrollment snapshot records found.</p>
                  ) : (
                    <div className="sp-table-wrap">
                      <DashboardListHeader template="160px 140px 90px 90px minmax(0,1fr)">
                        <span>Date Recorded</span>
                        <span>Total Enrollment</span>
                        <span>Boys</span>
                        <span>Girls</span>
                        <span>Source</span>
                      </DashboardListHeader>
                      {enrollments.map((env) => (
                        <DashboardListRow
                          key={env.id}
                          template="160px 140px 90px 90px minmax(0,1fr)"
                        >
                          <span>{formatDateTime(env.createdAt)}</span>
                          <span><strong>{formatNumber(env.totalEnrollment)}</strong></span>
                          <span>{formatNumber(env.boysCount)}</span>
                          <span>{formatNumber(env.girlsCount)}</span>
                          <span className="truncate">{env.updatedFrom}</span>
                        </DashboardListRow>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="sp-section-title">Literacy Impact History</h3>
                  {metricsLoading ? (
                    <p className="sp-text-muted">Loading literacy impact history...</p>
                  ) : literacyImpacts.length === 0 ? (
                    <p className="sp-empty">No literacy impact snapshots have been verified yet.</p>
                  ) : (
                    <div className="sp-table-wrap">
                      <DashboardListHeader template="160px 130px 80px 80px 70px 60px 60px 60px">
                        <span>Date Recorded</span>
                        <span>Total Impacted</span>
                        <span>Baby</span>
                        <span>Middle</span>
                        <span>Top</span>
                        <span>P1</span>
                        <span>P2</span>
                        <span>P3</span>
                      </DashboardListHeader>
                      {literacyImpacts.map((imp) => (
                        <DashboardListRow
                          key={imp.id}
                          template="160px 130px 80px 80px 70px 60px 60px 60px"
                        >
                          <span>{formatDateTime(imp.createdAt)}</span>
                          <span><strong>{formatNumber(imp.totalImpacted)}</strong></span>
                          <span>{formatNumber(imp.babyClassImpacted)}</span>
                          <span>{formatNumber(imp.middleClassImpacted)}</span>
                          <span>{formatNumber(imp.topClassImpacted)}</span>
                          <span>{formatNumber(imp.p1Impacted)}</span>
                          <span>{formatNumber(imp.p2Impacted)}</span>
                          <span>{formatNumber(imp.p3Impacted)}</span>
                        </DashboardListRow>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* ── Contacts Tab ── */}
            {activeTab === "contacts" ? (
              <div className="sp-contacts-list">
                {profile.contacts.length === 0 ? (
                  <p className="sp-empty">No contacts have been linked to this school yet.</p>
                ) : (
                  profile.contacts.map((contact) => (
                    <div key={contact.contactId} className="sp-contact-row">
                      <div>
                        <strong>{contact.fullName}</strong>
                        <span>{contact.roleTitle || contact.category}{contact.isPrimaryContact ? " (Primary)" : ""}</span>
                      </div>
                      <div className="sp-contact-meta">
                        <span>{contact.phone || "No phone"}</span>
                        <span>{contact.email || "No email"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {/* ── Related Tab ── */}
            {activeTab === "related" ? (
              <div className="sp-related-grid">
                <article className="sp-related-card">
                  <h3>Contacts</h3>
                  <p>{counts.contacts} contacts linked to this school account.</p>
                  <button type="button" className="sp-btn sp-btn--sm" onClick={() => setActiveTab("contacts")}>
                    View {counts.contacts} contacts
                  </button>
                </article>
                <article className="sp-related-card">
                  <h3>Trainings</h3>
                  <p>{counts.trainings} historical training records linked to this school.</p>
                  <Link href="/portal/trainings" className="sp-btn sp-btn--sm sp-btn--ghost">Open trainings workspace</Link>
                </article>
                <article className="sp-related-card">
                  <h3>Online Trainings</h3>
                  <p>{counts.onlineTrainings} scheduled or completed online sessions linked to this school.</p>
                  <Link href="/portal/events" className="sp-btn sp-btn--sm sp-btn--ghost">Open online trainings</Link>
                </article>
                <article className="sp-related-card">
                  <h3>Visits</h3>
                  <p>{counts.visits} school visits recorded for this school profile.</p>
                  <Link href="/portal/visits" className="sp-btn sp-btn--sm sp-btn--ghost">Open visits workspace</Link>
                </article>
                <article className="sp-related-card">
                  <h3>Assessments</h3>
                  <p>{counts.assessments} assessment sessions linked to this school.</p>
                  <Link href="/portal/assessments" className="sp-btn sp-btn--sm sp-btn--ghost">Open assessments workspace</Link>
                </article>
                <article className="sp-related-card">
                  <h3>Teacher Evaluations</h3>
                  <p>{counts.teacherEvaluations} lesson evaluation records linked to this school.</p>
                  <button type="button" className="sp-btn sp-btn--sm" onClick={() => setActiveTab("interactions")}>
                    Review teacher evaluation activity
                  </button>
                </article>
              </div>
            ) : null}

            {/* ── Recent Trainings Tab ── */}
            {activeTab === "trainings" ? (
              <div className="sp-activity-list">
                {recentTrainings.length === 0 ? (
                  <p className="sp-empty">No training activity has been linked to this school yet.</p>
                ) : (
                  recentTrainings.map((item) => (
                    <Link key={`${item.module}-${item.id}`} href={item.href} target="_blank" className="sp-activity-item">
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.subtitle || item.module}</span>
                      </div>
                      <div className="sp-activity-meta">
                        <span>{formatDateTime(item.date)}</span>
                        <span>{item.status || "-"}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            ) : null}

            {/* ── Recent Interactions Tab ── */}
            {activeTab === "interactions" ? (
              <div id="recent-interactions" className="sp-activity-list">
                {recentInteractions.length === 0 ? (
                  <p className="sp-empty">No recent interactions have been linked to this school yet.</p>
                ) : (
                  recentInteractions.map((item) => (
                    <Link key={`${item.module}-${item.id}`} href={item.href} target="_blank" className="sp-activity-item">
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.subtitle || item.module}</span>
                      </div>
                      <div className="sp-activity-meta">
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

        {/* ═══════════ SIDEBAR ═══════════ */}
        <aside className="sp-sidebar">
          <section className="sp-card">
            <header><h2>Activity</h2></header>
            <div className="sp-sidebar-list">
              <div className="sp-detail-row"><span>Last activity</span><strong>{formatDate(summary.dateOfLastActivity)}</strong></div>
              <div className="sp-detail-row"><span>Visits this FY</span><strong>{formatNumber(summary.schoolVisitsThisFy)}</strong></div>
              <div className="sp-detail-row"><span>Visits last FY</span><strong>{formatNumber(summary.schoolVisitsLastFy)}</strong></div>
              <div className="sp-detail-row">
                <span>Support status</span>
                <strong>
                  {supportStatusLoading
                    ? "Computing..."
                    : schoolSupportStatus?.status || "No snapshot"}
                </strong>
              </div>
              {supportStatusError ? <p className="sp-text-muted">{supportStatusError}</p> : null}
            </div>
          </section>

          <section className="sp-card">
            <header><h2>Literacy Progress</h2></header>
            <div className="sp-sidebar-list">
              <div className="sp-detail-row"><span>Learners Assessed</span><strong>{formatNumber(progress?.learnersAssessed)}</strong></div>
              <div className="sp-detail-row"><span>Story Reading Avg</span><strong>{progress?.storyReadingAvg ?? "Data not available"}</strong></div>
              <div className="sp-detail-row"><span>Comprehension Avg</span><strong>{progress?.comprehensionAvg ?? "Data not available"}</strong></div>
              <div className="sp-detail-row">
                <span>At / Above Benchmark</span>
                <strong>
                  {progress?.onBenchmarkPct === null || progress?.onBenchmarkPct === undefined
                    ? "Data not available"
                    : `${progress.onBenchmarkPct}%`}
                </strong>
              </div>
              <div className="sp-detail-row">
                <span>Fluent Reader Share</span>
                <strong>
                  {progress?.fluentReaderPct === null || progress?.fluentReaderPct === undefined
                    ? "Data not available"
                    : `${progress.fluentReaderPct}%`}
                </strong>
              </div>
              <div className="sp-detail-row"><span>Latest Reading Stage</span><strong>{progress?.latestReadingStage || "Data not available"}</strong></div>
            </div>
          </section>
        </aside>
      </div>

      {/* ═══════════ DELETE SCHOOL CONFIRM DIALOG ═══════════ */}
      {deleteConfirmOpen ? (
        <div className="sp-delete-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div className="sp-delete-dialog">
            <h2 id="delete-dialog-title">⚠️ Permanently Delete School?</h2>
            <p>
              This action is <strong>irreversible</strong>. It will permanently delete{" "}
              <strong>{school.name}</strong> and all linked contacts, visits, assessments, trainings, and
              evaluations from the database.
            </p>
            <p className="sp-delete-hint">
              To confirm, type the school name exactly: <strong>{school.name}</strong>
            </p>
            <input
              id="delete-school-confirm-input"
              className="sp-delete-input"
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={school.name}
              disabled={deleteLoading}
              autoFocus
            />
            {deleteError ? <p className="sp-delete-error">{deleteError}</p> : null}
            <div className="sp-delete-actions">
              <button
                type="button"
                className="sp-btn sp-btn--ghost"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                id="confirm-delete-school-btn"
                type="button"
                className="sp-btn sp-btn--danger"
                onClick={handleDeleteSchool}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting…" : "Yes, Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ═══════════ MODALS ═══════════ */}
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

      {newContactOpen ? (
        <NewContactModal
          schoolId={school.id}
          schoolName={school.name}
          onClose={() => setNewContactOpen(false)}
          onCreated={() => window.location.reload()}
        />
      ) : null}

      <style jsx>{`
        /* ================================================================
           SCHOOL PROFILE — WARM PREMIUM ERP THEME
           ================================================================ */
        .school-profile-page {
          display: grid;
          gap: 1.25rem;
          font-family: var(--portal-backend-font, 'Inter', -apple-system, sans-serif);
        }

        /* ── HERO ── */
        .sp-hero {
          display: flex;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
          padding: 1.75rem 2rem;
          border: 1px solid rgba(168,162,158,0.2);
          border-radius: 20px;
          background: linear-gradient(180deg, #ffffff 0%, #faf8f5 100%);
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }
        .sp-hero-left {
          display: flex;
          gap: 1.25rem;
          align-items: flex-start;
        }
        .sp-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e8f0de 0%, #d4e4c8 100%);
          color: #3d6b4f;
          font-size: 1.5rem;
          font-weight: 800;
          flex-shrink: 0;
          border: 2px solid rgba(74,124,89,0.15);
        }
        .sp-hero-meta {
          min-width: 0;
        }
        .sp-badge {
          color: #78716c;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 0.25rem;
        }
        .sp-hero h1 {
          margin: 0;
          font-size: 1.85rem;
          line-height: 1.15;
          color: #292524;
          font-weight: 800;
        }
        .sp-hero-fields {
          display: flex;
          flex-wrap: wrap;
          gap: 1.25rem;
          margin-top: 0.85rem;
        }
        .sp-hero-fields span {
          display: block;
          color: #a8a29e;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .sp-hero-fields strong {
          display: block;
          font-size: 0.92rem;
          color: #292524;
          font-weight: 700;
          margin-top: 0.1rem;
        }

        /* ── ACTION BUTTONS ── */
        .sp-hero-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          align-self: flex-start;
        }
        .sp-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          padding: 0.5rem 1rem;
          border-radius: 10px;
          border: 1px solid #4a7c59;
          background: #4a7c59;
          color: #fff;
          font-weight: 700;
          font-size: 0.82rem;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          font-family: inherit;
        }
        .sp-btn:hover {
          background: #3d6b4f;
          border-color: #3d6b4f;
        }
        .sp-btn--ghost {
          background: transparent;
          color: #57534e;
          border-color: rgba(168,162,158,0.35);
        }
        .sp-btn--ghost:hover {
          background: rgba(232,240,222,0.3);
          color: #3d6b4f;
          border-color: #4a7c59;
        }
        .sp-btn--sm {
          min-height: 32px;
          padding: 0.35rem 0.85rem;
          font-size: 0.78rem;
          border-radius: 8px;
        }
        .sp-btn--danger {
          background: #dc2626;
          border-color: #dc2626;
          color: #fff;
        }
        .sp-btn--danger:hover {
          background: #b91c1c;
          border-color: #b91c1c;
        }
        .sp-btn--danger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ── DELETE CONFIRM DIALOG ── */
        .sp-delete-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
        }
        .sp-delete-dialog {
          background: #fff;
          border-radius: 18px;
          padding: 2rem;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 24px 64px rgba(0,0,0,0.18);
          border: 1px solid rgba(220,38,38,0.2);
        }
        .sp-delete-dialog h2 {
          margin: 0 0 0.85rem;
          font-size: 1.25rem;
          font-weight: 800;
          color: #dc2626;
        }
        .sp-delete-dialog p {
          margin: 0 0 0.85rem;
          color: #57534e;
          font-size: 0.92rem;
          line-height: 1.55;
        }
        .sp-delete-hint {
          font-size: 0.88rem !important;
          color: #78716c !important;
        }
        .sp-delete-input {
          width: 100%;
          padding: 0.65rem 0.85rem;
          border: 1.5px solid rgba(220,38,38,0.35);
          border-radius: 10px;
          font-size: 0.92rem;
          font-family: inherit;
          outline: none;
          margin-bottom: 0.75rem;
          background: #fff8f8;
          transition: border-color 0.15s;
          box-sizing: border-box;
        }
        .sp-delete-input:focus {
          border-color: #dc2626;
          background: #fff;
        }
        .sp-delete-error {
          color: #dc2626 !important;
          font-size: 0.85rem !important;
          margin-bottom: 0.75rem !important;
          font-weight: 600;
        }
        .sp-delete-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          margin-top: 0.5rem;
        }

        /* ── NOTICE BAR ── */
        .sp-notice {
          padding: 0.85rem 1.25rem;
          border: 1px solid rgba(168,162,158,0.2);
          border-radius: 14px;
          background: #faf8f5;
          color: #57534e;
          font-size: 0.9rem;
          box-shadow: 0 1px 4px rgba(0,0,0,0.02);
        }
        .sp-notice strong {
          color: #292524;
          margin-right: 0.5rem;
        }

        /* ── GRADUATION ── */
        .sp-graduation-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
          padding: 1.25rem 1.5rem;
          border-radius: 16px;
          background: linear-gradient(135deg, #4a7c59, #3d6b4f);
          color: #fff;
        }
        .sp-graduation-banner h3 {
          margin: 0 0 0.35rem;
          font-size: 1.15rem;
        }
        .sp-graduation-banner p {
          margin: 0.2rem 0 0;
          font-size: 0.9rem;
          opacity: 0.9;
        }
        .sp-graduation-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .sp-graduation-actions .sp-btn {
          background: rgba(255,255,255,0.2);
          border-color: rgba(255,255,255,0.4);
        }
        .sp-graduation-actions .sp-btn:hover {
          background: rgba(255,255,255,0.3);
        }
        .sp-text-muted {
          color: #a8a29e;
          font-size: 0.88rem;
        }

        /* ── STAT COUNTER CARDS ── */
        .sp-stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 0.85rem;
        }
        .sp-stat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
          padding: 1.15rem 0.75rem;
          border: 1px solid rgba(168,162,158,0.18);
          border-radius: 16px;
          background: #ffffff;
          text-decoration: none;
          text-align: center;
          transition: all 0.18s ease;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
          cursor: pointer;
          font-family: inherit;
        }
        .sp-stat-card:hover {
          background: #faf8f5;
          border-color: rgba(74,124,89,0.3);
          box-shadow: 0 4px 16px rgba(74,124,89,0.08);
          transform: translateY(-1px);
        }
        .sp-stat-icon {
          font-size: 1.35rem;
          line-height: 1;
        }
        .sp-stat-count {
          font-size: 1.75rem;
          font-weight: 800;
          color: #292524;
          line-height: 1.1;
        }
        .sp-stat-label {
          color: #78716c;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        /* ── MAIN + SIDEBAR LAYOUT ── */
        .sp-layout {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(280px, 0.9fr);
          gap: 1.25rem;
        }
        .sp-main {
          display: grid;
          gap: 1.25rem;
          align-content: start;
          min-width: 0;
        }
        .sp-sidebar {
          display: grid;
          gap: 1.25rem;
          align-content: start;
          min-width: 0;
        }

        /* ── CARDS ── */
        .sp-card {
          border: 1px solid rgba(168,162,158,0.2);
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
          padding: 1.5rem;
          min-width: 0;
          overflow-wrap: break-word;
        }
        .sp-card header h2 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: #292524;
        }

        /* ── TABS ── */
        .sp-tabs {
          display: flex;
          gap: 0.25rem;
          flex-wrap: wrap;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(168,162,158,0.2);
          margin-bottom: 1rem;
        }
        .sp-tabs button {
          border: 0;
          background: transparent;
          color: #78716c;
          font: inherit;
          font-size: 0.85rem;
          font-weight: 600;
          padding: 0.45rem 0.75rem;
          border-radius: 8px;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .sp-tabs button:hover {
          background: rgba(232,240,222,0.3);
          color: #3d6b4f;
        }
        .sp-tabs button.is-active {
          color: #3d6b4f;
          background: rgba(232,240,222,0.4);
          border-bottom-color: #4a7c59;
        }

        /* ── DETAILS ── */
        .sp-details-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0 2rem;
        }
        .sp-details-col {
          display: grid;
          gap: 0;
          align-content: start;
        }
        .sp-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 1rem;
          padding: 0.6rem 0;
          border-bottom: 1px solid rgba(168,162,158,0.12);
        }
        .sp-detail-row span {
          color: #78716c;
          font-size: 0.88rem;
          flex-shrink: 0;
        }
        .sp-detail-row strong {
          color: #292524;
          font-size: 0.92rem;
          font-weight: 600;
          text-align: right;
        }
        .sp-detail-row :global(a) {
          color: #3d6b4f;
          font-size: 0.92rem;
          font-weight: 600;
          text-decoration: none;
          text-align: right;
        }
        .sp-detail-row :global(a:hover) {
          text-decoration: underline;
        }

        /* ── TABLES ── */
        .sp-section-title {
          font-size: 1rem;
          color: #292524;
          border-bottom: 1px solid rgba(168,162,158,0.2);
          padding-bottom: 0.5rem;
          margin-bottom: 1rem;
        }
        .sp-table-wrap {
          overflow-x: auto;
        }
        .sp-table {
          width: 100%;
          border-collapse: collapse;
        }
        .sp-table th,
        .sp-table td {
          padding: 0.7rem 0.85rem;
          border-bottom: 1px solid rgba(168,162,158,0.12);
          text-align: left;
          vertical-align: top;
        }
        .sp-table th {
          color: #a8a29e;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
          border-bottom-color: rgba(168,162,158,0.25);
        }
        .sp-table td {
          color: #292524;
          font-size: 0.9rem;
        }
        .sp-metrics-wrap {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        /* ── CONTACTS LIST ── */
        .sp-contacts-list {
          display: flex;
          flex-direction: column;
        }
        .sp-contact-row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(168,162,158,0.12);
        }
        .sp-contact-row strong {
          color: #292524;
          font-size: 0.92rem;
          display: block;
        }
        .sp-contact-row > div:first-child span {
          color: #78716c;
          font-size: 0.82rem;
        }
        .sp-contact-meta {
          text-align: right;
        }
        .sp-contact-meta span {
          display: block;
          color: #78716c;
          font-size: 0.82rem;
        }

        /* ── RELATED GRID ── */
        .sp-related-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 0.85rem;
        }
        .sp-related-card {
          padding: 1.15rem;
          border: 1px solid rgba(168,162,158,0.15);
          border-radius: 14px;
          background: #faf8f5;
        }
        .sp-related-card h3 {
          margin: 0 0 0.35rem;
          font-size: 0.95rem;
          color: #292524;
        }
        .sp-related-card p {
          margin: 0 0 0.75rem;
          color: #78716c;
          font-size: 0.85rem;
        }

        /* ── ACTIVITY LIST ── */
        .sp-activity-list {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .sp-activity-item {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.95rem 1.1rem;
          border: 1px solid rgba(168,162,158,0.15);
          border-radius: 14px;
          background: #faf8f5;
          text-decoration: none;
          transition: border-color 0.15s ease;
        }
        .sp-activity-item:hover {
          border-color: rgba(74,124,89,0.25);
        }
        .sp-activity-item strong {
          color: #292524;
          font-size: 0.92rem;
          display: block;
        }
        .sp-activity-item > div:first-child span {
          color: #78716c;
          font-size: 0.82rem;
        }
        .sp-activity-meta {
          text-align: right;
          flex-shrink: 0;
        }
        .sp-activity-meta span {
          display: block;
          color: #a8a29e;
          font-size: 0.82rem;
        }

        /* ── SIDEBAR ── */
        .sp-sidebar-list {
          display: grid;
          gap: 0;
          margin-top: 0.75rem;
        }

        /* ── EMPTY ── */
        .sp-empty {
          color: #a8a29e;
          padding: 1.5rem 0;
          text-align: center;
          font-size: 0.92rem;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 1024px) {
          .sp-layout {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .sp-hero {
            flex-direction: column;
            padding: 1.25rem;
          }
          .sp-details-grid {
            grid-template-columns: 1fr;
          }
          .sp-activity-item {
            flex-direction: column;
          }
          .sp-activity-meta {
            text-align: left;
          }
        }
        @media (max-width: 480px) {
          .sp-hero-actions {
            flex-direction: column;
            width: 100%;
          }
          .sp-hero-actions .sp-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

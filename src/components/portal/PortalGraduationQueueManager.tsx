"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GraduationEligibilityRecord, GraduationQueueSummary } from "@/lib/types";
import { GraduationReviewModal } from "@/components/portal/GraduationReviewModal";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";

type SupervisorOption = {
  id: number;
  fullName: string;
};

type PortalGraduationQueueManagerProps = {
  initialQueue: GraduationQueueSummary;
  supervisors: SupervisorOption[];
};

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Data not available";
  }
  return `${Number(value).toFixed(1)}%`;
}

export function PortalGraduationQueueManager({
  initialQueue,
  supervisors,
}: PortalGraduationQueueManagerProps) {
  const [queue, setQueue] = useState(initialQueue);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<GraduationEligibilityRecord | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return queue.items;
    }
    return queue.items.filter((item) => {
      return (
        item.schoolName.toLowerCase().includes(query) ||
        item.district.toLowerCase().includes(query) ||
        item.subRegion.toLowerCase().includes(query) ||
        item.region.toLowerCase().includes(query)
      );
    });
  }, [queue.items, search]);

  function handleUpdated(next: GraduationEligibilityRecord) {
    setQueue((previous) => {
      const updatedItems = previous.items.map((item) =>
        item.schoolId === next.schoolId ? next : item,
      );
      const normalized = updatedItems.filter(
        (item) => item.workflowState !== "graduated",
      );
      return {
        ...previous,
        eligibleCount: normalized.length,
        items: normalized,
      };
    });
    setSelected(next);
  }

  return (
    <>
      <section className="card">
        <h2>Graduation Queue</h2>
        <p>
          {queue.eligibleCount.toLocaleString()} schools currently meet graduation criteria.
          Review evidence before confirming exit status.
        </p>
        {queue.updatedAt ? (
          <p className="portal-muted">Last eligibility refresh: {queue.updatedAt}</p>
        ) : null}
      </section>

      <section className="card">
        <div className="action-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search school, district, sub-region, or region"
          />
        </div>

        <div className="table-wrap">
          <DashboardListHeader template="minmax(0,1.4fr) minmax(0,1.6fr) 130px 90px 110px 100px 130px 160px">
            <span>School</span>
            <span>Scope</span>
            <span>Domain checks</span>
            <span>Fluent %</span>
            <span>Stories</span>
            <span>Teaching %</span>
            <span>Workflow</span>
            <span>Actions</span>
          </DashboardListHeader>
          {filtered.length === 0 ? (
            <div className="py-3">No graduation-eligible schools found for this filter.</div>
          ) : (
            filtered.map((item) => (
              <DashboardListRow
                key={item.schoolId}
                template="minmax(0,1.4fr) minmax(0,1.6fr) 130px 90px 110px 100px 130px 160px"
              >
                <span className="min-w-0">
                  <strong className="truncate inline-block max-w-full">{item.schoolName}</strong>
                </span>
                <span className="truncate">
                  {item.region} • {item.subRegion} • {item.district}
                </span>
                <span>{item.eligibilityScorecard.domainsOk ? "✓ Pass" : "Needs review"}</span>
                <span>{formatPercent(item.eligibilityScorecard.fluentPct)}</span>
                <span>
                  {item.eligibilityScorecard.publishedStoryCount.toLocaleString()} /{" "}
                  {item.eligibilityScorecard.requiredStories}
                </span>
                <span>{formatPercent(item.eligibilityScorecard.teachingQualityPct)}</span>
                <span>
                  <span className="portal-filter-chip">{item.workflowState.replaceAll("_", " ")}</span>
                </span>
                <span>
                  <span className="action-row">
                    <button type="button" className="button button-ghost" onClick={() => setSelected(item)}>
                      Review
                    </button>
                    <Link href={`/portal/schools/${item.schoolId}`} className="inline-download-link">
                      School
                    </Link>
                  </span>
                </span>
              </DashboardListRow>
            ))
          )}
        </div>
      </section>

      <GraduationReviewModal
        open={Boolean(selected)}
        eligibility={selected}
        supervisors={supervisors}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
      />
    </>
  );
}

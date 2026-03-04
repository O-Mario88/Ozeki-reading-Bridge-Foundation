"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GraduationEligibilityRecord, GraduationQueueSummary } from "@/lib/types";
import { GraduationReviewModal } from "@/components/portal/GraduationReviewModal";

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
          <table>
            <thead>
              <tr>
                <th>School</th>
                <th>Scope</th>
                <th>Domain checks</th>
                <th>Fluent %</th>
                <th>Stories</th>
                <th>Teaching %</th>
                <th>Workflow</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>No graduation-eligible schools found for this filter.</td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.schoolId}>
                    <td>
                      <strong>{item.schoolName}</strong>
                    </td>
                    <td>
                      {item.region} • {item.subRegion} • {item.district}
                    </td>
                    <td>{item.eligibilityScorecard.domainsOk ? "✓ Pass" : "Needs review"}</td>
                    <td>{formatPercent(item.eligibilityScorecard.fluentPct)}</td>
                    <td>
                      {item.eligibilityScorecard.publishedStoryCount.toLocaleString()} /{" "}
                      {item.eligibilityScorecard.requiredStories}
                    </td>
                    <td>{formatPercent(item.eligibilityScorecard.teachingQualityPct)}</td>
                    <td>
                      <span className="portal-filter-chip">{item.workflowState.replaceAll("_", " ")}</span>
                    </td>
                    <td>
                      <div className="action-row">
                        <button className="button button-ghost" onClick={() => setSelected(item)}>
                          Review
                        </button>
                        <Link href={`/portal/schools/${item.schoolId}`} className="inline-download-link">
                          School
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

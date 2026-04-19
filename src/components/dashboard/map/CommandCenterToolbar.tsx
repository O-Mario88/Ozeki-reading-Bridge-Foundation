"use client";

import { useState } from "react";
import type { PublicImpactAggregate } from "@/lib/types";
import {
  aggregateToCsv,
  downloadBlob,
  exportScopeFilename,
} from "@/lib/public-impact-export";

type ScopeLevel = PublicImpactAggregate["scope"]["level"];

type NavigatorSnapshot = PublicImpactAggregate["navigator"] | null;

type SelectableScope = {
  level: ScopeLevel;
  id: string;
  name: string;
};

type Props = {
  payload: PublicImpactAggregate | null;
  period: string;
  availablePeriods: string[];
  comparePeriod: string | null;
  onComparePeriodChange: (period: string | null) => void;
  compareScope: SelectableScope | null;
  onCompareScopeChange: (scope: SelectableScope | null) => void;
  navigator: NavigatorSnapshot;
  onOpenEmbed: () => void;
  choroplethMetric: string;
  onChoroplethMetricChange: (metric: string) => void;
};

const CHOROPLETH_METRICS: Array<{ value: string; label: string }> = [
  { value: "none", label: "None (default)" },
  { value: "learnersAssessed", label: "Learners assessed" },
  { value: "teachersSupported", label: "Teachers supported" },
  { value: "coachingVisits", label: "Coaching visits" },
  { value: "trainingCoverage", label: "Training coverage" },
  { value: "trainingGapDays", label: "Training gap (days since last)" },
  { value: "compositeScore", label: "Reading composite (endline)" },
];

export function CommandCenterToolbar({
  payload,
  period,
  availablePeriods,
  comparePeriod,
  onComparePeriodChange,
  compareScope,
  onCompareScopeChange,
  navigator,
  onOpenEmbed,
  choroplethMetric,
  onChoroplethMetricChange,
}: Props) {
  const [exportOpen, setExportOpen] = useState(false);

  const handleExportCsv = () => {
    if (!payload) return;
    const csv = aggregateToCsv(payload);
    downloadBlob(csv, exportScopeFilename(payload, "csv"), "text/csv;charset=utf-8");
    setExportOpen(false);
  };
  const handleExportJson = () => {
    if (!payload) return;
    const json = JSON.stringify(payload, null, 2);
    downloadBlob(json, exportScopeFilename(payload, "json"), "application/json");
    setExportOpen(false);
  };
  const handleExportPdfBrief = () => {
    if (!payload) return;
    const params = new URLSearchParams({
      level: payload.scope.level,
      id: payload.scope.id,
      period,
      format: "pdf",
    });
    window.open(`/api/impact/report-engine?${params.toString()}`, "_blank");
    setExportOpen(false);
  };

  const districts = navigator?.districts ?? [];
  const schools = navigator?.schools ?? [];

  const onCompareChange = (value: string) => {
    if (!value) {
      onCompareScopeChange(null);
      return;
    }
    const [level, id] = value.split("::", 2);
    if (level === "district") {
      onCompareScopeChange({ level: "district", id, name: id });
    } else if (level === "school") {
      const school = schools.find((s) => s.id.toString() === id);
      onCompareScopeChange({ level: "school", id, name: school?.name ?? id });
    } else {
      onCompareScopeChange(null);
    }
  };

  const compareValue = compareScope ? `${compareScope.level}::${compareScope.id}` : "";

  return (
    <div className="impact-command-toolbar card">
      <div className="impact-command-toolbar-row">
        <div className="impact-command-toolbar-group">
          <label>Compare to district</label>
          <select
            value={compareValue.startsWith("district::") ? compareValue : ""}
            onChange={(e) => onCompareChange(e.target.value)}
            aria-label="Compare with another district"
          >
            <option value="">— None —</option>
            {districts
              .filter((d) => d !== payload?.scope.name)
              .map((d) => (
                <option key={d} value={`district::${d}`}>
                  {d}
                </option>
              ))}
          </select>
        </div>

        <div className="impact-command-toolbar-group">
          <label>vs Period</label>
          <select
            value={comparePeriod ?? ""}
            onChange={(e) => onComparePeriodChange(e.target.value || null)}
            aria-label="Compare with another reporting period"
          >
            <option value="">— None —</option>
            {availablePeriods
              .filter((p) => p !== period)
              .map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
          </select>
        </div>

        <div className="impact-command-toolbar-group">
          <label>Color map by</label>
          <select
            value={choroplethMetric}
            onChange={(e) => onChoroplethMetricChange(e.target.value)}
            aria-label="Select choropleth intensity metric"
          >
            {CHOROPLETH_METRICS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="impact-command-toolbar-group impact-command-toolbar-actions">
          <div className="impact-export-wrapper">
            <button
              type="button"
              className="impact-toolbar-btn"
              onClick={() => setExportOpen((v) => !v)}
              disabled={!payload}
              aria-haspopup="menu"
              aria-expanded={exportOpen}
            >
              Export ▾
            </button>
            {exportOpen && payload ? (
              <div role="menu" className="impact-export-menu">
                <button role="menuitem" type="button" onClick={handleExportCsv}>
                  CSV (KPIs &amp; outcomes)
                </button>
                <button role="menuitem" type="button" onClick={handleExportJson}>
                  JSON (full payload)
                </button>
                <button role="menuitem" type="button" onClick={handleExportPdfBrief}>
                  PDF brief
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="impact-toolbar-btn"
            onClick={onOpenEmbed}
            disabled={!payload}
          >
            Embed code
          </button>
        </div>
      </div>
    </div>
  );
}

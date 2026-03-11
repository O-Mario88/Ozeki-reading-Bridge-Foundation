import OpenAI from "openai";
import { LEARNING_DOMAIN_DICTIONARY } from "@/lib/domain-dictionary";
import type { PublicImpactAggregate } from "@/lib/types";

const MASTERY_DOMAIN_ORDER: Array<{
  key:
    | "phonemic_awareness"
    | "grapheme_phoneme_correspondence"
    | "blending_decoding"
    | "word_recognition_fluency"
    | "sentence_paragraph_construction"
    | "comprehension";
  label: string;
}> = [
  { key: "phonemic_awareness", label: "Phonemic Awareness" },
  { key: "grapheme_phoneme_correspondence", label: "Grapheme-Phoneme Correspondence" },
  { key: "blending_decoding", label: "Blending & Decoding" },
  { key: "word_recognition_fluency", label: "Word Recognition & Fluency" },
  { key: "sentence_paragraph_construction", label: "Sentence & Paragraph Construction" },
  { key: "comprehension", label: "Comprehension" },
];

export type PublicReportEngineFormat = "json" | "html" | "pdf";

export interface PublicDashboardNarrative {
  executiveSummary: string;
  keyHighlights: string[];
  priorityActions: string[];
  methodsNote: string;
  limitations: string;
  generatedWithAi: boolean;
  model: string | null;
}

export interface PublicDashboardTemplateSection {
  id: string;
  title: string;
  content: string;
}

export interface PublicDashboardReportModel {
  generatedAt: string;
  scope: PublicImpactAggregate["scope"];
  period: PublicImpactAggregate["period"];
  meta: PublicImpactAggregate["meta"];
  kpis: PublicImpactAggregate["kpis"];
  outcomes: Array<{
    key: keyof PublicImpactAggregate["outcomes"];
    label: string;
    description: string;
    baseline: number | null;
    latest: number | null;
    change: number | null;
    benchmarkPct: number | null;
    n: number;
  }>;
  readingLevels: {
    labels: string[];
    baselinePercents: Record<string, number>;
    latestPercents: Record<string, number>;
    baselineN: number;
    latestN: number;
    movementSummary: string | null;
  } | null;
  funnelRows: Array<{
    label: string;
    value: number;
    widthPct: number;
  }>;
  teachingQuality: PublicImpactAggregate["teachingQuality"];
  rankings: PublicImpactAggregate["rankings"];
  narrative: PublicDashboardNarrative;
  template: {
    name: string;
    tableOfContents: string[];
    sections: PublicDashboardTemplateSection[];
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeHtmlWithBreaks(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function toFixedOrNA(value: number | null | undefined, digits = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Data not available";
  }
  return value.toFixed(digits);
}

function signedOrNA(value: number | null | undefined, digits = 1, suffix = "") {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Data not available";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}${suffix}`;
}

function summarizeFallbackNarrative(aggregate: PublicImpactAggregate): PublicDashboardNarrative {
  const schools = aggregate.kpis.schoolsSupported;
  const learners = aggregate.kpis.learnersAssessedUnique;
  const teachingDelta = aggregate.teachingLearningAlignment?.summary?.teachingDelta;
  const nonReaderReduction = aggregate.teachingLearningAlignment?.summary?.nonReaderReductionPp;
  const bestDistrict = aggregate.rankings.mostImproved[0]?.name ?? "Data not available";
  const priorityDistrict = aggregate.rankings.prioritySupport[0]?.name ?? "Data not available";

  return {
    executiveSummary:
      `${aggregate.scope.name} (${aggregate.period.label}) reports ${schools.toLocaleString()} schools supported and ` +
      `${learners.toLocaleString()} learners assessed. Teaching quality change is ${signedOrNA(teachingDelta, 2)} ` +
      `and non-reader reduction is ${signedOrNA(nonReaderReduction, 1, " pp")}.`,
    keyHighlights: [
      `Top improving district: ${bestDistrict}.`,
      `Priority support district: ${priorityDistrict}.`,
      `Assessment cycle completion: ${aggregate.kpis.assessmentCycleCompletionPct.toFixed(1)}%.`,
    ],
    priorityActions: [
      "Prioritize targeted coaching in districts with high priority support scores.",
      "Protect baseline and endline assessment completion for stronger trend confidence.",
      "Scale strategies from top-improving districts to similar contexts.",
    ],
    methodsNote:
      "Narration is generated from the same aggregated, privacy-safe dashboard facts shown in this report.",
    limitations:
      "Dashboard aggregates indicate trends for monitored program data; they do not establish causal attribution.",
    generatedWithAi: false,
    model: null,
  };
}

function normalizeStringList(value: unknown, max = 5) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, max);
}

export async function generatePublicDashboardNarrative(
  aggregate: PublicImpactAggregate,
): Promise<PublicDashboardNarrative> {
  const fallback = summarizeFallbackNarrative(aggregate);
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return fallback;
  }

  const model = process.env.OPENAI_REPORT_MODEL?.trim() || "gpt-5-mini";
  const client = new OpenAI({ apiKey });

  const evidencePayload = {
    scope: aggregate.scope,
    period: aggregate.period,
    kpis: aggregate.kpis,
    outcomes: aggregate.outcomes,
    funnel: aggregate.funnel,
    fidelity: aggregate.fidelity,
    rankings: aggregate.rankings,
    teachingQuality: aggregate.teachingQuality,
    teachingLearningAlignment: aggregate.teachingLearningAlignment,
    readingLevels: aggregate.readingLevels ?? null,
    meta: aggregate.meta,
  };

  try {
    const response = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a literacy impact analyst. Use only provided evidence. Return JSON with keys: executiveSummary (string), keyHighlights (string[] up to 4), priorityActions (string[] up to 4), methodsNote (string), limitations (string). Keep language public-safe and avoid learner identifiers. If evidence is missing, say Data not available.",
        },
        {
          role: "user",
          content: `Create a public-safe narrative for this dashboard report. Evidence JSON:\n${JSON.stringify(
            evidencePayload,
          )}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return fallback;
    }

    const parsed = JSON.parse(content) as Partial<PublicDashboardNarrative>;
    const executiveSummary = String(parsed.executiveSummary ?? "").trim();
    const methodsNote = String(parsed.methodsNote ?? "").trim();
    const limitations = String(parsed.limitations ?? "").trim();
    const keyHighlights = normalizeStringList(parsed.keyHighlights, 4);
    const priorityActions = normalizeStringList(parsed.priorityActions, 4);

    if (!executiveSummary) {
      return fallback;
    }

    return {
      executiveSummary,
      keyHighlights: keyHighlights.length > 0 ? keyHighlights : fallback.keyHighlights,
      priorityActions: priorityActions.length > 0 ? priorityActions : fallback.priorityActions,
      methodsNote: methodsNote || fallback.methodsNote,
      limitations: limitations || fallback.limitations,
      generatedWithAi: true,
      model,
    };
  } catch {
    return fallback;
  }
}

function deriveOutcomeRows(aggregate: PublicImpactAggregate) {
  const rows: PublicDashboardReportModel["outcomes"] = [
    {
      key: "letterNames",
      label: LEARNING_DOMAIN_DICTIONARY.letter_names.label_full,
      description: LEARNING_DOMAIN_DICTIONARY.letter_names.description,
      baseline: aggregate.outcomes.letterNames.baseline,
      latest: aggregate.outcomes.letterNames.latest,
      change:
        typeof aggregate.outcomes.letterNames.latest === "number" &&
        typeof aggregate.outcomes.letterNames.baseline === "number"
          ? aggregate.outcomes.letterNames.latest - aggregate.outcomes.letterNames.baseline
          : null,
      benchmarkPct: aggregate.outcomes.letterNames.benchmarkPct,
      n: aggregate.outcomes.letterNames.n,
    },
    {
      key: "letterSounds",
      label: LEARNING_DOMAIN_DICTIONARY.letter_sounds.label_full,
      description: LEARNING_DOMAIN_DICTIONARY.letter_sounds.description,
      baseline: aggregate.outcomes.letterSounds.baseline,
      latest: aggregate.outcomes.letterSounds.latest,
      change:
        typeof aggregate.outcomes.letterSounds.latest === "number" &&
        typeof aggregate.outcomes.letterSounds.baseline === "number"
          ? aggregate.outcomes.letterSounds.latest - aggregate.outcomes.letterSounds.baseline
          : null,
      benchmarkPct: aggregate.outcomes.letterSounds.benchmarkPct,
      n: aggregate.outcomes.letterSounds.n,
    },
    {
      key: "realWords",
      label: LEARNING_DOMAIN_DICTIONARY.real_words.label_full,
      description: LEARNING_DOMAIN_DICTIONARY.real_words.description,
      baseline: aggregate.outcomes.realWords.baseline,
      latest: aggregate.outcomes.realWords.latest,
      change:
        typeof aggregate.outcomes.realWords.latest === "number" &&
        typeof aggregate.outcomes.realWords.baseline === "number"
          ? aggregate.outcomes.realWords.latest - aggregate.outcomes.realWords.baseline
          : null,
      benchmarkPct: aggregate.outcomes.realWords.benchmarkPct,
      n: aggregate.outcomes.realWords.n,
    },
    {
      key: "madeUpWords",
      label: LEARNING_DOMAIN_DICTIONARY.made_up_words.label_full,
      description: LEARNING_DOMAIN_DICTIONARY.made_up_words.description,
      baseline: aggregate.outcomes.madeUpWords.baseline,
      latest: aggregate.outcomes.madeUpWords.latest,
      change:
        typeof aggregate.outcomes.madeUpWords.latest === "number" &&
        typeof aggregate.outcomes.madeUpWords.baseline === "number"
          ? aggregate.outcomes.madeUpWords.latest - aggregate.outcomes.madeUpWords.baseline
          : null,
      benchmarkPct: aggregate.outcomes.madeUpWords.benchmarkPct,
      n: aggregate.outcomes.madeUpWords.n,
    },
    {
      key: "storyReading",
      label: LEARNING_DOMAIN_DICTIONARY.story_reading.label_full,
      description: LEARNING_DOMAIN_DICTIONARY.story_reading.description,
      baseline: aggregate.outcomes.storyReading.baseline,
      latest: aggregate.outcomes.storyReading.latest,
      change:
        typeof aggregate.outcomes.storyReading.latest === "number" &&
        typeof aggregate.outcomes.storyReading.baseline === "number"
          ? aggregate.outcomes.storyReading.latest - aggregate.outcomes.storyReading.baseline
          : null,
      benchmarkPct: aggregate.outcomes.storyReading.benchmarkPct,
      n: aggregate.outcomes.storyReading.n,
    },
    {
      key: "comprehension",
      label: LEARNING_DOMAIN_DICTIONARY.comprehension.label_full,
      description: LEARNING_DOMAIN_DICTIONARY.comprehension.description,
      baseline: aggregate.outcomes.comprehension.baseline,
      latest: aggregate.outcomes.comprehension.latest,
      change:
        typeof aggregate.outcomes.comprehension.latest === "number" &&
        typeof aggregate.outcomes.comprehension.baseline === "number"
          ? aggregate.outcomes.comprehension.latest - aggregate.outcomes.comprehension.baseline
          : null,
      benchmarkPct: aggregate.outcomes.comprehension.benchmarkPct,
      n: aggregate.outcomes.comprehension.n,
    },
  ];

  return rows;
}

function deriveReadingLevels(
  aggregate: PublicImpactAggregate,
): PublicDashboardReportModel["readingLevels"] {
  const levels = aggregate.readingLevels;
  if (!levels || levels.levels.length === 0 || levels.distribution.length === 0) {
    return null;
  }
  const baseline = levels.distribution.find((row) => row.cycle === "baseline") ?? null;
  const latest =
    levels.distribution.find((row) => row.cycle === "endline") ??
    levels.distribution.find((row) => row.cycle === "latest") ??
    null;
  if (!baseline && !latest) {
    return null;
  }

  const labels = levels.levels.map((row) => row.label);
  const baselinePercents: Record<string, number> = {};
  const latestPercents: Record<string, number> = {};

  labels.forEach((label) => {
    baselinePercents[label] = baseline?.percents[label] ?? 0;
    latestPercents[label] = latest?.percents[label] ?? 0;
  });

  const movement = levels.movement;
  const movementSummary = movement
    ? `Matched learners (n=${movement.n_matched.toLocaleString()}): ${movement.moved_up_1plus_percent}% moved up by 1+ level, ${movement.stayed_same_percent}% stayed at same level, ${movement.moved_down_percent}% moved down.`
    : null;

  return {
    labels,
    baselinePercents,
    latestPercents,
    baselineN: baseline?.n ?? 0,
    latestN: latest?.n ?? 0,
    movementSummary,
  };
}

function deriveFunnelRows(aggregate: PublicImpactAggregate): PublicDashboardReportModel["funnelRows"] {
  const rows = [
    { label: "Schools trained", value: aggregate.funnel.trained },
    { label: "Coached / visited", value: aggregate.funnel.coached },
    { label: "Baseline assessed", value: aggregate.funnel.baselineAssessed },
    { label: "Endline assessed", value: aggregate.funnel.endlineAssessed },
    { label: "Story active", value: aggregate.funnel.storyActive },
  ];
  const peak = Math.max(1, ...rows.map((row) => row.value));
  return rows.map((row) => ({
    ...row,
    widthPct: Number(((row.value / peak) * 100).toFixed(1)),
  }));
}

function lineForOutcome(row: PublicDashboardReportModel["outcomes"][number]) {
  return `${row.label}: baseline ${toFixedOrNA(row.baseline)}, latest ${toFixedOrNA(row.latest)}, change ${signedOrNA(
    row.change,
  )}, benchmark met ${toFixedOrNA(row.benchmarkPct)}${typeof row.benchmarkPct === "number" ? "%" : ""} (n=${row.n.toLocaleString()}).`;
}

function buildTemplateSections(
  aggregate: PublicImpactAggregate,
  narrative: PublicDashboardNarrative,
  outcomes: PublicDashboardReportModel["outcomes"],
  readingLevels: PublicDashboardReportModel["readingLevels"],
  funnelRows: PublicDashboardReportModel["funnelRows"],
): PublicDashboardTemplateSection[] {
  const fidelityDriverSummary = aggregate.fidelity.drivers
    .map((driver) => `${driver.label}: ${driver.score.toFixed(1)}%`)
    .join("; ");

  const topImproved = aggregate.rankings.mostImproved
    .slice(0, 3)
    .map((entry) => `${entry.name} (${entry.score.toFixed(1)})`)
    .join(", ");
  const prioritySupport = aggregate.rankings.prioritySupport
    .slice(0, 3)
    .map((entry) => `${entry.name} (${entry.score.toFixed(1)})`)
    .join(", ");

  const readingLevelsSection = readingLevels
    ? `Baseline distribution n=${readingLevels.baselineN.toLocaleString()}, latest distribution n=${readingLevels.latestN.toLocaleString()}. ` +
      readingLevels.labels
        .map((label) => {
          const base = readingLevels.baselinePercents[label] ?? 0;
          const latest = readingLevels.latestPercents[label] ?? 0;
          const delta = latest - base;
          const sign = delta > 0 ? "+" : "";
          return `${label}: ${base.toFixed(1)}% -> ${latest.toFixed(1)}% (${sign}${delta.toFixed(
            1,
          )} pp)`;
        })
        .join("; ") +
      (readingLevels.movementSummary ? ` ${readingLevels.movementSummary}` : "")
    : "Data not available for this period.";
  const masterySection = aggregate.masteryDomains
    ? MASTERY_DOMAIN_ORDER.map((entry) => {
      const domain = aggregate.masteryDomains?.[entry.key];
      if (!domain) return null;
      return `${entry.label}: Green ${toFixedOrNA(domain.green.percent)}%, Amber ${toFixedOrNA(
        domain.amber.percent,
      )}%, Red ${toFixedOrNA(domain.red.percent)}% (n=${domain.n.toLocaleString()})`;
    })
      .filter((value): value is string => Boolean(value))
      .join("; ")
    : "Data not available for this period.";
  const benchmarkSection = aggregate.benchmarkStatus
    ? `Below expected ${aggregate.benchmarkStatus.belowExpected.percent.toFixed(1)}%, at expected ${aggregate.benchmarkStatus.atExpected.percent.toFixed(1)}%, above expected ${aggregate.benchmarkStatus.aboveExpected.percent.toFixed(1)}% (n=${aggregate.benchmarkStatus.n.toLocaleString()}).`
    : "Data not available for this period.";

  const sections: PublicDashboardTemplateSection[] = [
    {
      id: "executive-summary",
      title: "Executive Summary",
      content: narrative.executiveSummary,
    },
    {
      id: "implementation-fidelity",
      title: "Implementation Fidelity",
      content:
        `Composite fidelity score is ${aggregate.fidelity.score}/100 (${aggregate.fidelity.band}). ` +
        `Driver scores: ${fidelityDriverSummary || "Data not available"}.`,
    },
    {
      id: "learning-outcomes",
      title: "Learning Outcomes",
      content: outcomes.map(lineForOutcome).join(" "),
    },
    {
      id: "mastery-traffic-light-distribution",
      title: "Mastery Traffic-Light Distribution",
      content:
        `${masterySection}. ` +
        `${aggregate.publicExplanation?.green ?? "Green means the learner has mastered the skill."} ` +
        `${aggregate.publicExplanation?.amber ?? "Amber means the learner is developing but needs more speed or consistency."} ` +
        `${aggregate.publicExplanation?.red ?? "Red means the learner needs targeted support."}`,
    },
    {
      id: "reading-levels-profile-and-movement",
      title: "Reading Levels Profile and Movement",
      content: readingLevelsSection,
    },
    {
      id: "benchmark-grade-alignment",
      title: "Benchmark Grade Alignment",
      content: benchmarkSection,
    },
    {
      id: "program-implementation-funnel",
      title: "Program Implementation Funnel",
      content: funnelRows
        .map((row) => `${row.label}: ${row.value.toLocaleString()}`)
        .join("; "),
    },
    {
      id: "teaching-quality",
      title: "Teaching Quality",
      content:
        `Evaluations: ${aggregate.teachingQuality.evaluationsCount.toLocaleString()}; ` +
        `Average score: ${toFixedOrNA(aggregate.teachingQuality.avgOverallScore, 2)}; ` +
        `Improved teachers: ${toFixedOrNA(aggregate.teachingQuality.improvedTeachersPercent, 1)}%; ` +
        `Schools improved: ${toFixedOrNA(aggregate.teachingQuality.schoolsImprovedPercent, 1)}%. ` +
        `Top focus areas: ${aggregate.teachingQuality.topCoachingFocusAreas.join(", ") || "Data not available"}.`,
    },
    {
      id: "top-movers-and-priority-support",
      title: "Top Movers + Priority Support",
      content:
        `Top improving districts: ${topImproved || "Data not available"}. ` +
        `Priority support districts: ${prioritySupport || "Data not available"}.`,
    },
    {
      id: "data-quality-notes",
      title: "Data Quality Notes",
      content:
        `Data completeness: ${aggregate.meta.dataCompleteness}; sample size n=${aggregate.meta.sampleSize.toLocaleString()}; ` +
        `last updated ${new Date(aggregate.meta.lastUpdated).toLocaleString()}.`,
    },
    {
      id: "recommendations",
      title: "Recommendations",
      content:
        narrative.priorityActions.length > 0
          ? narrative.priorityActions.map((item, index) => `${index + 1}. ${item}`).join(" ")
          : "Data not available for this period.",
    },
    {
      id: "disclosure",
      title: "Disclosure",
      content:
        `${narrative.methodsNote} ${narrative.limitations} ` +
        "This report is generated from the same filtered public dashboard aggregate and excludes learner/teacher identifiers.",
    },
  ];

  return sections;
}

export function buildPublicDashboardReportModel(
  aggregate: PublicImpactAggregate,
  narrative: PublicDashboardNarrative,
): PublicDashboardReportModel {
  const outcomes = deriveOutcomeRows(aggregate);
  const readingLevels = deriveReadingLevels(aggregate);
  const funnelRows = deriveFunnelRows(aggregate);
  const sections = buildTemplateSections(
    aggregate,
    narrative,
    outcomes,
    readingLevels,
    funnelRows,
  );

  return {
    generatedAt: new Date().toISOString(),
    scope: aggregate.scope,
    period: aggregate.period,
    meta: aggregate.meta,
    kpis: aggregate.kpis,
    outcomes,
    readingLevels,
    funnelRows,
    teachingQuality: aggregate.teachingQuality,
    rankings: aggregate.rankings,
    narrative,
    template: {
      name: "Public Impact Report Template",
      tableOfContents: sections.map((section) => section.title),
      sections,
    },
  };
}

function levelColor(index: number) {
  const palette = ["#c0392b", "#e67e22", "#f1c40f", "#1f5fbf", "#0c7b6a", "#6b7280"];
  return palette[index % palette.length];
}

function renderRankRows(rows: Array<{ name: string; score: number }>, emptyText: string) {
  if (rows.length === 0) {
    return `<tr><td colspan="2">${escapeHtml(emptyText)}</td></tr>`;
  }
  return rows
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.name)}</td><td style="text-align:right;">${row.score.toLocaleString()}</td></tr>`,
    )
    .join("\n");
}

export function renderPublicDashboardReportHtml(args: {
  report: PublicDashboardReportModel;
  pdfHref: string;
  dashboardHref: string;
}) {
  const { report, pdfHref, dashboardHref } = args;
  const dataStatus =
    report.meta.dataCompleteness === "Complete"
      ? "Complete data"
      : `Partial data (n=${report.meta.sampleSize.toLocaleString()})`;

  const readingLevelsHtml = report.readingLevels
    ? `
      <section class="panel">
        <h2>Reading Levels: Baseline vs Latest</h2>
        <p class="muted">Baseline n=${report.readingLevels.baselineN.toLocaleString()} | Latest n=${report.readingLevels.latestN.toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Level</th>
              <th>Baseline (%)</th>
              <th>Latest (%)</th>
              <th>Change (pp)</th>
            </tr>
          </thead>
          <tbody>
            ${report.readingLevels.labels
              .map((label) => {
                const base = report.readingLevels?.baselinePercents[label] ?? 0;
                const latest = report.readingLevels?.latestPercents[label] ?? 0;
                const delta = latest - base;
                const sign = delta > 0 ? "+" : "";
                return `<tr>
                  <td><span class="chip" style="background:${levelColor(
                    report.readingLevels?.labels.indexOf(label) ?? 0,
                  )};"></span>${escapeHtml(label)}</td>
                  <td>${base.toFixed(1)}%</td>
                  <td>${latest.toFixed(1)}%</td>
                  <td>${sign}${delta.toFixed(1)} pp</td>
                </tr>`;
              })
              .join("\n")}
          </tbody>
        </table>
      </section>
    `
    : "";

  const teachingDistribution = report.teachingQuality.levelDistribution;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Public Dashboard Report - ${escapeHtml(report.scope.name)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    :root {
      --bg: #f7f8fa;
      --panel: #ffffff;
      --ink: #14222f;
      --muted: #4b5c68;
      --line: #d7dee6;
      --brand: #c35d0e;
      --brand-soft: #fff4ec;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Roboto, Arial, sans-serif;
      background: var(--bg);
      color: var(--ink);
      line-height: 1.45;
    }
    .wrap {
      width: min(1080px, calc(100% - 24px));
      margin: 12px auto 24px;
      display: grid;
      gap: 12px;
    }
    .no-print {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .btn {
      border: 1px solid var(--line);
      background: #fff;
      color: var(--ink);
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 12px;
      text-decoration: none;
      cursor: pointer;
    }
    .btn.primary {
      background: var(--brand);
      border-color: var(--brand);
      color: #fff;
    }
    .hero {
      background: linear-gradient(135deg, #102a43, #0c4a6e 70%, #0b6c63);
      color: #fff;
      border-radius: 12px;
      padding: 16px;
    }
    .hero h1 {
      margin: 0 0 6px;
      font-size: 24px;
    }
    .hero p {
      margin: 0;
      font-size: 13px;
      opacity: 0.95;
    }
    .hero-meta {
      margin-top: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .hero-meta span {
      font-size: 12px;
      border: 1px solid rgba(255,255,255,0.35);
      border-radius: 999px;
      padding: 4px 8px;
      background: rgba(255,255,255,0.08);
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }
    .kpi {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 10px;
    }
    .kpi span {
      display: block;
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    .kpi strong {
      font-size: 20px;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 12px;
      break-inside: avoid;
    }
    h2 {
      margin: 0 0 8px;
      font-size: 16px;
    }
    .muted {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
    }
    .two-col {
      display: grid;
      gap: 10px;
      grid-template-columns: 1.1fr 1fr;
    }
    ul {
      margin: 8px 0 0;
      padding-left: 18px;
    }
    li { margin: 0 0 4px; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      border: 1px solid var(--line);
      padding: 6px 7px;
      vertical-align: top;
    }
    th {
      text-align: left;
      background: #f1f4f8;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .03em;
      color: #213547;
    }
    .chip {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 999px;
      margin-right: 6px;
      vertical-align: middle;
    }
    .funnel-list {
      display: grid;
      gap: 8px;
    }
    .funnel-row {
      display: grid;
      grid-template-columns: 160px 1fr 70px;
      gap: 8px;
      align-items: center;
      font-size: 12px;
    }
    .track {
      background: #eef2f7;
      border-radius: 999px;
      height: 9px;
      overflow: hidden;
    }
    .track i {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, #f08a24, #c35d0e);
    }
    .pill {
      border: 1px solid #f3cfb3;
      background: var(--brand-soft);
      color: #8a3f07;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 11px;
    }
    .toc {
      margin: 0;
      padding-left: 18px;
      font-size: 12px;
    }
    .toc li {
      margin: 0 0 4px;
    }
    .template-section h2 {
      margin-bottom: 6px;
    }
    .template-section p {
      margin: 0;
      font-size: 12px;
      color: #1f2d3a;
    }
    .foot {
      font-size: 11px;
      color: var(--muted);
      text-align: center;
      margin-top: 8px;
    }
    @media (max-width: 920px) {
      .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .two-col { grid-template-columns: 1fr; }
      .funnel-row { grid-template-columns: 1fr; }
    }
    @media print {
      body { background: #fff; }
      .wrap { width: 100%; margin: 0; gap: 8px; }
      .no-print { display: none !important; }
      .panel, .kpi, .hero { box-shadow: none; }
      .template-section { break-inside: avoid-page; }
      a { color: inherit; text-decoration: none; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="no-print">
      <button class="btn" onclick="window.print()">Print A4</button>
      <a class="btn primary" href="${escapeHtml(pdfHref)}">Download A4 PDF</a>
      <a class="btn" href="${escapeHtml(dashboardHref)}">Back to dashboard</a>
    </section>

    <section class="hero">
      <h1>Public Dashboard Report (A4)</h1>
      <p>${escapeHtml(report.scope.name)} | Period: ${escapeHtml(report.period.label)} | Generated ${escapeHtml(
    new Date(report.generatedAt).toLocaleString(),
  )}</p>
      <div class="hero-meta">
        <span>${escapeHtml(report.scope.level.toUpperCase())}</span>
        <span>${escapeHtml(dataStatus)}</span>
        <span>Template: ${escapeHtml(report.template.name)}</span>
        <span>AI narration: ${report.narrative.generatedWithAi ? "Enabled" : "Template fallback"}${
    report.narrative.model ? ` (${escapeHtml(report.narrative.model)})` : ""
  }</span>
      </div>
    </section>

    <section class="kpi-grid">
      <article class="kpi"><span>Schools supported</span><strong>${report.kpis.schoolsSupported.toLocaleString()}</strong></article>
      <article class="kpi"><span>Learners assessed</span><strong>${report.kpis.learnersAssessedUnique.toLocaleString()}</strong></article>
      <article class="kpi"><span>Teachers supported</span><strong>${(
    report.kpis.teachersSupportedMale + report.kpis.teachersSupportedFemale
  ).toLocaleString()}</strong></article>
      <article class="kpi"><span>Cycle completion</span><strong>${report.kpis.assessmentCycleCompletionPct.toFixed(
    1,
  )}%</strong></article>
    </section>

    <section class="panel">
      <h2>Table of Contents</h2>
      <ol class="toc">
        ${report.template.tableOfContents
          .map((item, index) => `<li>${index + 1}. ${escapeHtml(item)}</li>`)
          .join("\n")}
      </ol>
    </section>

    ${report.template.sections
      .map(
        (section, index) => `
          <section class="panel template-section">
            <h2>${index + 1}. ${escapeHtml(section.title)}</h2>
            <p>${escapeHtmlWithBreaks(section.content)}</p>
          </section>
        `,
      )
      .join("\n")}

    <section class="two-col">
      <article class="panel">
        <h2>AI Highlights</h2>
        <ul>
          ${report.narrative.keyHighlights.map((line) => `<li>${escapeHtml(line)}</li>`).join("\n")}
        </ul>
      </article>
      <article class="panel">
        <h2>Priority Actions</h2>
        <ul>
          ${report.narrative.priorityActions.map((line) => `<li>${escapeHtml(line)}</li>`).join("\n")}
        </ul>
        <p class="muted"><strong>Methods:</strong> ${escapeHtml(report.narrative.methodsNote)}</p>
        <p class="muted"><strong>Limitations:</strong> ${escapeHtml(report.narrative.limitations)}</p>
      </article>
    </section>

    <section class="panel">
      <h2>Learning Outcomes (Detailed Table)</h2>
      <table>
        <thead>
          <tr>
            <th>Domain</th>
            <th>Baseline</th>
            <th>Latest</th>
            <th>Change</th>
            <th>Benchmark met (%)</th>
            <th>n</th>
          </tr>
        </thead>
        <tbody>
          ${report.outcomes
            .map(
              (row) => `<tr>
            <td><strong>${escapeHtml(row.label)}</strong><br/><span class="muted">${escapeHtml(
                row.description,
              )}</span></td>
            <td>${toFixedOrNA(row.baseline)}</td>
            <td>${toFixedOrNA(row.latest)}</td>
            <td>${signedOrNA(row.change)}</td>
            <td>${toFixedOrNA(row.benchmarkPct)}${
                typeof row.benchmarkPct === "number" ? "%" : ""
              }</td>
            <td>${row.n.toLocaleString()}</td>
          </tr>`,
            )
            .join("\n")}
        </tbody>
      </table>
    </section>

    ${readingLevelsHtml}

    <section class="two-col">
      <article class="panel">
        <h2>Implementation Funnel (Detailed)</h2>
        <div class="funnel-list">
          ${report.funnelRows
            .map(
              (row) => `<div class="funnel-row">
              <span>${escapeHtml(row.label)}</span>
              <span class="track"><i style="width:${Math.max(3, row.widthPct)}%;"></i></span>
              <strong style="text-align:right;">${row.value.toLocaleString()}</strong>
            </div>`,
            )
            .join("\n")}
        </div>
      </article>
      <article class="panel">
        <h2>Teaching Quality Snapshot</h2>
        <p class="muted">Evaluations: ${report.teachingQuality.evaluationsCount.toLocaleString()} | Avg score: ${
    typeof report.teachingQuality.avgOverallScore === "number"
      ? report.teachingQuality.avgOverallScore.toFixed(2)
      : "Data not available"
  }</p>
        <table>
          <thead>
            <tr>
              <th>Level</th>
              <th>Count</th>
              <th>Percent</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Strong</td><td>${teachingDistribution.strong.count.toLocaleString()}</td><td>${teachingDistribution.strong.percent.toFixed(
              1,
            )}%</td></tr>
            <tr><td>Good</td><td>${teachingDistribution.good.count.toLocaleString()}</td><td>${teachingDistribution.good.percent.toFixed(
              1,
            )}%</td></tr>
            <tr><td>Developing</td><td>${teachingDistribution.developing.count.toLocaleString()}</td><td>${teachingDistribution.developing.percent.toFixed(
              1,
            )}%</td></tr>
            <tr><td>Needs support</td><td>${teachingDistribution.needsSupport.count.toLocaleString()}</td><td>${teachingDistribution.needsSupport.percent.toFixed(
              1,
            )}%</td></tr>
          </tbody>
        </table>
      </article>
    </section>

    <section class="two-col">
      <article class="panel">
        <h2>Top Movers</h2>
        <table>
          <thead><tr><th>District</th><th>Improvement</th></tr></thead>
          <tbody>${renderRankRows(report.rankings.mostImproved, "Data not available")}</tbody>
        </table>
      </article>
      <article class="panel">
        <h2>Priority Support</h2>
        <table>
          <thead><tr><th>District</th><th>Priority Score</th></tr></thead>
          <tbody>${renderRankRows(report.rankings.prioritySupport, "Data not available")}</tbody>
        </table>
      </article>
    </section>

    <section class="panel">
      <h2>Data Trust</h2>
      <p class="muted">
        Last updated: ${escapeHtml(new Date(report.meta.lastUpdated).toLocaleString())} |
        Sample size: ${report.meta.sampleSize.toLocaleString()} |
        Completeness: <span class="pill">${escapeHtml(report.meta.dataCompleteness)}</span>
      </p>
      <p class="muted">This report is generated from the same filtered public dashboard aggregate and excludes personally identifying learner/teacher data.</p>
      <p class="foot">Ozeki Reading Bridge Foundation | Public Dashboard Report Engine</p>
    </section>
  </main>
</body>
</html>`;
}

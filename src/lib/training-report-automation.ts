import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { PDFDocument, rgb } from "pdf-lib";
import { getDb, logAuditEvent } from "@/lib/db";
import { embedPdfSansFonts, embedPdfSerifFonts } from "@/lib/pdf-fonts";
import type {
  PortalUser,
  TrainingReportArtifactRecord,
  TrainingReportFacts,
  TrainingReportNarrative,
  TrainingReportScopeType,
} from "@/lib/types";

const FACTS_VERSION = "TRAINING-FACTS-v1";
const NARRATIVE_VERSION = "TRAINING-NARRATIVE-v1";

type PeriodWindow = {
  periodStart: string;
  periodEnd: string;
  scopeValue: string;
  scopeLabel: string;
};

type FeedbackTheme = {
  theme: string;
  mentions: number;
  sampleQuote: string | null;
};

const FEEDBACK_THEME_RULES: Array<{ theme: string; keywords: string[] }> = [
  { theme: "Phonics and sound routines", keywords: ["phonics", "sound", "letter", "blend", "decod"] },
  { theme: "Fluency and reading practice", keywords: ["fluency", "cwpm", "reading routine", "oral reading"] },
  { theme: "Comprehension instruction", keywords: ["comprehension", "question", "understand", "meaning"] },
  { theme: "Assessment and feedback use", keywords: ["assessment", "feedback", "monitor", "progress"] },
  { theme: "Classroom management and time use", keywords: ["time", "classroom", "management", "large class"] },
  { theme: "Coaching and follow-up support", keywords: ["coaching", "follow-up", "follow up", "mentor", "visit"] },
  { theme: "Materials and resources", keywords: ["material", "resource", "book", "story card", "tool"] },
];

function buildSqlInClause(values: number[], prefix: string) {
  const params: Record<string, number> = {};
  const placeholders = values.map((value, index) => {
    const key = `${prefix}${index}`;
    params[key] = value;
    return `@${key}`;
  });
  return {
    clause: placeholders.length > 0 ? placeholders.join(", ") : "NULL",
    params,
  };
}

function ensureDate(value: string, fallback: string) {
  if (!value) return fallback;
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return fallback;
  }
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return normalized;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getMonthWindow(scopeValue: string) {
  const monthMatch = /^(\d{4})-(\d{2})$/.exec(scopeValue.trim());
  if (!monthMatch) {
    throw new Error("Month scope must be in YYYY-MM format.");
  }
  const year = Number(monthMatch[1]);
  const month = Number(monthMatch[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid month scope value.");
  }
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start: toIsoDate(start), end: toIsoDate(end), label: `${scopeValue.trim()}` };
}

function getQuarterWindow(scopeValue: string) {
  const quarterMatch = /^(\d{4})-Q([1-4])$/i.exec(scopeValue.trim());
  if (!quarterMatch) {
    throw new Error("Quarter scope must be in YYYY-Q1 format.");
  }
  const year = Number(quarterMatch[1]);
  const quarter = Number(quarterMatch[2]);
  const startMonth = (quarter - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 0));
  return { start: toIsoDate(start), end: toIsoDate(end), label: `${year} Q${quarter}` };
}

function getFinancialYearWindow(scopeValue: string) {
  const trimmed = scopeValue.trim();
  const singleYear = /^(\d{4})$/.exec(trimmed);
  if (singleYear) {
    const year = Number(singleYear[1]);
    return {
      start: `${year}-01-01`,
      end: `${year}-12-31`,
      label: `FY ${year}`,
    };
  }

  const spanYear = /^(\d{4})-(\d{4})$/.exec(trimmed);
  if (spanYear) {
    const startYear = Number(spanYear[1]);
    const endYear = Number(spanYear[2]);
    return {
      start: `${startYear}-01-01`,
      end: `${endYear}-12-31`,
      label: `FY ${startYear}-${endYear}`,
    };
  }

  throw new Error("FY scope must be YYYY or YYYY-YYYY.");
}

function resolvePeriodWindow(input: {
  scopeType: TrainingReportScopeType;
  scopeValue?: string;
  periodStart?: string;
  periodEnd?: string;
}): PeriodWindow {
  const scopeType = input.scopeType;
  const rawScopeValue = String(input.scopeValue ?? "").trim();
  const today = new Date();
  const defaultStart = `${today.getUTCFullYear()}-01-01`;
  const defaultEnd = `${today.getUTCFullYear()}-12-31`;

  if (scopeType === "month") {
    const month = getMonthWindow(rawScopeValue || toIsoDate(today).slice(0, 7));
    return {
      periodStart: month.start,
      periodEnd: month.end,
      scopeValue: rawScopeValue || month.label,
      scopeLabel: month.label,
    };
  }

  if (scopeType === "quarter") {
    const quarterDefault = `${today.getUTCFullYear()}-Q${Math.floor(today.getUTCMonth() / 3) + 1}`;
    const quarter = getQuarterWindow(rawScopeValue || quarterDefault);
    return {
      periodStart: quarter.start,
      periodEnd: quarter.end,
      scopeValue: rawScopeValue || quarterDefault,
      scopeLabel: quarter.label,
    };
  }

  if (scopeType === "fy") {
    const fy = getFinancialYearWindow(rawScopeValue || String(today.getUTCFullYear()));
    return {
      periodStart: fy.start,
      periodEnd: fy.end,
      scopeValue: rawScopeValue || String(today.getUTCFullYear()),
      scopeLabel: fy.label,
    };
  }

  if (scopeType === "training_session") {
    const sessionId = Number(rawScopeValue);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      throw new Error("Training session scope requires a numeric record id.");
    }
    const row = getDb()
      .prepare(
        `
        SELECT id, date
        FROM portal_records
        WHERE id = @recordId
          AND module = 'training'
          AND deleted_at IS NULL
        LIMIT 1
        `,
      )
      .get({ recordId: sessionId }) as { id: number; date: string } | undefined;
    if (!row?.id) {
      throw new Error("Training session record was not found.");
    }
    const normalizedDate = ensureDate(row.date, toIsoDate(today));
    return {
      periodStart: normalizedDate,
      periodEnd: normalizedDate,
      scopeValue: String(row.id),
      scopeLabel: `Training Session ${row.id}`,
    };
  }

  const normalizedStart = ensureDate(input.periodStart ?? "", defaultStart);
  const normalizedEnd = ensureDate(input.periodEnd ?? "", defaultEnd);

  if (scopeType === "district") {
    if (!rawScopeValue) {
      throw new Error("District scope requires scopeValue.");
    }
    return {
      periodStart: normalizedStart,
      periodEnd: normalizedEnd,
      scopeValue: rawScopeValue,
      scopeLabel: `District: ${rawScopeValue}`,
    };
  }
  if (scopeType === "region") {
    if (!rawScopeValue) {
      throw new Error("Region scope requires scopeValue.");
    }
    return {
      periodStart: normalizedStart,
      periodEnd: normalizedEnd,
      scopeValue: rawScopeValue,
      scopeLabel: `Region: ${rawScopeValue}`,
    };
  }
  if (scopeType === "sub_region") {
    if (!rawScopeValue) {
      throw new Error("Sub-region scope requires scopeValue.");
    }
    return {
      periodStart: normalizedStart,
      periodEnd: normalizedEnd,
      scopeValue: rawScopeValue,
      scopeLabel: `Sub-region: ${rawScopeValue}`,
    };
  }

  return {
    periodStart: normalizedStart,
    periodEnd: normalizedEnd,
    scopeValue: rawScopeValue || "Uganda",
    scopeLabel: rawScopeValue ? `Country: ${rawScopeValue}` : "Country: Uganda",
  };
}

function stripText(value: unknown) {
  return String(value ?? "").trim();
}

function sentenceClip(value: string, maxLength = 220) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function collectAllowedNumericTokens(value: unknown, tokens = new Set<string>()) {
  if (value === null || value === undefined) {
    return tokens;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    tokens.add(String(value));
    return tokens;
  }

  if (typeof value === "string") {
    const matches = value.replaceAll(",", "").match(/\d+(?:\.\d+)?/g) ?? [];
    matches.forEach((token) => tokens.add(token));
    return tokens;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectAllowedNumericTokens(item, tokens));
    return tokens;
  }

  if (typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) =>
      collectAllowedNumericTokens(item, tokens),
    );
  }

  return tokens;
}

function extractFeedbackThemes(texts: string[]): FeedbackTheme[] {
  if (texts.length === 0) {
    return [];
  }

  const normalizedTexts = texts
    .map((text) => stripText(text))
    .filter(Boolean)
    .map((text) => ({
      raw: text,
      lower: text.toLowerCase(),
    }));

  return FEEDBACK_THEME_RULES
    .map((rule) => {
      let mentions = 0;
      let sampleQuote: string | null = null;
      normalizedTexts.forEach((entry) => {
        const matched = rule.keywords.some((keyword) => entry.lower.includes(keyword));
        if (matched) {
          mentions += 1;
          if (!sampleQuote) {
            sampleQuote = sentenceClip(entry.raw, 180);
          }
        }
      });
      return { theme: rule.theme, mentions, sampleQuote };
    })
    .filter((row) => row.mentions > 0)
    .sort((left, right) => right.mentions - left.mentions)
    .slice(0, 8);
}

function getOpenAiClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

function deterministicNarrative(facts: TrainingReportFacts): TrainingReportNarrative {
  const topThemes = facts.feedback.themes.slice(0, 3).map((item) => item.theme).join(", ");
  const quoteSample = facts.approvedQuotes[0]?.quote
    ? `"${sentenceClip(facts.approvedQuotes[0].quote, 180)}"`
    : "No approved quotes were available in this scope.";
  const observedText = facts.observedAfterTraining
    ? `Observed after training: ${facts.observedAfterTraining.coachingVisitsCount} coaching visit(s) and ${facts.observedAfterTraining.assessmentSessionsCount} assessment session(s).`
    : "Observed-after-training metrics were not requested for this report.";

  return {
    narrativeVersion: NARRATIVE_VERSION,
    generatedWithAi: false,
    sections: {
      summary: `This report covers ${facts.scopeLabel} from ${facts.periodStart} to ${facts.periodEnd}. A total of ${facts.trainingsCount} training session(s) reached ${facts.schoolsTrainedCount} school(s) and ${facts.participantsTotal} participant(s).`,
      participation: `Participants included ${facts.teachersTotal} teacher(s) and ${facts.leadersTotal} school leader(s). Female participation was ${facts.femaleTotal} and male participation was ${facts.maleTotal}.`,
      whatWentWell: `Participant and trainer feedback highlight the following strengths: ${topThemes || "No recurring strengths were detected from stored feedback."}`,
      practiceChange: `Practice-change evidence was drawn from stored participant reflections. Example quote: ${quoteSample}`,
      challengesAndRecommendations: `Feedback records included ${facts.feedback.challengesRows} challenge entry(ies) and ${facts.feedback.recommendationsRows} recommendation entry(ies). Recommendations should prioritize practical classroom follow-up and support continuity.`,
      followUpPlan: `A total of ${facts.followUpPlans.length} follow-up plan row(s) are linked to trainings in this scope. Follow-up should track planned dates, type, and assigned owner completion.`,
      nextImprovements: `${observedText} Next cycle improvements should focus on targeted support where below-minimum reading levels remain high.`,
    },
  };
}

async function aiNarrative(facts: TrainingReportFacts): Promise<TrainingReportNarrative> {
  const openai = getOpenAiClient();
  if (!openai) {
    return deterministicNarrative(facts);
  }

  const placeholders: Record<string, string> = {
    "{{SCOPE_LABEL}}": facts.scopeLabel,
    "{{PERIOD_START}}": facts.periodStart,
    "{{PERIOD_END}}": facts.periodEnd,
    "{{TRAININGS_COUNT}}": String(facts.trainingsCount),
    "{{SCHOOLS_TRAINED_COUNT}}": String(facts.schoolsTrainedCount),
    "{{PARTICIPANTS_TOTAL}}": String(facts.participantsTotal),
    "{{TEACHERS_TOTAL}}": String(facts.teachersTotal),
    "{{LEADERS_TOTAL}}": String(facts.leadersTotal),
    "{{FEMALE_TOTAL}}": String(facts.femaleTotal),
    "{{MALE_TOTAL}}": String(facts.maleTotal),
    "{{FOLLOW_UP_PLANS_TOTAL}}": String(facts.followUpPlans.length),
    "{{PARTICIPANT_FEEDBACK_ROWS}}": String(facts.feedback.participantRows),
    "{{TRAINER_FEEDBACK_ROWS}}": String(facts.feedback.trainerRows),
    "{{CHALLENGES_ROWS}}": String(facts.feedback.challengesRows),
    "{{RECOMMENDATIONS_ROWS}}": String(facts.feedback.recommendationsRows),
    "{{APPROVED_QUOTES_TOTAL}}": String(facts.approvedQuotes.length),
    "{{COACHING_VISITS_AFTER_TRAINING}}": String(facts.observedAfterTraining?.coachingVisitsCount ?? 0),
    "{{ASSESSMENTS_AFTER_TRAINING}}": String(facts.observedAfterTraining?.assessmentSessionsCount ?? 0),
  };

  const allowedPlaceholders = Object.keys(placeholders);
  const model = process.env.OPENAI_REPORT_MODEL?.trim() || "gpt-5-mini";
  const systemPrompt = `
You write professional education training reports.
Rules:
1) Never invent numbers.
2) Never write digits directly.
3) When referencing metrics/dates/counts, use ONLY these placeholders:
${allowedPlaceholders.join(", ")}
4) Use only provided facts and quote excerpts.
5) Return strict JSON with keys:
summary, participation, whatWentWell, practiceChange, challengesAndRecommendations, followUpPlan, nextImprovements
`;

  try {
    const response = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            facts,
            quoteExcerpts: facts.approvedQuotes.map((quote) => quote.quote).slice(0, 8),
          }),
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return deterministicNarrative(facts);
    }
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const candidate = {
      summary: stripText(parsed.summary),
      participation: stripText(parsed.participation),
      whatWentWell: stripText(parsed.whatWentWell),
      practiceChange: stripText(parsed.practiceChange),
      challengesAndRecommendations: stripText(parsed.challengesAndRecommendations),
      followUpPlan: stripText(parsed.followUpPlan),
      nextImprovements: stripText(parsed.nextImprovements),
    };

    const combined = Object.values(candidate).join(" ");
    if (!combined) {
      return deterministicNarrative(facts);
    }

    const applyPlaceholders = (value: string) => {
      let out = value;
      Object.entries(placeholders).forEach(([token, tokenValue]) => {
        out = out.split(token).join(tokenValue);
      });
      return out.replace(/{{[^}]+}}/g, "").trim();
    };

    const sections = {
      summary: applyPlaceholders(candidate.summary),
      participation: applyPlaceholders(candidate.participation),
      whatWentWell: applyPlaceholders(candidate.whatWentWell),
      practiceChange: applyPlaceholders(candidate.practiceChange),
      challengesAndRecommendations: applyPlaceholders(candidate.challengesAndRecommendations),
      followUpPlan: applyPlaceholders(candidate.followUpPlan),
      nextImprovements: applyPlaceholders(candidate.nextImprovements),
    };

    // Guardrail: allow numeric values only when they already exist in facts/placeholders.
    const allowedNumericTokens = collectAllowedNumericTokens({
      facts,
      placeholders: Object.values(placeholders),
    });
    const observedTokens =
      Object.values(sections).join(" ").replaceAll(",", "").match(/\d+(?:\.\d+)?/g) ?? [];
    const hasUnknownNumericToken = observedTokens.some(
      (token) => !allowedNumericTokens.has(token),
    );
    if (hasUnknownNumericToken) {
      return deterministicNarrative(facts);
    }

    return {
      narrativeVersion: NARRATIVE_VERSION,
      generatedWithAi: true,
      sections,
    };
  } catch {
    return deterministicNarrative(facts);
  }
}

function buildHtmlReport(
  facts: TrainingReportFacts,
  narrative: TrainingReportNarrative,
  reportCode: string,
) {
  const section = narrative.sections;
  const geographyRows = facts.geographyBreakdown
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.region || "N/A")}</td>
        <td>${escapeHtml(row.subRegion || "N/A")}</td>
        <td>${escapeHtml(row.district || "N/A")}</td>
        <td>${row.trainingsCount}</td>
        <td>${row.schoolsCount}</td>
        <td>${row.participantsCount}</td>
      </tr>
    `,
    )
    .join("");

  const leaderRows = facts.leadersByCategory
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.category)}</td>
        <td>${row.total}</td>
        <td>${row.female}</td>
        <td>${row.male}</td>
      </tr>
    `,
    )
    .join("");

  const classRows = facts.teacherByClass
    .map((row) => `<li>${escapeHtml(row.classTaught)}: <strong>${row.total}</strong></li>`)
    .join("");
  const subjectRows = facts.teacherBySubject
    .map((row) => `<li>${escapeHtml(row.subjectTaught)}: <strong>${row.total}</strong></li>`)
    .join("");

  const quoteRows = facts.approvedQuotes
    .slice(0, 8)
    .map(
      (quote) => `
      <blockquote>
        <p>${escapeHtml(sentenceClip(quote.quote, 280))}</p>
        <footer>${escapeHtml(quote.role ?? "Participant")} • ${escapeHtml(quote.district ?? "District not listed")}</footer>
      </blockquote>
    `,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charSet="utf-8" />
  <title>${escapeHtml(reportCode)} - Training Report</title>
  <style>
    :root {
      --font-report: "Times New Roman", Calibri, Arial, sans-serif;
      --font-headings: Calibri, Arial, sans-serif;
      --text: #111827;
      --muted: #475569;
      --border: #dbe2ea;
      --surface: #f8fafc;
    }
    body {
      font-family: var(--font-report);
      color: var(--text);
      margin: 0;
      padding: 24px;
      line-height: 1.45;
      background: white;
    }
    h1, h2, h3 {
      font-family: var(--font-headings);
      margin: 0 0 8px;
      color: #0f172a;
    }
    h1 { font-size: 24px; }
    h2 { font-size: 16px; margin-top: 18px; }
    h3 { font-size: 13px; margin-top: 12px; }
    p { margin: 0 0 10px; }
    .meta {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 12px;
      background: var(--surface);
      display: grid;
      gap: 4px;
      margin-bottom: 14px;
      font-size: 12px;
      color: var(--muted);
    }
    .kpis {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin: 12px 0;
    }
    .kpis article {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px;
      background: var(--surface);
    }
    .kpis span {
      display: block;
      font-size: 11px;
      color: var(--muted);
      margin-bottom: 2px;
    }
    .kpis strong { font-size: 15px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 12px;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 6px;
      text-align: left;
      vertical-align: top;
    }
    th { background: #f1f5f9; font-family: var(--font-headings); }
    ul { margin: 6px 0 10px 18px; padding: 0; }
    blockquote {
      margin: 8px 0;
      padding: 8px 10px;
      border-left: 3px solid #2563eb;
      background: #eff6ff;
      border-radius: 6px;
    }
    blockquote p { margin: 0 0 4px; }
    blockquote footer { color: var(--muted); font-size: 11px; }
  </style>
</head>
<body>
  <h1>Training Report</h1>
  <div class="meta">
    <div><strong>Report Code:</strong> ${escapeHtml(reportCode)}</div>
    <div><strong>Scope:</strong> ${escapeHtml(facts.scopeLabel)}</div>
    <div><strong>Period:</strong> ${escapeHtml(facts.periodStart)} to ${escapeHtml(facts.periodEnd)}</div>
    <div><strong>Facts Version:</strong> ${escapeHtml(facts.factsVersion)} • <strong>Narrative Version:</strong> ${escapeHtml(narrative.narrativeVersion)} ${narrative.generatedWithAi ? "(AI assisted)" : "(template narrative)"}</div>
  </div>

  <div class="kpis">
    <article><span>Trainings</span><strong>${facts.trainingsCount}</strong></article>
    <article><span>Schools Trained</span><strong>${facts.schoolsTrainedCount}</strong></article>
    <article><span>Participants</span><strong>${facts.participantsTotal}</strong></article>
    <article><span>Approved Quotes</span><strong>${facts.approvedQuotes.length}</strong></article>
  </div>

  <h2>Summary</h2>
  <p>${escapeHtml(section.summary)}</p>
  <h2>Participation</h2>
  <p>${escapeHtml(section.participation)}</p>
  <h2>What Went Well</h2>
  <p>${escapeHtml(section.whatWentWell)}</p>
  <h2>How Practice Is Changing</h2>
  <p>${escapeHtml(section.practiceChange)}</p>
  <h2>Challenges And Recommendations</h2>
  <p>${escapeHtml(section.challengesAndRecommendations)}</p>
  <h2>Follow-up Plan</h2>
  <p>${escapeHtml(section.followUpPlan)}</p>
  <h2>Next Improvements</h2>
  <p>${escapeHtml(section.nextImprovements)}</p>

  <h2>Leadership Participation</h2>
  <table>
    <thead><tr><th>Category</th><th>Total</th><th>Female</th><th>Male</th></tr></thead>
    <tbody>${leaderRows || "<tr><td colspan='4'>No leadership rows in selected scope.</td></tr>"}</tbody>
  </table>

  <h2>Teacher Classes Taught</h2>
  <ul>${classRows || "<li>No teacher class snapshots captured.</li>"}</ul>
  <h2>Teacher Subjects Taught</h2>
  <ul>${subjectRows || "<li>No teacher subject snapshots captured.</li>"}</ul>

  <h2>Geography Breakdown</h2>
  <table>
    <thead><tr><th>Region</th><th>Sub-region</th><th>District</th><th>Trainings</th><th>Schools</th><th>Participants</th></tr></thead>
    <tbody>${geographyRows || "<tr><td colspan='6'>No geography rows in selected scope.</td></tr>"}</tbody>
  </table>

  <h2>Approved Quotes</h2>
  ${quoteRows || "<p>No approved quotes in this scope.</p>"}
</body>
</html>`;
}

function createPdfLines(
  facts: TrainingReportFacts,
  narrative: TrainingReportNarrative,
  reportCode: string,
) {
  const lines: string[] = [
    "Training Report",
    `Report Code: ${reportCode}`,
    `Scope: ${facts.scopeLabel}`,
    `Period: ${facts.periodStart} to ${facts.periodEnd}`,
    `Facts Version: ${facts.factsVersion}`,
    "",
    `Summary: ${narrative.sections.summary}`,
    "",
    `Participation: ${narrative.sections.participation}`,
    "",
    `What Went Well: ${narrative.sections.whatWentWell}`,
    "",
    `How Practice Is Changing: ${narrative.sections.practiceChange}`,
    "",
    `Challenges And Recommendations: ${narrative.sections.challengesAndRecommendations}`,
    "",
    `Follow-up Plan: ${narrative.sections.followUpPlan}`,
    "",
    `Next Improvements: ${narrative.sections.nextImprovements}`,
    "",
    `Trainings: ${facts.trainingsCount} | Schools: ${facts.schoolsTrainedCount} | Participants: ${facts.participantsTotal} | Teachers: ${facts.teachersTotal} | Leaders: ${facts.leadersTotal}`,
    "",
    "Top Feedback Themes:",
    ...facts.feedback.themes.slice(0, 8).map((theme) => `- ${theme.theme} (${theme.mentions})`),
    "",
    "Approved Quotes:",
    ...facts.approvedQuotes.slice(0, 6).map((quote) => `- "${sentenceClip(quote.quote, 180)}"`),
  ];
  return lines;
}

function wrapTextLine(text: string, maxWidth: number, font: { widthOfTextAtSize: (txt: string, size: number) => number }, fontSize: number) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [""];
  }
  const lines: string[] = [];
  let current = words[0] ?? "";
  for (let index = 1; index < words.length; index += 1) {
    const next = `${current} ${words[index]}`;
    if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[index] ?? "";
    }
  }
  lines.push(current);
  return lines;
}

async function generatePdfBytes(
  facts: TrainingReportFacts,
  narrative: TrainingReportNarrative,
  reportCode: string,
) {
  const doc = await PDFDocument.create();
  const serif = await embedPdfSerifFonts(doc);
  const sans = await embedPdfSansFonts(doc);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 50;
  const marginTop = 56;
  const marginBottom = 52;
  const maxWidth = pageWidth - marginX * 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let cursorY = pageHeight - marginTop;

  const ensureSpace = (needed: number) => {
    if (cursorY - needed < marginBottom) {
      page = doc.addPage([pageWidth, pageHeight]);
      cursorY = pageHeight - marginTop;
    }
  };

  const drawTextWrapped = (
    text: string,
    options: {
      size: number;
      lineHeight: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
    },
  ) => {
    const font = options.bold ? sans.bold : serif.regular;
    const wrapped = wrapTextLine(text, maxWidth, font, options.size);
    wrapped.forEach((line) => {
      ensureSpace(options.lineHeight);
      page.drawText(line, {
        x: marginX,
        y: cursorY,
        size: options.size,
        font,
        color: options.color ?? rgb(0.05, 0.05, 0.05),
      });
      cursorY -= options.lineHeight;
    });
  };

  drawTextWrapped("Training Report", { size: 18, lineHeight: 22, bold: true, color: rgb(0.05, 0.1, 0.2) });
  drawTextWrapped(`Report Code: ${reportCode}`, { size: 11, lineHeight: 14 });
  drawTextWrapped(`Scope: ${facts.scopeLabel}`, { size: 11, lineHeight: 14 });
  drawTextWrapped(`Period: ${facts.periodStart} to ${facts.periodEnd}`, { size: 11, lineHeight: 14 });
  cursorY -= 4;

  createPdfLines(facts, narrative, reportCode).forEach((line) => {
    const isHeading =
      line === "Training Report" ||
      line === "Top Feedback Themes:" ||
      line === "Approved Quotes:" ||
      line.startsWith("Summary:") ||
      line.startsWith("Participation:") ||
      line.startsWith("What Went Well:") ||
      line.startsWith("How Practice Is Changing:") ||
      line.startsWith("Challenges And Recommendations:") ||
      line.startsWith("Follow-up Plan:") ||
      line.startsWith("Next Improvements:");
    drawTextWrapped(line, {
      size: isHeading ? 11.5 : 10.5,
      lineHeight: isHeading ? 15 : 13,
      bold: isHeading,
    });
    if (line === "") {
      cursorY -= 2;
    }
  });

  return doc.save();
}

async function savePdfToDisk(reportCode: string, pdfBytes: Uint8Array) {
  const folder = path.join(process.cwd(), "data", "training", "reports");
  await fs.mkdir(folder, { recursive: true });
  const safeCode = reportCode.replace(/[^a-zA-Z0-9_-]/g, "_");
  const storedPath = path.join(folder, `${safeCode}.pdf`);
  await fs.writeFile(storedPath, Buffer.from(pdfBytes));
  return storedPath;
}

function parseArtifactRow(row: {
  id: number;
  reportCode: string;
  scopeType: TrainingReportScopeType;
  scopeValue: string;
  periodStart: string;
  periodEnd: string;
  factsJson: string;
  narrativeJson: string;
  htmlReport: string;
  pdfStoredPath: string | null;
  generatedByUserId: number;
  generatedByName: string;
  generatedAt: string;
  updatedAt: string;
}): TrainingReportArtifactRecord {
  return {
    id: Number(row.id),
    reportCode: row.reportCode,
    scopeType: row.scopeType,
    scopeValue: row.scopeValue,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    facts: JSON.parse(row.factsJson) as TrainingReportFacts,
    narrative: JSON.parse(row.narrativeJson) as TrainingReportNarrative,
    htmlReport: row.htmlReport,
    pdfStoredPath: row.pdfStoredPath ?? null,
    generatedByUserId: Number(row.generatedByUserId),
    generatedByName: row.generatedByName,
    generatedAt: row.generatedAt,
    updatedAt: row.updatedAt,
  };
}

function collectTrainingFacts(input: {
  scopeType: TrainingReportScopeType;
  scopeValue?: string;
  periodStart?: string;
  periodEnd?: string;
  includeObservedInsights?: boolean;
}): TrainingReportFacts {
  const window = resolvePeriodWindow(input);
  const db = getDb();
  const whereClauses = [
    "pr.module = 'training'",
    "pr.deleted_at IS NULL",
    "date(pr.date) >= date(@periodStart)",
    "date(pr.date) <= date(@periodEnd)",
  ];
  const params: Record<string, string | number> = {
    periodStart: window.periodStart,
    periodEnd: window.periodEnd,
  };

  if (input.scopeType === "training_session") {
    whereClauses.push("pr.id = @trainingRecordId");
    params.trainingRecordId = Number(window.scopeValue);
  } else if (input.scopeType === "district") {
    whereClauses.push("lower(trim(COALESCE(sd.district, pr.district))) = lower(trim(@district))");
    params.district = window.scopeValue;
  } else if (input.scopeType === "region") {
    whereClauses.push("lower(trim(COALESCE(sd.region, ''))) = lower(trim(@region))");
    params.region = window.scopeValue;
  } else if (input.scopeType === "sub_region") {
    whereClauses.push("lower(trim(COALESCE(sd.sub_region, ''))) = lower(trim(@subRegion))");
    params.subRegion = window.scopeValue;
  }

  const trainingRows = db
    .prepare(
      `
      SELECT
        pr.id,
        pr.date,
        pr.school_id AS schoolId,
        COALESCE(sd.name, pr.school_name) AS schoolName,
        COALESCE(sd.district, pr.district) AS district,
        COALESCE(sd.region, '') AS region,
        COALESCE(sd.sub_region, '') AS subRegion,
        pr.follow_up_date AS followUpDate,
        pr.follow_up_type AS followUpType,
        pr.follow_up_owner_user_id AS followUpOwnerUserId,
        pu.full_name AS followUpOwnerName
      FROM portal_records pr
      LEFT JOIN schools_directory sd ON sd.id = pr.school_id
      LEFT JOIN portal_users pu ON pu.id = pr.follow_up_owner_user_id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY pr.date ASC, pr.id ASC
      `,
    )
    .all(params) as Array<{
      id: number;
      date: string;
      schoolId: number | null;
      schoolName: string;
      district: string;
      region: string;
      subRegion: string;
      followUpDate: string | null;
      followUpType: string | null;
      followUpOwnerUserId: number | null;
      followUpOwnerName: string | null;
    }>;

  if (trainingRows.length === 0) {
    throw new Error("No training records found in the selected scope and period.");
  }

  const trainingIds = trainingRows.map((row) => Number(row.id));
  const { clause: trainingClause, params: trainingParams } = buildSqlInClause(trainingIds, "trainingId");

  const participantSummary = db
    .prepare(
      `
      SELECT
        COUNT(*) AS participantsTotal,
        SUM(CASE WHEN lower(trim(pta.participant_role)) = 'classroom teacher' THEN 1 ELSE 0 END) AS teachersTotal,
        SUM(CASE WHEN lower(trim(pta.participant_role)) = 'school leader' THEN 1 ELSE 0 END) AS leadersTotal,
        SUM(CASE WHEN lower(trim(COALESCE(pta.gender, sc.gender, ''))) = 'female' THEN 1 ELSE 0 END) AS femaleTotal,
        SUM(CASE WHEN lower(trim(COALESCE(pta.gender, sc.gender, ''))) = 'male' THEN 1 ELSE 0 END) AS maleTotal
      FROM portal_training_attendance pta
      LEFT JOIN school_contacts sc ON sc.contact_id = pta.contact_id
      WHERE pta.portal_record_id IN (${trainingClause})
      `,
    )
    .get(trainingParams) as {
      participantsTotal: number | null;
      teachersTotal: number | null;
      leadersTotal: number | null;
      femaleTotal: number | null;
      maleTotal: number | null;
    };

  const leadersByCategory = db
    .prepare(
      `
      SELECT
        COALESCE(sc.category, 'School Leader') AS category,
        COUNT(*) AS total,
        SUM(CASE WHEN lower(trim(COALESCE(pta.gender, sc.gender, ''))) = 'female' THEN 1 ELSE 0 END) AS female,
        SUM(CASE WHEN lower(trim(COALESCE(pta.gender, sc.gender, ''))) = 'male' THEN 1 ELSE 0 END) AS male
      FROM portal_training_attendance pta
      LEFT JOIN school_contacts sc ON sc.contact_id = pta.contact_id
      WHERE pta.portal_record_id IN (${trainingClause})
        AND lower(trim(pta.participant_role)) = 'school leader'
      GROUP BY COALESCE(sc.category, 'School Leader')
      ORDER BY total DESC, category ASC
      `,
    )
    .all(trainingParams) as Array<{
      category: string;
      total: number;
      female: number;
      male: number;
    }>;

  const teacherByClass = db
    .prepare(
      `
      SELECT
        COALESCE(NULLIF(trim(sc.class_taught), ''), 'Not specified') AS classTaught,
        COUNT(*) AS total
      FROM portal_training_attendance pta
      LEFT JOIN school_contacts sc ON sc.contact_id = pta.contact_id
      WHERE pta.portal_record_id IN (${trainingClause})
        AND lower(trim(pta.participant_role)) = 'classroom teacher'
      GROUP BY COALESCE(NULLIF(trim(sc.class_taught), ''), 'Not specified')
      ORDER BY total DESC, classTaught ASC
      LIMIT 20
      `,
    )
    .all(trainingParams) as Array<{ classTaught: string; total: number }>;

  const teacherBySubject = db
    .prepare(
      `
      SELECT
        COALESCE(NULLIF(trim(sc.subject_taught), ''), 'Not specified') AS subjectTaught,
        COUNT(*) AS total
      FROM portal_training_attendance pta
      LEFT JOIN school_contacts sc ON sc.contact_id = pta.contact_id
      WHERE pta.portal_record_id IN (${trainingClause})
        AND lower(trim(pta.participant_role)) = 'classroom teacher'
      GROUP BY COALESCE(NULLIF(trim(sc.subject_taught), ''), 'Not specified')
      ORDER BY total DESC, subjectTaught ASC
      LIMIT 20
      `,
    )
    .all(trainingParams) as Array<{ subjectTaught: string; total: number }>;

  const geographyBreakdown = db
    .prepare(
      `
      SELECT
        COALESCE(sd.region, '') AS region,
        COALESCE(sd.sub_region, '') AS subRegion,
        COALESCE(sd.district, pr.district) AS district,
        COUNT(DISTINCT pr.id) AS trainingsCount,
        COUNT(DISTINCT pr.school_id) AS schoolsCount,
        COUNT(pta.id) AS participantsCount
      FROM portal_records pr
      LEFT JOIN schools_directory sd ON sd.id = pr.school_id
      LEFT JOIN portal_training_attendance pta ON pta.portal_record_id = pr.id
      WHERE pr.id IN (${trainingClause})
      GROUP BY COALESCE(sd.region, ''), COALESCE(sd.sub_region, ''), COALESCE(sd.district, pr.district)
      ORDER BY trainingsCount DESC, district ASC
      `,
    )
    .all(trainingParams) as Array<{
      region: string;
      subRegion: string;
      district: string;
      trainingsCount: number;
      schoolsCount: number;
      participantsCount: number;
    }>;

  const feedbackRows = db
    .prepare(
      `
      SELECT
        tf.feedback_role AS feedbackRole,
        tf.what_went_well AS whatWentWell,
        tf.how_training_changed_teaching AS howTrainingChangedTeaching,
        tf.what_you_will_do_to_improve_reading_levels AS whatYouWillDoToImproveReadingLevels,
        tf.challenges,
        tf.recommendations_next_training AS recommendationsNextTraining
      FROM training_feedback_entries tf
      WHERE tf.training_record_id IN (${trainingClause})
      `,
    )
    .all(trainingParams) as Array<{
      feedbackRole: "participant" | "trainer";
      whatWentWell: string | null;
      howTrainingChangedTeaching: string | null;
      whatYouWillDoToImproveReadingLevels: string | null;
      challenges: string | null;
      recommendationsNextTraining: string | null;
    }>;

  const themeTexts = feedbackRows.flatMap((row) => [
    row.whatWentWell,
    row.howTrainingChangedTeaching,
    row.whatYouWillDoToImproveReadingLevels,
    row.challenges,
    row.recommendationsNextTraining,
  ]).map((text) => stripText(text)).filter(Boolean);
  const themes = extractFeedbackThemes(themeTexts);

  const approvedQuotes = db
    .prepare(
      `
      SELECT
        pt.story_text AS quote,
        pt.storyteller_role AS role,
        pt.district,
        pt.school_name AS schoolName
      FROM portal_testimonials pt
      WHERE pt.source_training_record_id IN (${trainingClause})
        AND pt.source_type = 'training_feedback'
        AND COALESCE(pt.moderation_status, 'approved') = 'approved'
      ORDER BY pt.created_at DESC, pt.id DESC
      LIMIT 20
      `,
    )
    .all(trainingParams) as Array<{
      quote: string;
      role: string | null;
      district: string | null;
      schoolName: string | null;
    }>;

  const approvedQuoteFallback = approvedQuotes.length > 0
    ? approvedQuotes
    : feedbackRows
      .flatMap((row) => [row.howTrainingChangedTeaching, row.whatYouWillDoToImproveReadingLevels])
      .map((quote) => stripText(quote))
      .filter((quote) => quote.length >= 20)
      .slice(0, 10)
      .map((quote) => ({
        quote,
        role: "Participant",
        district: null,
        schoolName: null,
      }));

  const schoolIds = [...new Set(trainingRows.map((row) => Number(row.schoolId ?? 0)).filter((id) => id > 0))];
  let observedAfterTraining: { coachingVisitsCount: number; assessmentSessionsCount: number } | null = null;
  if ((input.includeObservedInsights ?? true) && schoolIds.length > 0) {
    const { clause: schoolClause, params: schoolParams } = buildSqlInClause(schoolIds, "reportSchoolId");
    const periodEndDate = new Date(`${window.periodEnd}T00:00:00.000Z`);
    periodEndDate.setUTCDate(periodEndDate.getUTCDate() + 120);
    const observedEnd = toIsoDate(periodEndDate);

    const coachingRow = db
      .prepare(
        `
        SELECT COUNT(*) AS total
        FROM coaching_visits
        WHERE school_id IN (${schoolClause})
          AND date(visit_date) >= date(@observedStart)
          AND date(visit_date) <= date(@observedEnd)
        `,
      )
      .get({
        ...schoolParams,
        observedStart: window.periodStart,
        observedEnd,
      }) as { total: number | null };

    const assessmentRow = db
      .prepare(
        `
        SELECT COUNT(*) AS total
        FROM assessment_sessions
        WHERE school_id IN (${schoolClause})
          AND date(assessment_date) >= date(@observedStart)
          AND date(assessment_date) <= date(@observedEnd)
        `,
      )
      .get({
        ...schoolParams,
        observedStart: window.periodStart,
        observedEnd,
      }) as { total: number | null };

    observedAfterTraining = {
      coachingVisitsCount: Number(coachingRow?.total ?? 0),
      assessmentSessionsCount: Number(assessmentRow?.total ?? 0),
    };
  }

  return {
    factsVersion: FACTS_VERSION,
    scopeType: input.scopeType,
    scopeValue: window.scopeValue,
    scopeLabel: window.scopeLabel,
    periodStart: window.periodStart,
    periodEnd: window.periodEnd,
    trainingsCount: trainingRows.length,
    schoolsTrainedCount: new Set(trainingRows.map((row) => Number(row.schoolId ?? 0)).filter((id) => id > 0)).size,
    participantsTotal: Number(participantSummary?.participantsTotal ?? 0),
    teachersTotal: Number(participantSummary?.teachersTotal ?? 0),
    leadersTotal: Number(participantSummary?.leadersTotal ?? 0),
    femaleTotal: Number(participantSummary?.femaleTotal ?? 0),
    maleTotal: Number(participantSummary?.maleTotal ?? 0),
    teacherByClass: teacherByClass.map((row) => ({
      classTaught: row.classTaught,
      total: Number(row.total),
    })),
    teacherBySubject: teacherBySubject.map((row) => ({
      subjectTaught: row.subjectTaught,
      total: Number(row.total),
    })),
    leadersByCategory: leadersByCategory.map((row) => ({
      category: row.category,
      total: Number(row.total),
      female: Number(row.female),
      male: Number(row.male),
    })),
    geographyBreakdown: geographyBreakdown.map((row) => ({
      region: row.region || "N/A",
      subRegion: row.subRegion || "N/A",
      district: row.district || "N/A",
      trainingsCount: Number(row.trainingsCount),
      schoolsCount: Number(row.schoolsCount),
      participantsCount: Number(row.participantsCount),
    })),
    followUpPlans: trainingRows.map((row) => ({
      trainingRecordId: Number(row.id),
      trainingDate: row.date,
      schoolName: row.schoolName || "Unknown school",
      district: row.district || "Unknown district",
      followUpDate: row.followUpDate ?? null,
      followUpType: row.followUpType ?? null,
      followUpOwner: row.followUpOwnerName ?? null,
    })),
    feedback: {
      participantRows: feedbackRows.filter((row) => row.feedbackRole === "participant").length,
      trainerRows: feedbackRows.filter((row) => row.feedbackRole === "trainer").length,
      changedTeachingRows: feedbackRows.filter((row) => stripText(row.howTrainingChangedTeaching).length > 0).length,
      improveReadingRows: feedbackRows.filter((row) => stripText(row.whatYouWillDoToImproveReadingLevels).length > 0).length,
      challengesRows: feedbackRows.filter((row) => stripText(row.challenges).length > 0).length,
      recommendationsRows: feedbackRows.filter((row) => stripText(row.recommendationsNextTraining).length > 0).length,
      themes,
    },
    observedAfterTraining,
    approvedQuotes: approvedQuoteFallback.map((row) => ({
      quote: stripText(row.quote),
      role: row.role ?? null,
      district: row.district ?? null,
      schoolName: row.schoolName ?? null,
    })),
  };
}

export async function generateTrainingReportArtifact(input: {
  user: PortalUser;
  scopeType: TrainingReportScopeType;
  scopeValue?: string;
  periodStart?: string;
  periodEnd?: string;
  includeObservedInsights?: boolean;
}) {
  const facts = collectTrainingFacts({
    scopeType: input.scopeType,
    scopeValue: input.scopeValue,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    includeObservedInsights: input.includeObservedInsights,
  });
  const narrative = await aiNarrative(facts);
  const reportCode = `TRN-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const htmlReport = buildHtmlReport(facts, narrative, reportCode);
  const pdfBytes = await generatePdfBytes(facts, narrative, reportCode);
  const pdfStoredPath = await savePdfToDisk(reportCode, pdfBytes);

  const db = getDb();
  const now = new Date().toISOString();
  const insertResult = db
    .prepare(
      `
      INSERT INTO training_report_artifacts (
        report_code,
        scope_type,
        scope_value,
        period_start,
        period_end,
        facts_json,
        narrative_json,
        html_report,
        pdf_stored_path,
        generated_by_user_id,
        generated_at,
        updated_at
      ) VALUES (
        @reportCode,
        @scopeType,
        @scopeValue,
        @periodStart,
        @periodEnd,
        @factsJson,
        @narrativeJson,
        @htmlReport,
        @pdfStoredPath,
        @generatedByUserId,
        @generatedAt,
        @updatedAt
      )
      `,
    )
    .run({
      reportCode,
      scopeType: facts.scopeType,
      scopeValue: facts.scopeValue,
      periodStart: facts.periodStart,
      periodEnd: facts.periodEnd,
      factsJson: JSON.stringify(facts),
      narrativeJson: JSON.stringify(narrative),
      htmlReport,
      pdfStoredPath,
      generatedByUserId: input.user.id,
      generatedAt: now,
      updatedAt: now,
    });

  const artifactId = Number(insertResult.lastInsertRowid);
  logAuditEvent(
    input.user.id,
    input.user.fullName,
    "generate_training_report",
    "training_report_artifacts",
    artifactId,
    null,
    JSON.stringify({
      reportCode,
      scopeType: facts.scopeType,
      scopeValue: facts.scopeValue,
      periodStart: facts.periodStart,
      periodEnd: facts.periodEnd,
      generatedWithAi: narrative.generatedWithAi,
    }),
    "Generated training report artifact.",
  );

  return getTrainingReportArtifactByCode(reportCode);
}

export function listTrainingReportArtifacts(filters?: {
  scopeType?: TrainingReportScopeType;
  scopeValue?: string;
  limit?: number;
}) {
  const clauses: string[] = [];
  const params: Record<string, string | number> = {};
  if (filters?.scopeType) {
    clauses.push("tra.scope_type = @scopeType");
    params.scopeType = filters.scopeType;
  }
  if (filters?.scopeValue?.trim()) {
    clauses.push("lower(trim(tra.scope_value)) = lower(trim(@scopeValue))");
    params.scopeValue = filters.scopeValue.trim();
  }
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Math.max(1, Math.min(filters?.limit ?? 60, 500));
  const rows = getDb()
    .prepare(
      `
      SELECT
        tra.id,
        tra.report_code AS reportCode,
        tra.scope_type AS scopeType,
        tra.scope_value AS scopeValue,
        tra.period_start AS periodStart,
        tra.period_end AS periodEnd,
        tra.facts_json AS factsJson,
        tra.narrative_json AS narrativeJson,
        tra.html_report AS htmlReport,
        tra.pdf_stored_path AS pdfStoredPath,
        tra.generated_by_user_id AS generatedByUserId,
        pu.full_name AS generatedByName,
        tra.generated_at AS generatedAt,
        tra.updated_at AS updatedAt
      FROM training_report_artifacts tra
      JOIN portal_users pu ON pu.id = tra.generated_by_user_id
      ${whereClause}
      ORDER BY tra.generated_at DESC, tra.id DESC
      LIMIT ${limit}
      `,
    )
    .all(params) as Array<{
      id: number;
      reportCode: string;
      scopeType: TrainingReportScopeType;
      scopeValue: string;
      periodStart: string;
      periodEnd: string;
      factsJson: string;
      narrativeJson: string;
      htmlReport: string;
      pdfStoredPath: string | null;
      generatedByUserId: number;
      generatedByName: string;
      generatedAt: string;
      updatedAt: string;
    }>;

  return rows.map((row) => parseArtifactRow(row));
}

export function getTrainingReportArtifactByCode(reportCode: string) {
  const row = getDb()
    .prepare(
      `
      SELECT
        tra.id,
        tra.report_code AS reportCode,
        tra.scope_type AS scopeType,
        tra.scope_value AS scopeValue,
        tra.period_start AS periodStart,
        tra.period_end AS periodEnd,
        tra.facts_json AS factsJson,
        tra.narrative_json AS narrativeJson,
        tra.html_report AS htmlReport,
        tra.pdf_stored_path AS pdfStoredPath,
        tra.generated_by_user_id AS generatedByUserId,
        pu.full_name AS generatedByName,
        tra.generated_at AS generatedAt,
        tra.updated_at AS updatedAt
      FROM training_report_artifacts tra
      JOIN portal_users pu ON pu.id = tra.generated_by_user_id
      WHERE tra.report_code = @reportCode
      LIMIT 1
      `,
    )
    .get({ reportCode: reportCode.trim() }) as
    | {
      id: number;
      reportCode: string;
      scopeType: TrainingReportScopeType;
      scopeValue: string;
      periodStart: string;
      periodEnd: string;
      factsJson: string;
      narrativeJson: string;
      htmlReport: string;
      pdfStoredPath: string | null;
      generatedByUserId: number;
      generatedByName: string;
      generatedAt: string;
      updatedAt: string;
    }
    | undefined;

  if (!row) {
    return null;
  }
  return parseArtifactRow(row);
}

export async function readTrainingReportPdf(reportCode: string) {
  const artifact = getTrainingReportArtifactByCode(reportCode);
  if (!artifact?.pdfStoredPath) {
    return null;
  }
  const bytes = await fs.readFile(artifact.pdfStoredPath);
  return {
    artifact,
    bytes,
  };
}

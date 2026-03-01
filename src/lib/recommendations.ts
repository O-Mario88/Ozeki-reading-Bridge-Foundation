/**
 * NLIS Recommendation Catalog
 *
 * Evidence-based recommendations mapped to fidelity/outcome signals.
 * Used by the AI narrative engine (with guardrails) and the School Action Center.
 * Each recommendation has conditions, priority, and suggested actions.
 */

import type { ReadingLevelsBlock } from "@/lib/types";

export type RecommendationCategory =
    | "coaching"
    | "training"
    | "assessment"
    | "materials"
    | "leadership"
    | "intervention"
    | "data_quality";

export interface Recommendation {
    id: string;
    category: RecommendationCategory;
    title: string;
    description: string;
    actions: string[];
    conditions: {
        fidelityBelow?: number;
        fidelityAbove?: number;
        domainGainBelow?: number;
        missingBaseline?: boolean;
        missingEndline?: boolean;
        lowObservation?: boolean;
        highOutliers?: boolean;
    };
    priority: "high" | "medium" | "low";
}

export const RECOMMENDATION_CATALOG: Recommendation[] = [
    // Coaching
    {
        id: "REC-COACH-001",
        category: "coaching",
        title: "Increase coaching frequency",
        description: "Schools with fewer than 2 coaching visits per term show significantly lower fidelity scores.",
        actions: [
            "Schedule at least 2 coaching visits per term",
            "Pair under-visited schools with nearby trained coaches",
            "Use the coaching checklist to structure visits",
        ],
        conditions: { fidelityBelow: 50 },
        priority: "high",
    },
    {
        id: "REC-COACH-002",
        category: "coaching",
        title: "Focus coaching on literacy block structure",
        description: "Teachers are implementing individual activities but not following the structured literacy block sequence.",
        actions: [
            "Model a full 45-minute literacy block during coaching visit",
            "Provide a printed lesson sequence guide",
            "Observe and give feedback on time allocation",
        ],
        conditions: { fidelityBelow: 60, lowObservation: true },
        priority: "medium",
    },

    // Training
    {
        id: "REC-TRAIN-001",
        category: "training",
        title: "Conduct refresher training on assessment",
        description: "High outlier rates in assessment data suggest teachers may not be following scoring protocols.",
        actions: [
            "Organize a 1-day refresher on assessment administration",
            "Provide standardized scoring rubrics and practice items",
            "Pair new assessors with experienced ones for calibration",
        ],
        conditions: { highOutliers: true },
        priority: "high",
    },

    // Assessment
    {
        id: "REC-ASSESS-001",
        category: "assessment",
        title: "Complete missing baseline assessments",
        description: "Schools without baseline data cannot demonstrate learning gains — this undermines evidence credibility.",
        actions: [
            "Prioritize baseline assessments in the next 4 weeks",
            "Deploy data clerks or trained volunteers",
            "Use simplified assessments for catch-up cohorts",
        ],
        conditions: { missingBaseline: true },
        priority: "high",
    },
    {
        id: "REC-ASSESS-002",
        category: "assessment",
        title: "Schedule endline assessments",
        description: "Schools with baselines but no endlines represent incomplete evidence cycles.",
        actions: [
            "Schedule endline assessments for end of term",
            "Ensure same learners are assessed at endline (use child IDs)",
            "Report results to school leaders within 2 weeks",
        ],
        conditions: { missingEndline: true },
        priority: "high",
    },

    // Materials
    {
        id: "REC-MAT-001",
        category: "materials",
        title: "Distribute decodable readers",
        description: "Schools reporting low phonics/decoding gains likely lack sufficient practice materials.",
        actions: [
            "Distribute at least 1 decodable reader per 3 learners",
            "Train teachers on how to use decodable readers in guided reading",
            "Set up a classroom reading corner with labeled levels",
        ],
        conditions: { domainGainBelow: 5 },
        priority: "medium",
    },

    // Leadership
    {
        id: "REC-LEAD-001",
        category: "leadership",
        title: "Engage school leaders in reading timetable",
        description: "Implementation fidelity improves when school leaders actively protect reading instruction time.",
        actions: [
            "Meet with head teacher to review timetable allocation",
            "Propose a minimum 30-minute daily reading block",
            "Share the reading time policy brief",
        ],
        conditions: { fidelityBelow: 40 },
        priority: "medium",
    },

    // Intervention
    {
        id: "REC-INTV-001",
        category: "intervention",
        title: "Set up catch-up reading groups",
        description: "Learners scoring below benchmark at endline need structured remedial intervention to close the gap.",
        actions: [
            "Identify learners scoring below 42% at endline",
            "Form small groups (max 8 learners) by skill level",
            "Assign 3 sessions/week using the catch-up curriculum",
            "Reassess after 6 weeks",
        ],
        conditions: { domainGainBelow: 0 },
        priority: "high",
    },

    // Data Quality
    {
        id: "REC-DQ-001",
        category: "data_quality",
        title: "Resolve duplicate learner records",
        description: "Duplicate learner IDs inflate sample sizes and distort gain calculations.",
        actions: [
            "Run deduplication check on learner registry",
            "Merge or flag duplicate entries",
            "Review data entry protocols with clerks",
        ],
        conditions: { highOutliers: true },
        priority: "medium",
    },

    // Positive reinforcement
    {
        id: "REC-POS-001",
        category: "coaching",
        title: "Recognize and share best practices",
        description: "Schools with strong fidelity scores demonstrate effective implementation.",
        actions: [
            "Document the school's successful practices as a case study",
            "Invite the school to present at the next cluster meeting",
            "Share anonymized results with government stakeholders",
        ],
        conditions: { fidelityAbove: 75 },
        priority: "low",
    },
];

/**
 * Match recommendations to current signals
 */
export function getApplicableRecommendations(signals: {
    fidelityScore: number;
    domainGains: Array<{ domain: string; change: number | null }>;
    schoolsMissingBaseline: number;
    schoolsMissingEndline: number;
    outlierCount: number;
    observationCoverage: number;
}): Recommendation[] {
    return RECOMMENDATION_CATALOG.filter((rec) => {
        const c = rec.conditions;
        if (c.fidelityBelow !== undefined && signals.fidelityScore >= c.fidelityBelow) return false;
        if (c.fidelityAbove !== undefined && signals.fidelityScore < c.fidelityAbove) return false;
        if (c.missingBaseline && signals.schoolsMissingBaseline === 0) return false;
        if (c.missingEndline && signals.schoolsMissingEndline === 0) return false;
        if (c.highOutliers && signals.outlierCount === 0) return false;
        if (c.lowObservation && signals.observationCoverage > 50) return false;
        if (c.domainGainBelow !== undefined) {
            const hasLow = signals.domainGains.some((d) => d.change !== null && d.change < c.domainGainBelow!);
            if (!hasLow) return false;
        }
        return true;
    }).sort((a, b) => {
        const priority = { high: 0, medium: 1, low: 2 };
        return priority[a.priority] - priority[b.priority];
    });
}

/**
 * AI Narrative Guardrails
 *
 * Rules that constrain AI-generated narrative text in reports.
 * These ensure outputs are evidence-based, measured, and privacy-compliant.
 */
export const AI_GUARDRAILS = {
    maxWordsPerSection: 300,
    maxBulletPoints: 8,
    requiredDisclosures: [
        "This narrative is generated from aggregated program data and verified metrics.",
        "Individual learner or teacher identities are never included.",
    ],
    bannedPhrases: [
        "guaranteed",
        "proven to",
        "always",
        "never",
        "100%",
        "all children",
        "every teacher",
        "solves",
        "eliminates",
        "cures",
    ],
    toneGuidelines: [
        "Use measured, evidence-based language",
        "Present gains as percentage-point changes, not percentages of change",
        "Acknowledge limitations and sample sizes",
        "Avoid superlatives unless backed by specific data",
        "Use 'suggests' or 'indicates' rather than 'proves'",
        "Motivate action by clarifying what the data suggests to do next, without exaggerating or inventing success",
    ],
    privacyRules: [
        "Never include child names, IDs, or identifiable information",
        "Aggregate to minimum group size of 10 before reporting",
        "Use school-level or district-level granularity maximum in public reports",
        "Consent status must be checked before including media references",
    ],
};

/**
 * Validate AI-generated text against guardrails
 */
export function validateNarrative(text: string): {
    isValid: boolean;
    violations: string[];
} {
    const violations: string[] = [];

    // Word count check
    const wordCount = text.split(/\s+/).length;
    if (wordCount > AI_GUARDRAILS.maxWordsPerSection) {
        violations.push(`Exceeds ${AI_GUARDRAILS.maxWordsPerSection} word limit (${wordCount} words)`);
    }

    // Banned phrase check
    const lowerText = text.toLowerCase();
    AI_GUARDRAILS.bannedPhrases.forEach((phrase) => {
        if (lowerText.includes(phrase.toLowerCase())) {
            violations.push(`Contains banned phrase: "${phrase}"`);
        }
    });

    return {
        isValid: violations.length === 0,
        violations,
    };
}

/**
 * Build a structured prompt context for AI report generation
 */
export function buildReportPromptContext(
    scopeType: string,
    scopeId: string,
    metrics: {
        fidelityScore: number;
        fidelityBand: string;
        learningGains: Array<{ domain: string; change: number | null; sampleSize: number }>;
        schoolImprovementIndex: number | null;
        totalCost: number;
        costPerSchool: number | null;
        schoolsSupported: number;
        learnersAssessed: number;
        readingLevels?: ReadingLevelsBlock | null;
    },
    recommendations: Recommendation[],
): string {
    const lines: string[] = [
        `# Report Context: ${scopeType} — ${scopeId}`,
        "",
        `## Key Metrics`,
        `- Fidelity Score: ${metrics.fidelityScore}/100 (${metrics.fidelityBand})`,
        `- Schools Supported: ${metrics.schoolsSupported}`,
        `- Learners Assessed: ${metrics.learnersAssessed}`,
        `- School Improvement Index: ${metrics.schoolImprovementIndex !== null ? `${metrics.schoolImprovementIndex.toFixed(1)}pp` : "Insufficient data"}`,
        "",
        `## Learning Gains by Domain`,
    ];

    metrics.learningGains.forEach((g) => {
        lines.push(`- ${g.domain}: ${g.change !== null ? `${g.change > 0 ? "+" : ""}${g.change.toFixed(1)}pp` : "N/A"} (n=${g.sampleSize})`);
    });

    lines.push("", `## Cost Summary`);
    lines.push(`- Total: $${metrics.totalCost.toLocaleString()}`);
    if (metrics.costPerSchool) lines.push(`- Per school: $${metrics.costPerSchool.toLocaleString()}`);

    lines.push("", `## Recommended Actions (top ${Math.min(recommendations.length, 5)})`);
    recommendations.slice(0, 5).forEach((rec, i) => {
        lines.push(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.title}: ${rec.description}`);
    });

    lines.push("", "## Guardrails");
    lines.push(...AI_GUARDRAILS.toneGuidelines.map((g) => `- ${g}`));
    lines.push("", "## Required Disclosures");
    lines.push(...AI_GUARDRAILS.requiredDisclosures.map((d) => `- ${d}`));

    // Reading Levels context
    if (metrics.readingLevels && metrics.readingLevels.distribution.length > 0) {
        lines.push("", "## Reading Levels");
        for (const dist of metrics.readingLevels.distribution) {
            const parts = metrics.readingLevels.levels
                .map((l) => `${l.label}: ${dist.percents[l.label] ?? 0}%`)
                .join(", ");
            lines.push(`- ${dist.cycle} (n=${dist.n}): ${parts}`);
        }
        if (metrics.readingLevels.movement) {
            const m = metrics.readingLevels.movement;
            lines.push(`- Movement (n=${m.n_matched}): ${m.moved_up_1plus_percent}% up ≥1 level, ${m.stayed_same_percent}% same, ${m.moved_down_percent}% down`);
        }
    }

    return lines.join("\n");
}

/* ─── Extended Recommendation Catalog (REC-01..REC-20) ─── */

export interface ExtendedRecommendation {
    id: string; // "REC-01" .. "REC-20"
    title: string;
    description: string;
    priority: "High" | "Medium" | "Low";
    actions: string[];
}

/**
 * Full 20-item recommendation catalog for AI-generated impact reports.
 * These use the `REC-XX` ID scheme and are referenced by the JSON report schema.
 */
export const EXTENDED_RECOMMENDATION_CATALOG: ExtendedRecommendation[] = [
    {
        id: "REC-01",
        title: "Establish catch-up reading groups",
        description: "Learners classified as Non-Reader or Emerging at endline need intensive, structured remedial support.",
        priority: "High",
        actions: ["Form small groups (max 8) by skill level", "Assign 3 sessions/week with catch-up curriculum", "Reassess after 6 weeks"],
    },
    {
        id: "REC-02",
        title: "Distribute decodable readers",
        description: "Schools with high Developing-level learners lack sufficient practice materials for decoding fluency.",
        priority: "Medium",
        actions: ["Distribute at least 1 decodable reader per 3 learners", "Train teachers on guided reading with decodable texts", "Set up classroom reading corners with labeled levels"],
    },
    {
        id: "REC-03",
        title: "Increase coaching visit frequency",
        description: "Schools with fewer than 2 coaching visits per term show significantly lower fidelity and outcomes.",
        priority: "High",
        actions: ["Schedule at least 2 coaching visits per term", "Pair under-visited schools with nearby trained coaches", "Use the coaching checklist to structure visits"],
    },
    {
        id: "REC-04",
        title: "Focus coaching on literacy block structure",
        description: "Teachers are implementing activities but not following the structured literacy block sequence.",
        priority: "Medium",
        actions: ["Model a full 45-minute literacy block during visit", "Provide printed lesson sequence guide", "Observe and give feedback on time allocation"],
    },
    {
        id: "REC-05",
        title: "Conduct refresher training on assessment",
        description: "High outlier rates suggest teachers may not be following scoring protocols correctly.",
        priority: "High",
        actions: ["Organize a 1-day refresher on assessment administration", "Provide standardized scoring rubrics", "Pair new assessors with experienced ones for calibration"],
    },
    {
        id: "REC-06",
        title: "Complete missing baseline assessments",
        description: "Schools without baseline data cannot demonstrate learning gains, undermining evidence credibility.",
        priority: "High",
        actions: ["Prioritize baseline assessments in the next 4 weeks", "Deploy data clerks or trained volunteers", "Use simplified assessments for catch-up cohorts"],
    },
    {
        id: "REC-07",
        title: "Schedule endline assessments",
        description: "Schools with baselines but no endlines represent incomplete evidence cycles.",
        priority: "High",
        actions: ["Schedule endline assessments for end of term", "Ensure same learners are assessed (use learner UIDs)", "Report results to school leaders within 2 weeks"],
    },
    {
        id: "REC-08",
        title: "Engage school leaders in reading timetable",
        description: "Implementation fidelity improves when school leaders actively protect reading instruction time.",
        priority: "Medium",
        actions: ["Meet with head teacher to review timetable allocation", "Propose a minimum 30-minute daily reading block", "Share the reading time policy brief"],
    },
    {
        id: "REC-09",
        title: "Strengthen phonics instruction",
        description: "Low Letter Sounds and Real Words scores indicate insufficient phonics teaching.",
        priority: "High",
        actions: ["Provide phonics instruction training for teachers", "Supply letter-sound flashcards and phonics games", "Schedule daily 15-minute phonics drills"],
    },
    {
        id: "REC-10",
        title: "Introduce paired reading activities",
        description: "Peer reading supports fluency development for Developing and Transitional learners.",
        priority: "Medium",
        actions: ["Train teachers to organize paired reading sessions", "Provide age-appropriate paired reading texts", "Schedule 10 minutes daily for paired reading"],
    },
    {
        id: "REC-11",
        title: "Improve reading comprehension strategies",
        description: "Low comprehension scores despite adequate fluency suggest a need for explicit comprehension instruction.",
        priority: "Medium",
        actions: ["Train teachers on think-aloud and prediction strategies", "Use story retell activities after reading sessions", "Introduce comprehension question cards for guided reading"],
    },
    {
        id: "REC-12",
        title: "Resolve duplicate learner records",
        description: "Duplicate learner IDs inflate sample sizes and distort gain calculations.",
        priority: "Medium",
        actions: ["Run deduplication check on learner registry", "Merge or flag duplicate entries", "Review data entry protocols with clerks"],
    },
    {
        id: "REC-13",
        title: "Recognize and share best practices",
        description: "Schools with strong fidelity and outcomes demonstrate effective implementation worth replicating.",
        priority: "Low",
        actions: ["Document successful practices as case studies", "Invite school to present at cluster meetings", "Share anonymized results with government stakeholders"],
    },
    {
        id: "REC-14",
        title: "Supply supplementary reading materials",
        description: "Classrooms lack sufficient reading materials for independent practice time.",
        priority: "Medium",
        actions: ["Distribute story books at varied reading levels", "Establish a book rotations system across schools", "Train teachers on creating print-rich classrooms"],
    },
    {
        id: "REC-15",
        title: "Strengthen letter knowledge instruction",
        description: "Low Letter Names scores at baseline suggest learners need more foundational alphabet work.",
        priority: "High",
        actions: ["Provide alphabet charts and letter-tracing materials", "Schedule daily letter of the day activities", "Use multi-sensory letter learning (sand writing, clay)"],
    },
    {
        id: "REC-16",
        title: "Train community reading volunteers",
        description: "Community volunteers can extend reading practice opportunities beyond school hours.",
        priority: "Low",
        actions: ["Recruit parent and community volunteers", "Conduct 2-day volunteer training on reading support", "Set up after-school reading clubs"],
    },
    {
        id: "REC-17",
        title: "Conduct teacher observation follow-ups",
        description: "Post-training observations ensure teachers implement trained techniques in the classroom.",
        priority: "Medium",
        actions: ["Schedule post-training observation within 4 weeks", "Use observation rubric to assess technique adoption", "Provide written feedback and action plan"],
    },
    {
        id: "REC-18",
        title: "Address gender equity in reading outcomes",
        description: "Disaggregated data shows disparities in reading outcomes by gender that require targeted attention.",
        priority: "Medium",
        actions: ["Analyze reading level data disaggregated by gender", "Ensure equal participation of boys and girls in reading groups", "Provide gender-responsive reading materials"],
    },
    {
        id: "REC-19",
        title: "Improve data collection timeliness",
        description: "Delayed data submission reduces the value of real-time monitoring and decision-making.",
        priority: "Medium",
        actions: ["Set submission deadlines within 5 days of assessment", "Enable mobile data collection where possible", "Conduct quarterly data quality review meetings"],
    },
    {
        id: "REC-20",
        title: "Scale effective interventions to new districts",
        description: "Proven interventions in well-performing districts can be replicated in new areas for broader impact.",
        priority: "Low",
        actions: ["Identify top-performing districts by fidelity and outcomes", "Document replicable intervention packages", "Propose expansion targets for next fiscal year"],
    },
];

/**
 * Map reading-level distribution signals to specific extended recommendation IDs.
 *
 * Triggers:
 *  - High Non-Reader %  (≥30%) at latest cycle   → REC-01 (catch-up groups)
 *  - High Developing % (≥40%) + low Fluent (≤10%) → REC-02 (decodable readers)
 *  - High Emerging %   (≥35%)                     → REC-09 (phonics), REC-15 (letter knowledge)
 *  - Low comprehension (Fluent ≤ 15% despite low Non-Reader) → REC-11 (comprehension)
 */
export function getReadingLevelRecommendations(
    readingLevels: ReadingLevelsBlock | null | undefined,
): ExtendedRecommendation[] {
    if (!readingLevels || readingLevels.distribution.length === 0) {
        return [];
    }

    // Use the latest distribution cycle available
    const dist =
        readingLevels.distribution.find((d) => d.cycle === "endline") ??
        readingLevels.distribution.find((d) => d.cycle === "latest") ??
        readingLevels.distribution[readingLevels.distribution.length - 1];

    const recIds = new Set<string>();

    const nonReaderPct = dist.percents["Non-Reader"] ?? 0;
    const emergingPct = dist.percents["Emerging"] ?? 0;
    const developingPct = dist.percents["Developing"] ?? 0;
    const fluentPct = dist.percents["Fluent"] ?? 0;

    // High Non-Reader
    if (nonReaderPct >= 30) {
        recIds.add("REC-01");
    }

    // High Developing + low Fluent → need decodable readers
    if (developingPct >= 40 && fluentPct <= 10) {
        recIds.add("REC-02");
    }

    // High Emerging → phonics & letter knowledge gaps
    if (emergingPct >= 35) {
        recIds.add("REC-09");
        recIds.add("REC-15");
    }

    // Low comprehension despite reasonable decoding
    if (nonReaderPct < 20 && fluentPct <= 15) {
        recIds.add("REC-11");
    }

    return EXTENDED_RECOMMENDATION_CATALOG.filter((r) => recIds.has(r.id));
}

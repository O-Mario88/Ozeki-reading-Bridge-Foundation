/**
 * NLIS Recommendation Catalog
 *
 * Evidence-based recommendations mapped to fidelity/outcome signals.
 * Used by the AI narrative engine (with guardrails) and the School Action Center.
 * Each recommendation has conditions, priority, and suggested actions.
 */

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

    return lines.join("\n");
}

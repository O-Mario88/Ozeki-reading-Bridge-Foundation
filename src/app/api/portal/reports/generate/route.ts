import { NextResponse } from "next/server";
import {
    logAuditEvent,
    calculateFidelityScore,
    getLearningGainsData,
    getCostEffectivenessData,
    getDataQualitySummary,
    getImpactSummary,
    getPublicImpactAggregate,
} from "@/lib/db";
import type { ReadingLevelsBlock } from "@/lib/types";
import {
    getApplicableRecommendations,
    buildReportPromptContext,
    validateNarrative,
    AI_GUARDRAILS,
} from "@/lib/recommendations";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const user = await getAuthenticatedPortalUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { scopeType = "country", scopeId = "Uganda", reportType = "quarterly" } = body;

    // Gather all metrics
    const fidelity = calculateFidelityScore(
        scopeType as "country" | "region" | "district" | "school",
        scopeId,
    );
    const gains = getLearningGainsData(scopeType, scopeId);
    const cost = getCostEffectivenessData(scopeType, scopeId);
    const quality = getDataQualitySummary(scopeType, scopeId);
    const summary = getImpactSummary();
    const summaryMap = new Map(summary.metrics.map((m) => [m.label, Number(m.value) || 0]));

    // Get recommendations
    const coachingDriver = fidelity.drivers.find((d) => d.driver === "observation_coverage");
    const recommendations = getApplicableRecommendations({
        fidelityScore: fidelity.totalScore,
        domainGains: gains.domains.map((d) => ({ domain: d.domain, change: d.change })),
        schoolsMissingBaseline: quality.schoolsMissingBaseline,
        schoolsMissingEndline: quality.schoolsMissingEndline,
        outlierCount: quality.outlierCount,
        observationCoverage: coachingDriver?.score ?? 0,
    });

    // Build structured prompt
    const promptContext = buildReportPromptContext(scopeType, scopeId, {
        fidelityScore: fidelity.totalScore,
        fidelityBand: fidelity.band,
        learningGains: gains.domains.map((d) => ({
            domain: d.domain,
            change: d.change,
            sampleSize: d.sampleSize,
        })),
        schoolImprovementIndex: gains.schoolImprovementIndex,
        totalCost: cost.totalCost,
        costPerSchool: cost.costPerSchool,
        schoolsSupported: summaryMap.get("Schools trained") ?? 0,
        learnersAssessed: summaryMap.get("Learners assessed") ?? 0,
    }, recommendations);

    // Generate structured report (without external AI — uses template-based approach)
    const impactAggregate = getPublicImpactAggregate(
        (scopeType === "country" ? "country" : scopeType === "region" ? "subregion" : scopeType === "district" ? "district" : "school") as "country" | "subregion" | "district" | "school",
        scopeId,
    );
    const reportSections = generateTemplateReport(
        scopeType,
        scopeId,
        reportType,
        fidelity,
        gains,
        cost,
        quality,
        recommendations,
        impactAggregate.readingLevels ?? null,
    );

    // Validate each section against guardrails
    const validations = reportSections.map((section) => ({
        ...section,
        validation: validateNarrative(section.content),
    }));

    const hasViolations = validations.some((v) => !v.validation.isValid);

    logAuditEvent(
        user.id,
        user.fullName,
        "generate_report",
        "reports",
        null,
        `Type: ${reportType}, Scope: ${scopeType}/${scopeId}, Violations: ${hasViolations ? "yes" : "no"}`,
    );

    return NextResponse.json({
        title: `${reportType === "quarterly" ? "Quarterly" : reportType === "school_card" ? "School Card" : "Impact"} Report: ${scopeId}`,
        scopeType,
        scopeId,
        generatedAt: new Date().toISOString(),
        sections: validations,
        promptContext,
        recommendations: recommendations.slice(0, 5),
        guardrails: AI_GUARDRAILS,
        hasViolations,
    });
}

function generateTemplateReport(
    scopeType: string,
    scopeId: string,
    reportType: string,
    fidelity: ReturnType<typeof calculateFidelityScore>,
    gains: ReturnType<typeof getLearningGainsData>,
    cost: ReturnType<typeof getCostEffectivenessData>,
    quality: ReturnType<typeof getDataQualitySummary>,
    recommendations: ReturnType<typeof getApplicableRecommendations>,
    readingLevels: ReadingLevelsBlock | null,
) {
    const sections = [];

    // Executive summary
    sections.push({
        heading: "Executive Summary",
        content: `This report covers the ${scopeType} of ${scopeId} for the period ${gains.period}. ` +
            `The implementation fidelity score is ${fidelity.totalScore}/100 (${fidelity.band}). ` +
            (gains.schoolImprovementIndex !== null
                ? `The School Improvement Index indicates a ${gains.schoolImprovementIndex > 0 ? "positive" : "negative"} trend of ${gains.schoolImprovementIndex > 0 ? "+" : ""}${gains.schoolImprovementIndex.toFixed(1)} percentage points across assessed domains. `
                : "Insufficient data to calculate the School Improvement Index. ") +
            `Data completeness stands at ${quality.completenessScore}%.`,
    });

    // Implementation Fidelity
    const driverSummary = fidelity.drivers
        .map((d) => `${d.label}: ${d.score}% (${d.detail})`)
        .join(". ");
    sections.push({
        heading: "Implementation Fidelity",
        content: `The composite fidelity score of ${fidelity.totalScore}/100 places this scope in the "${fidelity.band}" band. ` +
            `Key driver scores: ${driverSummary}. ` +
            `A total of ${fidelity.sampleSize} schools are included in this assessment.`,
    });

    // Learning outcomes
    const domainLines = gains.domains
        .map((d) => {
            if (d.change !== null) {
                return `${d.domain}: ${d.change > 0 ? "+" : ""}${d.change.toFixed(1)}pp (baseline ${d.baselineAvg?.toFixed(0) ?? "N/A"} → endline ${d.endlineAvg?.toFixed(0) ?? "N/A"}, n=${d.sampleSize})`;
            }
            return `${d.domain}: insufficient data (n=${d.sampleSize})`;
        })
        .join(". ");
    sections.push({
        heading: "Learning Outcomes",
        content: `Domain-level gains from baseline to endline: ${domainLines}. ` +
            (gains.schoolImprovementIndex !== null
                ? `The overall School Improvement Index is ${gains.schoolImprovementIndex > 0 ? "+" : ""}${gains.schoolImprovementIndex.toFixed(1)}pp.`
                : ""),
    });

    // Reading Levels Profile and Movement
    if (readingLevels && readingLevels.distribution.length > 0) {
        const lines: string[] = [
            `Reading Level Classification Version: ${readingLevels.definition_version}.`,
        ];
        for (const dist of readingLevels.distribution) {
            const levelParts = readingLevels.levels
                .map((l) => `${l.label}: ${dist.percents[l.label] ?? 0}% (n=${dist.counts[l.label] ?? 0})`)
                .join(", ");
            lines.push(`${dist.cycle.charAt(0).toUpperCase() + dist.cycle.slice(1)} distribution (n=${dist.n}): ${levelParts}.`);
        }
        if (readingLevels.movement) {
            const m = readingLevels.movement;
            lines.push(
                `Baseline to endline movement (n=${m.n_matched} matched): ${m.moved_up_1plus_percent}% moved up ≥1 level, ` +
                `${m.stayed_same_percent}% stayed same, ${m.moved_down_percent}% moved down.`,
            );
            if (m.top_transitions.length > 0) {
                const topTrans = m.top_transitions
                    .slice(0, 3)
                    .map((t) => `${t.from} → ${t.to}: ${t.count} (${t.percent}%)`)
                    .join("; ");
                lines.push(`Top transitions: ${topTrans}.`);
            }
        }
        sections.push({
            heading: "Reading Levels Profile and Movement",
            content: lines.join(" "),
        });
    }
    // Cost-effectiveness (only if there's cost data)
    if (cost.totalCost > 0) {
        sections.push({
            heading: "Cost-Effectiveness",
            content: `Total investment: $${cost.totalCost.toLocaleString()}. ` +
                (cost.costPerSchool ? `Cost per school: $${cost.costPerSchool.toLocaleString()}. ` : "") +
                (cost.costPerTeacher ? `Cost per teacher trained: $${cost.costPerTeacher.toLocaleString()}. ` : "") +
                (cost.costPerLearnerAssessed ? `Cost per learner assessed: $${cost.costPerLearnerAssessed.toLocaleString()}.` : ""),
        });
    }

    // Data quality
    if (quality.schoolsMissingBaseline > 0 || quality.schoolsMissingEndline > 0 || quality.outlierCount > 0) {
        sections.push({
            heading: "Data Quality Notes",
            content: `Data completeness: ${quality.completenessScore}%. ` +
                (quality.schoolsMissingBaseline > 0 ? `${quality.schoolsMissingBaseline} schools are missing baseline assessments. ` : "") +
                (quality.schoolsMissingEndline > 0 ? `${quality.schoolsMissingEndline} schools are missing endline assessments. ` : "") +
                (quality.outlierCount > 0 ? `${quality.outlierCount} outlier scores detected and flagged for review. ` : "") +
                (quality.duplicateLearnersDetected > 0 ? `${quality.duplicateLearnersDetected} potential duplicate learner records identified.` : ""),
        });
    }

    // Recommendations
    if (recommendations.length > 0) {
        const recText = recommendations
            .slice(0, 5)
            .map((r, i) => `${i + 1}. [${r.priority.toUpperCase()}] ${r.title}: ${r.actions[0]}`)
            .join(". ");
        sections.push({
            heading: "Recommendations",
            content: `Based on current data signals, the following actions are suggested: ${recText}. ` +
                "These recommendations are evidence-based and derived from the Recommendation Catalog.",
        });
    }

    // Disclosure
    sections.push({
        heading: "Disclosure",
        content: AI_GUARDRAILS.requiredDisclosures.join(" "),
    });

    return sections;
}

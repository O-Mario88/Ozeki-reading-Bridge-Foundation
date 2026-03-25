import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
    logAuditEvent,
    getCostEffectivenessData,
    getPublicImpactAggregate,
} from "@/services/dataService";
import type { ReadingLevelsBlock } from "@/lib/types";
import type {
    AggregateFidelityView,
    AggregateLearningGainsView,
    AggregateQualitySummaryView,
} from "@/lib/public-impact-views";
import {
    buildFidelityFromAggregate,
    buildImpactKpisFromAggregate,
    buildLearningGainsFromAggregate,
    buildQualitySummaryFromAggregate,
} from "@/lib/public-impact-views";
import {
    getApplicableRecommendations,
    buildReportPromptContext,
    validateNarrative,
    AI_GUARDRAILS,
} from "@/lib/recommendations";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { getOpenAiServerConfig } from "@/lib/server/openai-config";

export const runtime = "nodejs";

type ReportSection = { heading: string; content: string };

function ensureDisclosureSection(sections: ReportSection[]): ReportSection[] {
    const disclosureText = AI_GUARDRAILS.requiredDisclosures.join(" ");
    const index = sections.findIndex((section) => section.heading === "Disclosure");
    if (index >= 0) {
        const next = [...sections];
        next[index] = {
            heading: "Disclosure",
            content: disclosureText,
        };
        return next;
    }
    return [
        ...sections,
        {
            heading: "Disclosure",
            content: disclosureText,
        },
    ];
}

function enforceSectionGuardrails(
    sections: ReportSection[],
    fallbackSections: ReportSection[],
): ReportSection[] {
    const fallbackByHeading = new Map(fallbackSections.map((section) => [section.heading, section.content]));
    const sanitized = sections.map((section) => {
        const content = String(section.content ?? "").trim();
        const validation = validateNarrative(content);
        if (!content || !validation.isValid) {
            const fallback = fallbackByHeading.get(section.heading) ?? "Data not available for this period.";
            return {
                heading: section.heading,
                content: fallback,
            };
        }
        return {
            heading: section.heading,
            content,
        };
    });
    return ensureDisclosureSection(sanitized);
}

export async function POST(request: Request) {
    const user = await getAuthenticatedPortalUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { scopeType = "country", scopeId = "Uganda", reportType = "quarterly" } = body;
    const aggregateScopeType =
        scopeType === "country"
            ? "country"
            : scopeType === "region"
              ? "region"
              : scopeType === "sub_region" || scopeType === "subregion"
                ? "subregion"
              : scopeType === "district"
                ? "district"
                : "school";

    // Gather all metrics
    const impactAggregate = await getPublicImpactAggregate(
        aggregateScopeType,
        scopeId,
    );
    const fidelity = buildFidelityFromAggregate(impactAggregate, scopeType, scopeId);
    const gains = buildLearningGainsFromAggregate(impactAggregate, scopeType, scopeId);
    const cost = await getCostEffectivenessData(scopeType, scopeId);
    const quality = buildQualitySummaryFromAggregate(impactAggregate, scopeType, scopeId);
    const kpis = buildImpactKpisFromAggregate(impactAggregate);

    // Get recommendations
    const coachingDriver = fidelity.drivers.find((d) => d.driver === "teaching_quality");
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
        schoolsSupported: kpis.schoolsSupported,
        learnersAssessed: kpis.learnersAssessed,
    }, recommendations);

    // Generate structured report (without external AI — uses template-based approach)
    const fallbackSections = generateTemplateReport(
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
    const aiReport = await generateAiBackedReport(
        scopeType,
        scopeId,
        reportType,
        promptContext,
        fidelity,
        gains,
        cost,
        quality,
        recommendations,
        impactAggregate.readingLevels ?? null,
        fallbackSections,
    );
    const reportSections = ensureDisclosureSection(aiReport.sections);

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
        generatedWithAi: aiReport.generatedWithAi,
        model: aiReport.model,
        ai: {
            configured: aiReport.aiConfigured,
            status: aiReport.status,
            generatedWithAi: aiReport.generatedWithAi,
            model: aiReport.model,
        },
    });
}

async function generateAiBackedReport(
    scopeType: string,
    scopeId: string,
    reportType: string,
    promptContext: string,
    fidelity: AggregateFidelityView,
    gains: AggregateLearningGainsView,
    cost: Awaited<ReturnType<typeof getCostEffectivenessData>>,
    quality: AggregateQualitySummaryView,
    recommendations: ReturnType<typeof getApplicableRecommendations>,
    readingLevels: ReadingLevelsBlock | null,
    fallbackSections: ReportSection[],
) {
    const openAiConfig = getOpenAiServerConfig("gpt-5.2-mini");
    if (!openAiConfig.configured || !openAiConfig.apiKey) {
        return {
            sections: ensureDisclosureSection(fallbackSections),
            generatedWithAi: false,
            model: null as string | null,
            aiConfigured: false,
            status: openAiConfig.status,
        };
    }

    const model = openAiConfig.model;
    const client = new OpenAI({ apiKey: openAiConfig.apiKey });
    const evidence = {
        scopeType,
        scopeId,
        reportType,
        fidelity,
        gains,
        cost,
        quality,
        recommendations: recommendations.slice(0, 8),
        readingLevels,
    };

    try {
        const response = await client.chat.completions.create({
            model,
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content:
                        "You are a senior monitoring, evaluation, and literacy impact reporting specialist. Write donor-grade, executive-quality, factual report narration for a literacy CRM in Uganda. Use only the evidence provided. Do not invent numbers. Keep tone professional, concise, and implementation-aware. Return JSON with keys executiveSummary, implementationFidelity, learningOutcomes, readingProgress, costEffectiveness, dataQuality, recommendations. If a metric is missing, explicitly say Data not available for this period.",
                },
                {
                    role: "user",
                    content:
                        `Draft a professional ${reportType} report for ${scopeType}:${scopeId}. ` +
                        `Use the evidence JSON exactly as provided and keep each section to one compact paragraph.\n\n` +
                        `Guardrail context:\n${promptContext}\n\n` +
                        `Hard guardrails:\n` +
                        `- Max ${AI_GUARDRAILS.maxWordsPerSection} words per section\n` +
                        `- Avoid banned phrases: ${AI_GUARDRAILS.bannedPhrases.join(", ")}\n` +
                        JSON.stringify(evidence),
                },
            ],
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No report content returned.");
        }
        const parsed = JSON.parse(content) as Record<string, unknown>;
        const sectionText = (key: string, fallbackHeading: string) => {
            const normalized = String(parsed[key] ?? "").trim();
            const fallback = fallbackSections.find((section) => section.heading === fallbackHeading)?.content ?? "";
            return normalized || fallback;
        };

        const candidateSections: ReportSection[] = [
            { heading: "Executive Summary", content: sectionText("executiveSummary", "Executive Summary") },
            { heading: "Implementation Fidelity", content: sectionText("implementationFidelity", "Implementation Fidelity") },
            { heading: "Learning Outcomes", content: sectionText("learningOutcomes", "Learning Outcomes") },
            { heading: "Reading Levels Profile and Movement", content: sectionText("readingProgress", "Reading Levels Profile and Movement") },
            { heading: "Cost-Effectiveness", content: sectionText("costEffectiveness", "Cost-Effectiveness") },
            { heading: "Data Quality Notes", content: sectionText("dataQuality", "Data Quality Notes") },
            { heading: "Recommendations", content: sectionText("recommendations", "Recommendations") },
        ].filter((section) => section.content.trim().length > 0);

        return {
            sections: enforceSectionGuardrails(candidateSections, fallbackSections),
            generatedWithAi: true,
            model,
            aiConfigured: true,
            status: "ok" as const,
        };
    } catch {
        return {
            sections: ensureDisclosureSection(fallbackSections),
            generatedWithAi: false,
            model: null as string | null,
            aiConfigured: true,
            status: "request_failed_or_invalid_response" as const,
        };
    }
}

function generateTemplateReport(
    scopeType: string,
    scopeId: string,
    reportType: string,
    fidelity: AggregateFidelityView,
    gains: AggregateLearningGainsView,
    cost: Awaited<ReturnType<typeof getCostEffectivenessData>>,
    quality: AggregateQualitySummaryView,
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

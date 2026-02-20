import { PortalRecord, PortalRecordPayload } from "@/lib/types";
import { PerformanceNode } from "@/components/dashboard/PerformanceCascade";
import { inferRegionFromDistrict } from "@/lib/uganda-locations";

type RecordScores = {
    instruction: number;
    outcomes: number;
    leadership: number;
    community: number;
    environment: number;
};

// Helper to safely extract number from payload
function getScore(payload: PortalRecordPayload, key: string): number {
    const val = payload[key];
    const num = Number(val);
    return isNaN(num) ? 0 : num;
}

// 1. Filter for valid assessment records with scores
function getAssessmentScores(record: PortalRecord): RecordScores | null {
    if (record.module !== "assessment") return null;
    // We only care about records that have the scorecard fields
    const p = record.payload;

    // Check if at least one score field is present to consider it a scorecard assessment
    if (p.score_instruction === undefined && p.score_outcomes === undefined) return null;

    return {
        instruction: getScore(p, "score_instruction"),
        outcomes: getScore(p, "score_outcomes"),
        leadership: getScore(p, "score_leadership"),
        community: getScore(p, "score_community"),
        environment: getScore(p, "score_environment"),
    };
}

// 2. Aggregation helper
function calculateAverage(nodes: PerformanceNode[]): RecordScores {
    if (nodes.length === 0) {
        return { instruction: 0, outcomes: 0, leadership: 0, community: 0, environment: 0 };
    }

    const sum = nodes.reduce(
        (acc, node) => ({
            instruction: acc.instruction + node.scores.instruction,
            outcomes: acc.outcomes + node.scores.outcomes,
            leadership: acc.leadership + node.scores.leadership,
            community: acc.community + node.scores.community,
            environment: acc.environment + node.scores.environment,
        }),
        { instruction: 0, outcomes: 0, leadership: 0, community: 0, environment: 0 }
    );

    return {
        instruction: sum.instruction / nodes.length,
        outcomes: sum.outcomes / nodes.length,
        leadership: sum.leadership / nodes.length,
        community: sum.community / nodes.length,
        environment: sum.environment / nodes.length,
    };
}

export function buildPerformanceCascade(records: PortalRecord[]): PerformanceNode {
    // Map: School ID -> Latest Score
    const schoolScores = new Map<string, { record: PortalRecord; scores: RecordScores }>();

    // Use the latest assessment for each school
    records
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Newest first
        .forEach((r) => {
            if (!r.schoolId) return;
            const scores = getAssessmentScores(r);
            if (scores && !schoolScores.has(String(r.schoolId))) {
                schoolScores.set(String(r.schoolId), { record: r, scores });
            }
        });

    // Build Hierarchy
    // Groups: Region -> District -> SubCounty -> School

    const regionNodes = new Map<string, PerformanceNode>();

    schoolScores.forEach(({ record, scores }) => {
        const district = record.district || "Unknown District";
        const region = inferRegionFromDistrict(district) || "Unknown Region";
        const subCounty = String(record.payload.subCounty || "Unknown Sub-County");
        const schoolName = record.schoolName;

        // --- Country Level (Processed at end) ---

        // --- Region Level ---
        if (!regionNodes.has(region)) {
            regionNodes.set(region, {
                id: `region-${region}`,
                name: region,
                level: "Region",
                scores: { ...scores }, // Placeholder, will recalculate
                children: [],
                schoolCount: 0,
            });
        }
        const regionNode = regionNodes.get(region)!;

        // --- District Level ---
        let districtNode = regionNode.children.find((c) => c.name === district);
        if (!districtNode) {
            districtNode = {
                id: `district-${district}`,
                name: district,
                level: "District",
                scores: { ...scores }, // Placeholder
                children: [],
                schoolCount: 0,
            };
            regionNode.children.push(districtNode);
        }

        // --- Sub-County Level ---
        let subCountyNode = districtNode.children.find((c) => c.name === subCounty);
        if (!subCountyNode) {
            subCountyNode = {
                id: `subcounty-${district}-${subCounty}`,
                name: subCounty,
                level: "Sub-County",
                scores: { ...scores }, // Placeholder
                children: [],
                schoolCount: 0,
            };
            districtNode.children.push(subCountyNode);
        }

        // --- School Level ---
        const isWeaningEligible =
            scores.instruction >= 8 &&
            scores.outcomes >= 8 &&
            scores.leadership >= 8 &&
            scores.community >= 8 &&
            scores.environment >= 8;

        subCountyNode.children.push({
            id: `school-${record.schoolId}`,
            name: schoolName,
            level: "School",
            scores: scores,
            children: [],
            schoolCount: 1,
            isWeaningEligible,
        });
    });

    // Recalculate averages bottom-up
    const finalRegionNodes: PerformanceNode[] = [];

    for (const regionNode of regionNodes.values()) {
        for (const districtNode of regionNode.children) {
            // 1. Sub-counties
            for (const subCountyNode of districtNode.children) {
                subCountyNode.scores = calculateAverage(subCountyNode.children);
                subCountyNode.schoolCount = subCountyNode.children.length;
                // Sort schools alphabetical
                subCountyNode.children.sort((a, b) => a.name.localeCompare(b.name));
            }
            // 2. District
            districtNode.scores = calculateAverage(districtNode.children);
            districtNode.schoolCount = districtNode.children.reduce((acc, c) => acc + c.schoolCount, 0);
            districtNode.children.sort((a, b) => a.name.localeCompare(b.name));
        }
        // 3. Region
        regionNode.scores = calculateAverage(regionNode.children);
        regionNode.schoolCount = regionNode.children.reduce((acc, c) => acc + c.schoolCount, 0);
        regionNode.children.sort((a, b) => a.name.localeCompare(b.name));

        finalRegionNodes.push(regionNode);
    }

    finalRegionNodes.sort((a, b) => a.name.localeCompare(b.name));

    const countryNode: PerformanceNode = {
        id: "country-uganda",
        name: "Uganda (National)",
        level: "Country",
        scores: calculateAverage(finalRegionNodes),
        children: finalRegionNodes,
        schoolCount: finalRegionNodes.reduce((acc, c) => acc + c.schoolCount, 0),
    };

    return countryNode;
}

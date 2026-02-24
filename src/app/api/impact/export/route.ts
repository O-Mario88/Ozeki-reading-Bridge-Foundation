import { NextResponse } from "next/server";
import { getGovernmentViewData } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";

    const data = getGovernmentViewData();

    if (format === "csv") {
        const header = [
            "Rank",
            "District",
            "Region",
            "Fidelity Score",
            "Outcomes Score (pp)",
            "Priority",
            "Schools Supported",
            "Learners Assessed",
        ].join(",");

        const rows = data.leagueTable.map((row) =>
            [
                row.rank,
                `"${row.district}"`,
                `"${row.region}"`,
                row.fidelityScore ?? "",
                row.outcomesScore !== null ? row.outcomesScore.toFixed(1) : "",
                row.priorityFlag,
                row.schoolsSupported,
                row.learnersAssessed,
            ].join(","),
        );

        const csv = [header, ...rows].join("\n");
        const filename = `NLIS_District_League_${new Date().toISOString().slice(0, 10)}.csv`;

        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    }

    // JSON fallback
    return NextResponse.json(data);
}

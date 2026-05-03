import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { getLessonContentAnalyticsPostgres } from "@/lib/server/postgres/repositories/lesson-lms";
import { clampLimit } from "@/lib/server/http/pagination";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requirePortalUser();
    const { searchParams } = new URL(request.url);
    const flaggedOnly = searchParams.get("flaggedOnly") === "1";
    const limit = clampLimit(searchParams.get("limit"), 200, 1000);
    const data = await getLessonContentAnalyticsPostgres({ limit, flaggedOnly });

    const summary = {
      totalLessons: data.length,
      flagged: data.filter((r) => r.flags.length > 0).length,
      avgCompletionRate: data.length > 0
        ? Number((data.reduce((a, b) => a + b.completionRate, 0) / data.length).toFixed(1))
        : 0,
      avgQuizPassRate: (() => {
        const withQuiz = data.filter((r) => r.quizPassRate !== null);
        return withQuiz.length > 0
          ? Number((withQuiz.reduce((a, b) => a + (b.quizPassRate ?? 0), 0) / withQuiz.length).toFixed(1))
          : null;
      })(),
      totalCertificates: data.reduce((a, b) => a + b.certificatesIssued, 0),
    };

    return NextResponse.json({ data, summary, lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error("[api/portal/recorded-lessons/analytics]", error);
    return NextResponse.json({ error: "Analytics unavailable" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
    addStoryRatingPostgres,
    getStoryBySlugPostgres,
    getStoryRatingStatsPostgres,
} from "@/lib/server/postgres/repositories/public-content";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const slug = (await params).slug;

    let body: { stars?: unknown; anonymousId?: unknown };
    try {
        body = (await request.json()) as { stars?: unknown; anonymousId?: unknown };
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const stars = Number(body.stars);
    const anonymousId = typeof body.anonymousId === "string" ? body.anonymousId : undefined;

    if (!stars || stars < 1 || stars > 5) {
        return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    const story = await getStoryBySlugPostgres(slug);
    if (!story) {
        return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    try {
        await addStoryRatingPostgres(story.id, stars, undefined, anonymousId);
        const stats = await getStoryRatingStatsPostgres(story.id);
        return NextResponse.json({ success: true, stats });
    } catch (err: unknown) {
        console.error("Error adding rating:", err);
        return NextResponse.json({ error: "Failed to record rating" }, { status: 500 });
    }
}

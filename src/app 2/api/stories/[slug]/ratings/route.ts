import { NextRequest, NextResponse } from "next/server";
import { getStoryBySlug, addStoryRating, getStoryRatingStats } from "@/lib/db";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const slug = (await params).slug;

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const stars = Number(body.stars);
    const anonymousId = body.anonymousId || null;

    if (!stars || stars < 1 || stars > 5) {
        return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    const story = getStoryBySlug(slug);
    if (!story) {
        return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    try {
        addStoryRating(story.id, stars, undefined, anonymousId);
        const stats = getStoryRatingStats(story.id);
        return NextResponse.json({ success: true, stats });
    } catch (err: any) {
        console.error("Error adding rating:", err);
        return NextResponse.json({ error: "Failed to record rating" }, { status: 500 });
    }
}

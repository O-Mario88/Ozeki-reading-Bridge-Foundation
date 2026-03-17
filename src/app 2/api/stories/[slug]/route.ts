import { NextResponse } from "next/server";
import { getStoryBySlug, incrementStoryViewCount } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function GET(
    _request: Request,
    { params }: { params: Params },
) {
    const { slug } = await params;
    const story = getStoryBySlug(slug);

    if (!story) {
        return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    // Increment view count asynchronously
    incrementStoryViewCount(story.id);

    return NextResponse.json({ story });
}

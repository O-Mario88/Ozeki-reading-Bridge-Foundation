import { NextResponse } from "next/server";
import {
    getStoryBySlugPostgres,
    incrementStoryViewCountPostgres,
} from "@/lib/server/postgres/repositories/public-content";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function GET(
    _request: Request,
    { params }: { params: Params },
) {
    const { slug } = await params;
    const story = await getStoryBySlugPostgres(slug);

    if (!story) {
        return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    // Increment view count asynchronously
    await incrementStoryViewCountPostgres(story.id);

    return NextResponse.json({ story });
}

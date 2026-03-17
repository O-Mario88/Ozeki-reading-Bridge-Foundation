import { NextRequest, NextResponse } from "next/server";
import {
    addStoryCommentPostgres,
    getStoryBySlugPostgres,
    listStoryCommentsPostgres,
} from "@/lib/server/postgres/repositories/public-content";

const BAD_WORDS = /fuck|shit|bitch|asshole|cunt|dick/i;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const slug = (await params).slug;
    const story = await getStoryBySlugPostgres(slug);
    if (!story) {
        return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const comments = await listStoryCommentsPostgres(story.id);
    return NextResponse.json({ comments });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const slug = (await params).slug;
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const commentText = (body.commentText || "").trim();
    const displayName = (body.displayName || "").trim() || "Anonymous Reader";
    const anonymousId = body.anonymousId || null;

    if (!commentText) {
        return NextResponse.json({ error: "Comment text required" }, { status: 400 });
    }

    if (commentText.length > 1000) {
        return NextResponse.json({ error: "Comment is too long" }, { status: 400 });
    }

    if (BAD_WORDS.test(commentText) || BAD_WORDS.test(displayName)) {
        return NextResponse.json({ error: "Your comment contains inappropriate language." }, { status: 422 });
    }

    const story = await getStoryBySlugPostgres(slug);
    if (!story) {
        return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    try {
        const newComment = await addStoryCommentPostgres(
            story.id,
            commentText,
            displayName,
            undefined,
            anonymousId,
        );
        return NextResponse.json({ success: true, comment: newComment });
    } catch (err: unknown) {
        console.error("Error adding comment:", err);
        return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
    }
}

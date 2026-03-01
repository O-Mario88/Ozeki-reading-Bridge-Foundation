import { NextRequest, NextResponse } from "next/server";
import {
    saveStoryEntry,
    listStoryEntries,
    publishStoryEntry,
    unpublishStoryEntry,
    deleteStoryEntry,
    getStoryById,
    listStoryAnthologies,
    saveStoryAnthology,
} from "@/lib/db";
import { getCurrentPortalUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export async function GET() {
    const user = await getCurrentPortalUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stories = listStoryEntries();
    const anthologies = listStoryAnthologies();
    return NextResponse.json({ stories, anthologies });
}

export async function POST(request: NextRequest) {
    const user = await getCurrentPortalUser();
    if (!user || user.role === "Volunteer") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "save-story") {
        const story = saveStoryEntry({
            id: body.id || undefined,
            schoolId: body.schoolId,
            anthologyId: body.anthologyId || null,
            title: body.title,
            excerpt: body.excerpt || "",
            contentText: body.contentText || null,
            storyContentBlocks: Array.isArray(body.storyContentBlocks) ? body.storyContentBlocks : [],
            hasIllustrations: Array.isArray(body.storyContentBlocks) && body.storyContentBlocks.some((b: import("@/lib/types").StoryContentBlock) => b.type === "illustration"),
            pdfStoredPath: body.pdfStoredPath || null,
            coverImagePath: body.coverImagePath || null,
            grade: body.grade || "",
            language: body.language || "English",
            tags: body.tags || [],
            pageStart: body.pageStart || 1,
            pageEnd: body.pageEnd || 1,
            sortOrder: body.sortOrder || 0,
            consentStatus: body.consentStatus || "pending",
            publicAuthorDisplay: body.publicAuthorDisplay || "",
            learnerUid: body.learnerUid || null,
            createdByUserId: user.id,
        });
        return NextResponse.json({ story });
    }

    if (action === "publish") {
        const result = publishStoryEntry(body.storyId, user.id, user.fullName);
        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 403 });
        }
        const story = getStoryById(body.storyId);
        return NextResponse.json({ story });
    }

    if (action === "unpublish") {
        unpublishStoryEntry(body.storyId, user.id, user.fullName);
        const story = getStoryById(body.storyId);
        return NextResponse.json({ story });
    }

    if (action === "delete") {
        deleteStoryEntry(body.storyId, user.id, user.fullName);
        return NextResponse.json({ success: true });
    }

    if (action === "save-anthology") {
        const anthology = saveStoryAnthology({
            id: body.id || undefined,
            title: body.title,
            scopeType: body.scopeType || "school",
            scopeId: body.scopeId || null,
            schoolId: body.schoolId || null,
            districtScope: body.districtScope || null,
            edition: body.edition || "",
            pdfStoredPath: body.pdfStoredPath || null,
            coverImagePath: body.coverImagePath || null,
            pdfPageCount: body.pdfPageCount || 0,
            featured: body.featured || false,
            featuredRank: body.featuredRank || null,
            consentStatus: body.consentStatus || "pending",
            publishStatus: body.publishStatus || "draft",
            createdByUserId: user.id,
        });
        return NextResponse.json({ anthology });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

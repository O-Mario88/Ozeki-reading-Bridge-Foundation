import { NextRequest, NextResponse } from "next/server";
import {
    listPublishedStories,
    listStoryLanguages,
    listStoryTags,
} from "@/lib/db";
import type { StoryLibraryFilters } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;

    const filters: StoryLibraryFilters = {
        q: params.get("q") || undefined,
        region: params.get("region") || undefined,
        district: params.get("district") || undefined,
        schoolId: params.get("schoolId") ? Number(params.get("schoolId")) : undefined,
        grade: params.get("grade") || undefined,
        tag: params.get("tag") || undefined,
        language: params.get("language") || undefined,
        sort: (params.get("sort") as StoryLibraryFilters["sort"]) || "newest",
        page: params.get("page") ? Number(params.get("page")) : 1,
        limit: params.get("limit") ? Number(params.get("limit")) : 24,
    };

    const { stories, total } = listPublishedStories(filters);
    const languages = listStoryLanguages();
    const tags = listStoryTags();

    return NextResponse.json({ stories, total, languages, tags });
}

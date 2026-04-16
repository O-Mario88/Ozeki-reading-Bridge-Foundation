import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";
import { cookies } from "next/headers";
import { PORTAL_SESSION_COOKIE } from "@/lib/auth";
import { getPortalUserFromSession } from "@/services/dataService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { 
      lessonId, 
      overallRating,
      clarityRating,
      paceRating,
      usefulnessRating,
      audioVideoRating,
      mostUsefulFeedback,
      improvementFeedback,
      recommendLesson,
      suggestedNextTopic
    } = payload;

    if (!lessonId || typeof overallRating !== 'number') {
      return NextResponse.json({ error: "Invalid Payload." }, { status: 400 });
    }

    // Attempt to identify user
    const cookieStore = await cookies();
    const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
    
    if (!token) {
        return NextResponse.json({ error: "Only authenticated learners and staff can leave a review." }, { status: 401 });
    }

    const user = await getPortalUserFromSession(token);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized access token." }, { status: 401 });
    }

    // UPSERT review logic based on (recorded_lesson_id, user_id) unique constraint
    await queryPostgres(
       `INSERT INTO lesson_ratings (
          recorded_lesson_id, user_id, 
          overall_rating, clarity_rating, pace_rating, usefulness_rating, audio_video_rating,
          most_useful_feedback, improvement_feedback, recommend_lesson, suggested_next_topic,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (recorded_lesson_id, user_id) 
        DO UPDATE SET 
          overall_rating = EXCLUDED.overall_rating,
          clarity_rating = EXCLUDED.clarity_rating,
          pace_rating = EXCLUDED.pace_rating,
          usefulness_rating = EXCLUDED.usefulness_rating,
          audio_video_rating = EXCLUDED.audio_video_rating,
          most_useful_feedback = EXCLUDED.most_useful_feedback,
          improvement_feedback = EXCLUDED.improvement_feedback,
          recommend_lesson = EXCLUDED.recommend_lesson,
          suggested_next_topic = EXCLUDED.suggested_next_topic,
          updated_at = NOW()`,
       [
         lessonId, user.id, 
         overallRating, clarityRating || null, paceRating || null, usefulnessRating || null, audioVideoRating || null,
         mostUsefulFeedback || null, improvementFeedback || null, recommendLesson ?? null, suggestedNextTopic || null
       ]
    );

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("[telemetry] Lesson Ratings DB Error:", err);
    return NextResponse.json({ error: "Ratings database crash." }, { status: 500 });
  }
}

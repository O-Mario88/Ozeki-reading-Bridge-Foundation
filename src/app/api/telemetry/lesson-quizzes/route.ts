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
      quizId,
      answers // Record<number, string> (questionId -> submitted answer)
    } = payload;

    if (!lessonId || !quizId || !answers) {
      return NextResponse.json({ error: "Invalid Payload." }, { status: 400 });
    }

    // Authenticate Student/Teacher
    const cookieStore = await cookies();
    const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
    
    if (!token) return NextResponse.json({ error: "Must be logged in to submit tests." }, { status: 401 });
    
    const user = await getPortalUserFromSession(token);
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    // 1. Fetch Quiz & Questions Master Key
    const quizRes = await queryPostgres(`SELECT pass_mark FROM lesson_quizzes WHERE id = $1`, [quizId]);
    if (quizRes.rowCount === 0) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
    const passMark = quizRes.rows[0].pass_mark || 80;

    const questionsRes = await queryPostgres(`SELECT id, correct_answer, marks FROM lesson_quiz_questions WHERE quiz_id = $1`, [quizId]);
    const questions = questionsRes.rows;

    let totalMarks = 0;
    let earnedMarks = 0;

    // 2. Grade Submission Payload
    for (const q of questions) {
       totalMarks += q.marks;
       const studentAnswer = answers[q.id];
       if (studentAnswer && studentAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()) {
          earnedMarks += q.marks;
       }
    }

    const calculatedScore = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0;
    const isPassed = calculatedScore >= passMark;

    // 3. Document the attempt into DB
    await queryPostgres(
       `INSERT INTO lesson_quiz_attempts (quiz_id, recorded_lesson_id, user_id, score, passed, completed_at)
        VALUES ($1, $2, $3, $4, $5, NOW())`,
       [quizId, lessonId, user.id, calculatedScore, isPassed]
    );

    // 4. Update the Master Completion & Certification Graph
    // First, evaluate if they watched the video > 90% (Telemetry constraint calculation)
    const viewTrackerRes = await queryPostgres(
       `SELECT max_position_seconds, watch_seconds FROM lesson_view_sessions 
        WHERE recorded_lesson_id = $1 AND user_id = $2 ORDER BY max_position_seconds DESC LIMIT 1`,
       [lessonId, user.id]
    );
    
    let watchedLongEnough = false;
    // Note: To be fully accurate, we compare max_position_seconds to lesson total duration
    // But as an MVP fallback, we flag true if the system logged at least 300 seconds (5 mins).
    if (viewTrackerRes.rowCount > 0 && viewTrackerRes.rows[0].max_position_seconds > 300) {
       watchedLongEnough = true;
    }

    const isCertified = isPassed && watchedLongEnough;

    // 5. Upsert Certification Elegibility into completion log
    await queryPostgres(
       `INSERT INTO lesson_completion (
          recorded_lesson_id, user_id, 
          watched_recording, quiz_completed, quiz_score, certificate_eligible, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (recorded_lesson_id, user_id) 
        DO UPDATE SET 
          quiz_completed = true,
          quiz_score = EXCLUDED.quiz_score,
          certificate_eligible = EXCLUDED.certificate_eligible,
          completed_at = CASE WHEN EXCLUDED.certificate_eligible THEN NOW() ELSE lesson_completion.completed_at END,
          updated_at = NOW()`,
       [lessonId, user.id, watchedLongEnough, true, calculatedScore, isCertified]
    );

    return NextResponse.json({ 
       ok: true, 
       score: calculatedScore, 
       passed: isPassed, 
       certified: isCertified 
    });

  } catch (err) {
    console.error("[telemetry] Lesson Quizzes DB Error:", err);
    return NextResponse.json({ error: "Quiz processing engine crashed." }, { status: 500 });
  }
}

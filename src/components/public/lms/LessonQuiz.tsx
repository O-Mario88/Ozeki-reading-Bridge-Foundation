"use client";

import { useEffect, useState } from "react";

type QuizQuestion = {
  id: number;
  questionText: string;
  questionType: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
  options: string[];
  marks: number;
};

type QuizBundle = {
  quizId: number;
  lessonId: number;
  title: string;
  passMark: number;
  retakesAllowed: boolean;
  isRequired: boolean;
  questions: QuizQuestion[];
};

type QuizResult = {
  attemptId: number;
  scorePct: number;
  totalMarks: number;
  earnedMarks: number;
  passed: boolean;
  perQuestion: Array<{ questionId: number; correct: boolean; marks: number }>;
  message: string;
};

type Props = {
  lessonSlug: string;
  onCertificateEligible?: () => void;
};

export function LessonQuiz({ lessonSlug, onCertificateEligible }: Props) {
  const [quiz, setQuiz] = useState<QuizBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/recorded-lessons/${encodeURIComponent(lessonSlug)}/quiz`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status === 404 ? "none" : "error")))
      .then((json: QuizBundle) => { if (active) setQuiz(json); })
      .catch((e) => { if (active) setError(e === "none" ? "none" : "Could not load quiz"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lessonSlug]);

  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    const unanswered = quiz.questions.filter((q) => !answers[q.id] || answers[q.id].trim() === "");
    if (unanswered.length > 0) {
      alert(`Please answer all ${quiz.questions.length} questions. ${unanswered.length} remaining.`);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        quizId: quiz.quizId,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId: Number(questionId),
          answer,
        })),
      };
      const res = await fetch(`/api/recorded-lessons/${encodeURIComponent(lessonSlug)}/quiz/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as QuizResult & { error?: string };
      if (!res.ok) {
        alert(json.error || "Submission failed");
        return;
      }
      setResult(json);
      if (json.passed && onCertificateEligible) {
        onCertificateEligible();
      }
    } catch (e) {
      alert(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setResult(null);
  };

  if (loading) return <div className="lms-quiz lms-quiz-loading">Loading quiz…</div>;
  if (error === "none") return null;
  if (error) return <div className="lms-quiz lms-quiz-error">{error}</div>;
  if (!quiz || quiz.questions.length === 0) return null;

  if (result) {
    return (
      <div className={`lms-quiz lms-quiz-result ${result.passed ? "passed" : "failed"}`}>
        <div className="lms-quiz-result-header">
          <h3>{result.passed ? "✓ Passed" : "Not quite yet"}</h3>
          <div className="lms-quiz-score">
            <strong>{result.scorePct}%</strong>
            <small>{result.earnedMarks}/{result.totalMarks} marks · pass mark {quiz.passMark}%</small>
          </div>
        </div>
        <p>{result.message}</p>
        {result.passed ? (
          <p className="lms-quiz-cert-hint">
            🎓 Your certificate of completion will be available shortly. Keep watching to earn more.
          </p>
        ) : quiz.retakesAllowed ? (
          <button type="button" className="lms-quiz-btn" onClick={handleRetry}>
            Retake quiz
          </button>
        ) : (
          <p>Retakes are not allowed for this quiz.</p>
        )}
      </div>
    );
  }

  return (
    <div className="lms-quiz">
      <header className="lms-quiz-header">
        <h3>{quiz.title}</h3>
        <small>
          {quiz.questions.length} questions · pass mark {quiz.passMark}%
          {quiz.isRequired ? " · required for certificate" : ""}
        </small>
      </header>
      <div className="lms-quiz-questions">
        {quiz.questions.map((q, idx) => (
          <fieldset key={q.id} className="lms-quiz-question">
            <legend>
              <span className="lms-quiz-qnum">Q{idx + 1}.</span> {q.questionText}
              {q.marks > 1 ? <em> ({q.marks} marks)</em> : null}
            </legend>
            {q.questionType === "MULTIPLE_CHOICE" && q.options.length > 0 ? (
              <div className="lms-quiz-options">
                {q.options.map((opt) => (
                  <label key={opt} className="lms-quiz-option">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ) : q.questionType === "TRUE_FALSE" ? (
              <div className="lms-quiz-options">
                {["True", "False"].map((opt) => (
                  <label key={opt} className="lms-quiz-option">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                className="lms-quiz-text"
                rows={2}
                placeholder="Type your answer"
                value={answers[q.id] ?? ""}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
              />
            )}
          </fieldset>
        ))}
      </div>
      <button
        type="button"
        className="lms-quiz-btn lms-quiz-btn-primary"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? "Submitting…" : "Submit quiz"}
      </button>
    </div>
  );
}

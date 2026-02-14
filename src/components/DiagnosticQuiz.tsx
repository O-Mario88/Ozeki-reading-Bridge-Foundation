"use client";

import { FormEvent, useMemo, useState } from "react";

type Choice = "yes" | "sometimes" | "no";

type Question = {
  id: string;
  prompt: string;
};

const questions: Question[] = [
  {
    id: "explicit_sounds",
    prompt: "Teachers teach letter sounds explicitly using a planned progression.",
  },
  {
    id: "blending_daily",
    prompt: "Learners practice oral and print blending every day.",
  },
  {
    id: "decodable_text",
    prompt: "Decodable texts are used regularly in lower primary.",
  },
  {
    id: "fluency_tracking",
    prompt: "Oral reading fluency is tracked at least monthly.",
  },
  {
    id: "comprehension_routines",
    prompt: "Comprehension routines are embedded in reading lessons.",
  },
  {
    id: "leadership_supervision",
    prompt: "School leaders use classroom observation checklists for reading lessons.",
  },
  {
    id: "remedial_support",
    prompt: "The school runs structured catch-up support for non-readers.",
  },
];

const scoreMap: Record<Choice, number> = {
  yes: 2,
  sometimes: 1,
  no: 0,
};

const recommendations = [
  "Run a teacher refresher on explicit phonics and blending routines.",
  "Start weekly learner reading checks for decoding and fluency.",
  "Set up small-group remedial blocks for struggling readers.",
  "Coach school leaders on reading lesson supervision and feedback cycles.",
];

export function DiagnosticQuiz() {
  const [responses, setResponses] = useState<Record<string, Choice | undefined>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = useMemo(() => {
    return questions.reduce((total, question) => {
      const choice = responses[question.id];
      return total + (choice ? scoreMap[choice] : 0);
    }, 0);
  }, [responses]);

  const maxScore = questions.length * 2;
  const pct = Math.round((score / maxScore) * 100);

  const level =
    pct >= 75 ? "Strong foundation" : pct >= 45 ? "Developing systems" : "Priority support needed";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="card">
      <h2>Free Phonics Diagnostic Quiz (7 minutes)</h2>
      <p>Complete this quick school self-check and get immediate recommendations.</p>

      <form onSubmit={submit} className="form-grid">
        {questions.map((question) => (
          <fieldset key={question.id} className="full-width card">
            <legend>{question.prompt}</legend>
            <div className="action-row">
              <label>
                <input
                  type="radio"
                  name={question.id}
                  value="yes"
                  onChange={() =>
                    setResponses((prev) => ({ ...prev, [question.id]: "yes" }))
                  }
                  required
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  name={question.id}
                  value="sometimes"
                  onChange={() =>
                    setResponses((prev) => ({ ...prev, [question.id]: "sometimes" }))
                  }
                  required
                />
                Sometimes
              </label>
              <label>
                <input
                  type="radio"
                  name={question.id}
                  value="no"
                  onChange={() =>
                    setResponses((prev) => ({ ...prev, [question.id]: "no" }))
                  }
                  required
                />
                No
              </label>
            </div>
          </fieldset>
        ))}

        <button className="button" type="submit">
          Score my school
        </button>
      </form>

      {submitted ? (
        <div className="note-box">
          <p>
            <strong>Score:</strong> {score}/{maxScore} ({pct}%)
          </p>
          <p>
            <strong>Status:</strong> {level}
          </p>
          <p>
            <strong>Recommended next steps:</strong>
          </p>
          <ul>
            {recommendations.map((recommendation) => (
              <li key={recommendation}>{recommendation}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";

interface Question {
  id: number;
  question_text: string;
  options_json: string; // serialized JSON array
}

interface Props {
  lessonId: number;
  quizId: number;
  title: string;
  questions: Question[];
}

export function LessonQuizForm({ lessonId, quizId, title, questions }: Props) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{score: number, passed: boolean, certified: boolean} | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSelectOption = (questionId: number, option: string) => {
     setAnswers(prev => ({...prev, [questionId]: option}));
  };

  const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (Object.keys(answers).length < questions.length) {
        setErrorMsg("Please answer all questions before submitting.");
        return;
     }

     setErrorMsg("");
     setIsSubmitting(true);

     try {
       const res = await fetch("/api/telemetry/lesson-quizzes", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({ lessonId, quizId, answers })
       });

       if (!res.ok) {
          throw new Error("Failed to evaluate quiz submission.");
       }

       const data = await res.json();
       setResult(data);
     } catch (err: any) {
        setErrorMsg(err.message || "An error occurred.");
     } finally {
        setIsSubmitting(false);
     }
  };

  if (result) {
     return (
        <div className={`mt-12 p-8 rounded-2xl border ${result.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
           <div className="flex flex-col items-center text-center">
              {result.passed ? (
                 <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              ) : (
                 <XCircle className="w-16 h-16 text-red-500 mb-4" />
              )}
              <h2 className="text-2xl font-bold mb-2">
                 {result.passed ? "Congratulations!" : "Keep Trying!"}
              </h2>
              <p className="text-gray-700 font-medium text-lg mb-6">
                 You scored <span className="font-extrabold">{result.score}%</span> on the Mastery Check.
              </p>
              
              {result.certified ? (
                 <div className="bg-brand-primary text-white p-4 rounded-lg shadow-md max-w-sm font-semibold">
                    You have unlocked your OzekiRead Official Certificate of Completion for this module!
                 </div>
              ) : result.passed && !result.certified ? (
                 <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg shadow-sm text-sm border border-yellow-200">
                    You passed the quiz, but you haven't watched 90% of the video yet! Return and finish watching to unlock your Certificate.
                 </div>
              ) : (
                 <button onClick={() => setResult(null)} className="underline text-sm font-semibold text-gray-500 hover:text-gray-800">
                    Retake Mastery Check
                 </button>
              )}
           </div>
        </div>
     );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border-2 border-brand-primary/10 shadow-lg rounded-2xl p-8 mt-12">
      <h3 className="text-2xl font-extrabold text-[#0a2a34] mb-2">{title}</h3>
      <p className="text-gray-500 text-sm mb-8 pb-6 border-b border-gray-100">Test your mastery of this lesson's key concepts to earn your certificate.</p>

      {errorMsg && <div className="p-3 bg-red-50 text-red-700 text-sm rounded mb-6 font-medium">{errorMsg}</div>}

      <div className="flex flex-col gap-8">
         {questions.map((q, index) => {
            let options: string[] = [];
            try { options = JSON.parse(q.options_json); } catch {}

            return (
               <div key={q.id} className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <h4 className="font-bold text-gray-800 mb-4 text-lg">{index + 1}. {q.question_text}</h4>
                  <div className="flex flex-col gap-3">
                     {options.map((opt, i) => (
                        <label key={i} className={`flex items-center p-4 rounded-lg border cursor-pointer transition-colors ${answers[q.id] === opt ? 'bg-brand-primary/10 border-brand-primary shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-100'}`}>
                           <input 
                              type="radio" 
                              name={`question_${q.id}`} 
                              value={opt}
                              checked={answers[q.id] === opt}
                              onChange={() => handleSelectOption(q.id, opt)}
                              className="mr-3 w-5 h-5 text-brand-primary focus:ring-brand-primary"
                           />
                           <span className="font-medium text-gray-700">{opt}</span>
                        </label>
                     ))}
                  </div>
               </div>
            );
         })}
      </div>

      <div className="pt-8">
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full md:w-auto bg-brand-primary hover:bg-[#d63a15] text-white font-extrabold py-4 px-12 rounded-xl transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-brand-primary/30"
        >
           {isSubmitting ? "Evaluating..." : "Submit Mastery Check"}
        </button>
      </div>
    </form>
  );
}

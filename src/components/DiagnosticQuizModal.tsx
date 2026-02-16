"use client";

import { DiagnosticQuiz } from "@/components/DiagnosticQuiz";
import { FloatingFormModal } from "@/components/FloatingFormModal";

export function DiagnosticQuizModal() {
  return (
    <FloatingFormModal
      triggerLabel="Open diagnostic quiz"
      title="Free phonics diagnostic quiz"
      description="Complete the quiz and get immediate recommendations."
    >
      {({ close }) => (
        <div className="floating-form-content">
          <DiagnosticQuiz onSuccess={close} />
        </div>
      )}
    </FloatingFormModal>
  );
}


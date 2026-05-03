"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EnrollmentFormModal } from "@/components/portal/EnrollmentFormModal";
import { LiteracyImpactFormModal } from "@/components/portal/LiteracyImpactFormModal";
import type { SchoolDirectoryRecord } from "@/lib/types";

interface Props {
  school: SchoolDirectoryRecord;
}

export function SchoolProfileActionsClient({ school }: Props) {
  const router = useRouter();
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(false);
  const [isLiteracyOpen, setIsLiteracyOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; message: string } | null>(null);

  async function handleDelete() {
    if (!window.confirm(
      "Are you SURE you want to permanently delete this school and all of its associated records? This cannot be undone."
    )) return;

    setIsDeleting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/portal/schools/${school.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete school");
      router.push("/portal/schools/directory");
      router.refresh();
    } catch (err) {
      setFeedback({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error during deletion",
      });
      setIsDeleting(false);
    }
  }

  function handleSuccess() {
    setIsEnrollmentOpen(false);
    setIsLiteracyOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="portal-school-profile-actions">
        <button
          type="button"
          className="button button-compact"
          onClick={() => setIsEnrollmentOpen(true)}
        >
          New Enrollment
        </button>
        <button
          type="button"
          className="button button-compact"
          onClick={() => setIsLiteracyOpen(true)}
        >
          New Literacy Impact
        </button>
        <Link href={`/portal/trainings?new=1&schoolId=${school.id}`} className="button button-compact">
          New Training
        </Link>
        <Link href={`/portal/visits?new=1&schoolId=${school.id}`} className="button button-compact">
          New School Visit
        </Link>
        <Link href={`/portal/assessments?new=1&schoolId=${school.id}`} className="button button-compact">
          New Assessment
        </Link>
        <Link href={`/portal/story?new=1&schoolId=${school.id}`} className="button button-compact">
          New 1001 Story
        </Link>
        <button
          type="button"
          className="button button-compact button-warning ml-auto"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete School"}
        </button>
      </div>

      {feedback ? (
        <p
          role="status"
          className={`form-message ${feedback.kind === "error" ? "error" : "success"}`}
        >
          {feedback.message}
        </p>
      ) : null}

      <EnrollmentFormModal
        open={isEnrollmentOpen}
        onClose={() => setIsEnrollmentOpen(false)}
        school={school}
        onSuccess={handleSuccess}
      />

      <LiteracyImpactFormModal
        open={isLiteracyOpen}
        onClose={() => setIsLiteracyOpen(false)}
        school={school}
        onSuccess={handleSuccess}
      />
    </>
  );
}

# Form submission pattern (system-wide standard)

Every form across the platform should use this pair to surface consistent
submission feedback ("Successful" / "Failed") and reset on success.

## The two pieces

- **`useFormSubmit`** (`@/lib/forms/useFormSubmit`) — hook that tracks
  `status: "idle" | "submitting" | "success" | "failed"` and auto-reverts
  to idle after ~2s so the form is ready for the next entry.
- **`SubmitButton`** (`@/components/forms/SubmitButton`) — renders a
  consistent button across all states. Idle: your label + optional icon.
  Submitting: spinner + "Submitting…". Success: ✓ + "Successful" (green).
  Failed: ⚠ + "Failed" (red).

## Standard usage

```tsx
"use client";

import { useRef } from "react";
import { submitJson, useFormSubmit } from "@/lib/forms/useFormSubmit";
import { SubmitButton } from "@/components/forms/SubmitButton";

export function MyForm() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const submitter = useFormSubmit({
    onSuccess: () => formRef.current?.reset(), // wipes inputs ready for next entry
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    formRef.current = e.currentTarget;
    const data = Object.fromEntries(new FormData(e.currentTarget));
    await submitter.submit(async () =>
      submitJson("/api/some/endpoint", { method: "POST", body: JSON.stringify(data) })
    );
  }

  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      {/* …inputs… */}
      {submitter.status === "failed" && submitter.message ? (
        <p className="form-message error">{submitter.message}</p>
      ) : null}
      <SubmitButton state={submitter} idleLabel="Save" className="button" />
    </form>
  );
}
```

## Migrated so far

Round 1:
- `src/components/portal/NewContactModal.tsx`
- `src/components/portal/CoachingVisitForm.tsx`
- `src/components/portal/EnrollmentFormModal.tsx`
- `src/components/PortalLoginForm.tsx`
- `src/components/NewsletterSignup.tsx`

## Still to migrate (system-wide backlog)

These forms still hand-roll their own `saving` / `error` / `success`
state. They will work the way they always have until migrated, but
should be moved onto this pattern over time so the UX is uniform:

- `src/components/SiteFooter.tsx` (newsletter input in footer)
- `src/components/StoryFeedback.tsx`
- `src/components/StoryLibraryClient.tsx`
- `src/components/DiagnosticQuiz.tsx`
- `src/components/ResourceLibrary.tsx`
- `src/components/home/HomeSupportRequestModal.tsx`
- `src/components/BaseContactForm.tsx` (and every form that uses it: contact / partner / volunteer / etc.)
- `src/components/portal/PortalForcePasswordChange.tsx`
- `src/components/portal/PortalTestimonialsManager.tsx`
- `src/components/portal/PortalRecordedLessonsManager.tsx`
- `src/components/portal/PortalEventsManager.tsx`
- `src/components/portal/PortalTrainingReportsManager.tsx`
- `src/components/portal/PortalModuleManager.tsx`
- `src/components/portal/SchoolEditModalClient.tsx`
- `src/components/portal/LessonEvaluationPanel.tsx`
- `src/components/portal/PortalImpactReportsManager.tsx`
- `src/components/portal/PortalNewsletterManager.tsx`
- `src/components/portal/PortalResourcesManager.tsx`
- `src/components/portal/PortalNationalIntelligenceManager.tsx`
- `src/components/portal/PortalGalleryManager.tsx`
- `src/components/portal/SupportHubClient.tsx`
- `src/components/portal/PortalGraduationSettingsManager.tsx`
- `src/components/portal/LiteracyImpactFormModal.tsx`
- `src/components/portal/PortalUserAdminManager.tsx`
- `src/components/portal/EgraLearnerInputModal.tsx`
- `src/components/portal/PortalSchoolsManager.tsx`
- (~70 more — see `grep -rln 'type="submit"' src/components src/app`)

## Migration recipe

For each file:

1. Replace local `saving`/`error`/`success` state with one
   `useFormSubmit()` call.
2. Wrap the fetch in `submitter.submit(async () => submitJson(...))`.
3. Replace the submit `<button>` with `<SubmitButton state={submitter} idleLabel="…" />`.
4. In `onSuccess` either reset the form via a ref (`formRef.current?.reset()`)
   or set local field state back to empty.
5. Remove the now-orphaned `Loader2` / `CheckCircle2` / `AlertCircle`
   imports from the file if they were only used for the old state UI.

The `<SubmitButton>` swaps its background color (emerald/red) AND
label so success/failure is unmissable even without reading the text.

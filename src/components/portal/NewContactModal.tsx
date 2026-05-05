"use client";

import { useRef, type FormEvent } from "react";
import { FormModal } from "@/components/forms";
import { submitJson, useFormSubmit } from "@/lib/forms/useFormSubmit";
import { SubmitButton } from "@/components/forms/SubmitButton";

interface NewContactModalProps {
  schoolId: number;
  schoolName: string;
  onClose: () => void;
  onCreated: () => void;
}

/**
 * Canonical role vocabulary captured by the form.
 * Stored to school_contacts.role_title and indexed for analysis.
 * Replaces the legacy Category dropdown — it duplicated this list.
 * "Proprietor" pulled in from the old Category set so no value is lost.
 */
const ROLES = [
  "Director",
  "Head Teacher",
  "DOS",
  "Deputy Head Teacher",
  "Head Teacher Lower",
  "Classroom Teacher",
  "Proprietor",
  "Other",
] as const;

type Role = typeof ROLES[number];

/**
 * Map a Role to the legacy `category` enum the API still validates
 * against. When the API schema drops `category`, this map can go away.
 */
function roleToCategory(role: Role): "Head Teacher" | "Deputy Head Teacher" | "Classroom Teacher" | "Proprietor" | "Director" | "Other" {
  switch (role) {
    case "Director": return "Director";
    case "Head Teacher":
    case "Head Teacher Lower":
      return "Head Teacher";
    case "Deputy Head Teacher": return "Deputy Head Teacher";
    case "Classroom Teacher": return "Classroom Teacher";
    case "Proprietor": return "Proprietor";
    case "DOS":
    case "Other":
    default:
      return "Other";
  }
}

export function NewContactModal({ schoolId, schoolName, onClose, onCreated }: NewContactModalProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const submitter = useFormSubmit<{ success?: boolean }>({
    onSuccess: () => {
      formRef.current?.reset();
      setTimeout(() => { onCreated(); onClose(); }, 1000);
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    formRef.current = event.currentTarget;
    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") ?? "").trim();
    if (!fullName || fullName.length < 2) {
      formRef.current?.reportValidity();
      return;
    }
    const role = (String(formData.get("roleTitle") ?? "Head Teacher").trim() || "Head Teacher") as Role;
    await submitter.submit(async () =>
      submitJson<{ success?: boolean }>(`/api/portal/schools/${schoolId}/contacts`, {
        method: "POST",
        body: JSON.stringify({
          fullName,
          // Category derived server-bound from the chosen Role so the
          // legacy API enum still validates without exposing two
          // dropdowns to the user.
          category: roleToCategory(role),
          roleTitle: role,
          gender: String(formData.get("gender") ?? "Female"),
          phone: String(formData.get("phone") ?? "").trim(),
          email: String(formData.get("email") ?? "").trim(),
          whatsapp: String(formData.get("whatsapp") ?? "").trim(),
          isPrimaryContact: formData.get("isPrimary") === "on",
        }),
      }),
    );
  }

  return (
    <FormModal
      open
      onClose={onClose}
      title={`New Contact — ${schoolName}`}
      description="Add a head teacher, classroom teacher, or other contact to this school. They'll appear in the school's contact grid immediately."
      closeLabel="Cancel"
      maxWidth="640px"
    >
      <form onSubmit={handleSubmit} className="form-grid portal-form-grid" ref={formRef}>
        {submitter.status === "failed" && submitter.message ? (
          <div className="full-width form-message error" role="alert">{submitter.message}</div>
        ) : null}

        <fieldset className="portal-fieldset full-width">
          <legend>Identity</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <label className="full-width sm:col-span-2">
              <span className="portal-field-label">Full name *</span>
              <input
                name="fullName"
                type="text"
                placeholder="e.g. Sarah Akello"
                required
                minLength={2}
                autoFocus
              />
            </label>
            <label>
              <span className="portal-field-label">Role *</span>
              <select name="roleTitle" defaultValue="Head Teacher" required>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label>
              <span className="portal-field-label">Gender</span>
              <select name="gender" defaultValue="Female">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="portal-fieldset full-width">
          <legend>Contact details</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <label>
              <span className="portal-field-label">Phone</span>
              <input name="phone" type="tel" placeholder="+2567xxxxxxxx" inputMode="tel" />
            </label>
            <label>
              <span className="portal-field-label">WhatsApp</span>
              <input name="whatsapp" type="tel" placeholder="+2567xxxxxxxx" inputMode="tel" />
            </label>
            <label className="full-width sm:col-span-2">
              <span className="portal-field-label">Email</span>
              <input name="email" type="email" placeholder="name@school.org" />
            </label>
            <label className="full-width sm:col-span-2 inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="isPrimary" />
              <span>Set as primary contact for this school</span>
            </label>
          </div>
        </fieldset>

        <div className="full-width action-row portal-form-actions mt-4">
          <button type="button" className="button button-outline" onClick={onClose} disabled={submitter.isSubmitting}>
            Cancel
          </button>
          <SubmitButton state={submitter} type="submit" idleLabel="Create Contact" className="button" />
        </div>
      </form>
    </FormModal>
  );
}

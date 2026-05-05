"use client";

import { FormEvent, useState } from "react";
import { submitJson, useFormSubmit } from "@/lib/forms/useFormSubmit";
import { SubmitButton } from "@/components/forms/SubmitButton";

interface NewContactModalProps {
  schoolId: number;
  schoolName: string;
  onClose: () => void;
  onCreated: () => void;
}

const CATEGORIES = [
  "Head Teacher",
  "Deputy Head Teacher",
  "Classroom Teacher",
  "Proprietor",
  "Director",
  "Other",
] as const;

const EMPTY = {
  fullName: "",
  category: "Classroom Teacher" as string,
  gender: "Female" as "Male" | "Female" | "Other",
  phone: "",
  email: "",
  whatsapp: "",
  isPrimary: false,
};

export function NewContactModal({ schoolId, schoolName, onClose, onCreated }: NewContactModalProps) {
  const [form, setForm] = useState(EMPTY);
  const [validation, setValidation] = useState("");

  const submitter = useFormSubmit<{ success?: boolean }>({
    onSuccess: () => {
      setForm(EMPTY);
      setValidation("");
      setTimeout(() => { onCreated(); onClose(); }, 1200);
    },
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.fullName.trim()) {
      setValidation("Full name is required.");
      return;
    }
    setValidation("");
    await submitter.submit(async () =>
      submitJson<{ success?: boolean }>(`/api/portal/schools/${schoolId}/contacts`, {
        method: "POST",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          category: form.category,
          gender: form.gender,
          phone: form.phone.trim(),
          email: form.email.trim(),
          whatsapp: form.whatsapp.trim(),
          isPrimaryContact: form.isPrimary,
        }),
      }),
    );
  }

  return (
    <div className="sp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sp-modal" role="dialog" aria-label="New Contact">
        <div className="sp-modal-header">
          <h3>New Contact</h3>
          <button type="button" className="sp-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p className="sp-modal-description">
          Create a new contact linked to <strong>{schoolName}</strong>.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="sp-modal-form-grid">
            <label className="sp-modal-field">
              <span className="sp-modal-label">Full Name <span className="sp-required">*</span></span>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="e.g. Sarah Akello"
                required
                minLength={2}
                autoFocus
              />
            </label>

            <label className="sp-modal-field">
              <span className="sp-modal-label">Category</span>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>

            <label className="sp-modal-field">
              <span className="sp-modal-label">Gender</span>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as "Male" | "Female" | "Other" })}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label className="sp-modal-field">
              <span className="sp-modal-label">Phone</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+2567xxxxxxxx"
                inputMode="tel"
              />
            </label>

            <label className="sp-modal-field">
              <span className="sp-modal-label">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@school.org"
              />
            </label>

            <label className="sp-modal-field">
              <span className="sp-modal-label">WhatsApp</span>
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="+2567xxxxxxxx"
                inputMode="tel"
              />
            </label>

            <label className="sp-modal-field sp-modal-checkbox">
              <input
                type="checkbox"
                checked={form.isPrimary}
                onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
              />
              <span>Set as primary contact for this school</span>
            </label>
          </div>

          {validation ? <p className="sp-modal-error" role="alert">{validation}</p> : null}
          {submitter.status === "failed" && submitter.message ? <p className="sp-modal-error" role="alert">{submitter.message}</p> : null}

          <div className="sp-modal-actions">
            <button type="button" className="sp-btn sp-btn--ghost" onClick={onClose} disabled={submitter.isSubmitting}>
              Cancel
            </button>
            <SubmitButton
              state={submitter}
              type="submit"
              idleLabel="Create Contact"
              className="sp-btn"
            />
          </div>
        </form>
      </div>
    </div>
  );
}

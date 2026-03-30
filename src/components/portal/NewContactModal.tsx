"use client";

import { FormEvent, useState } from "react";

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

export function NewContactModal({ schoolId, schoolName, onClose, onCreated }: NewContactModalProps) {
  const [fullName, setFullName] = useState("");
  const [category, setCategory] = useState<string>("Classroom Teacher");
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Female");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/portal/schools/${schoolId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          category,
          gender,
          phone: phone.trim(),
          email: email.trim(),
          whatsapp: whatsapp.trim(),
          isPrimaryContact: isPrimary,
        }),
      });

      const data = (await response.json()) as { success?: boolean; message?: string; error?: string };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Could not create contact.");
      }

      setSuccess(data.message ?? "Contact created.");
      setTimeout(() => {
        onCreated();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create contact.");
    } finally {
      setSaving(false);
    }
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
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Sarah Akello"
                required
                minLength={2}
                autoFocus
              />
            </label>

            <label className="sp-modal-field">
              <span className="sp-modal-label">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>

            <label className="sp-modal-field">
              <span className="sp-modal-label">Gender</span>
              <select value={gender} onChange={(e) => setGender(e.target.value as "Male" | "Female" | "Other")}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label className="sp-modal-field">
              <span className="sp-modal-label">Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+2567xxxxxxxx"
                inputMode="tel"
              />
            </label>

            <label className="sp-modal-field">
              <span className="sp-modal-label">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@school.org"
              />
            </label>

            <label className="sp-modal-field">
              <span className="sp-modal-label">WhatsApp</span>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+2567xxxxxxxx"
                inputMode="tel"
              />
            </label>

            <label className="sp-modal-field sp-modal-checkbox">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
              />
              <span>Set as primary contact for this school</span>
            </label>
          </div>

          {error ? <p className="sp-modal-error" role="alert">{error}</p> : null}
          {success ? <p className="sp-modal-success" role="status">{success}</p> : null}

          <div className="sp-modal-actions">
            <button type="button" className="sp-btn sp-btn--ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="sp-btn" disabled={saving}>
              {saving ? "Saving…" : "Create Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

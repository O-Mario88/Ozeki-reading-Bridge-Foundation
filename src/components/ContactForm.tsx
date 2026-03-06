"use client";

import { BaseContactForm } from "./BaseContactForm";

export function ContactForm({
  onSuccess,
  onCancel,
}: {
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  async function handleSubmit(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? "Could not submit inquiry.");
    }
  }

  return (
    <BaseContactForm
      onSubmit={handleSubmit}
      onSuccess={onSuccess}
      onCancel={onCancel}
      successMessage="Inquiry sent successfully. We will reply within 1-2 business days."
      submitLabel="Send inquiry"
      submittingLabel="Submitting..."
    >
      <label>
        Inquiry type
        <select name="type" required>
          <option value="">Select inquiry type</option>
          <option value="School">School support inquiry</option>
          <option value="Partner">Partner/donor inquiry</option>
          <option value="Media">Media inquiry</option>
          <option value="General">General inquiry</option>
        </select>
      </label>

      <label>
        Name
        <input name="name" required />
      </label>

      <label>
        Email
        <input type="email" name="email" required />
      </label>

      <label>
        Phone
        <input name="phone" />
      </label>

      <label className="full-width">
        Organization
        <input name="organization" />
      </label>

      <label className="full-width">
        Message
        <textarea
          name="message"
          rows={5}
          placeholder="Tell us about your school, project, or support request."
          required
        />
      </label>
    </BaseContactForm>
  );
}

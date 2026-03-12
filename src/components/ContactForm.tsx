"use client";

import { BaseContactForm } from "./BaseContactForm";
import type { BaseContactSubmitResult } from "./BaseContactForm";
import { submitJsonWithOfflineQueue } from "@/lib/offline-form-queue";

export function ContactForm({
  onSuccess,
  onCancel,
}: {
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  async function handleSubmit(formData: FormData): Promise<BaseContactSubmitResult> {
    const payload = Object.fromEntries(formData.entries());
    const result = await submitJsonWithOfflineQueue<{ error?: string }>("/api/contacts", {
      payload,
      label: "Contact inquiry",
    });

    if (result.queued) {
      return {
        mode: "queued",
        successMessage:
          "No internet connection. Inquiry saved on this device and will sync automatically when connected.",
      };
    }

    if (!result.response.ok) {
      throw new Error(result.data?.error ?? "Could not submit inquiry.");
    }

    return { mode: "online" };
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

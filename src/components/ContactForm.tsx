"use client";

import { FormEvent, useState } from "react";

type SubmitState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

const initialState: SubmitState = { status: "idle", message: "" };

export function ContactForm({
  onSuccess,
  onCancel,
}: {
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [state, setState] = useState<SubmitState>(initialState);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "submitting", message: "Submitting inquiry..." });

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Could not submit inquiry.");
      }

      event.currentTarget.reset();
      setState({
        status: "success",
        message: "Inquiry sent successfully. We will reply within 1-2 business days.",
      });
      if (onSuccess) {
        window.setTimeout(() => {
          onSuccess();
        }, 700);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Submission failed. Try again.";
      setState({ status: "error", message });
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
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

      <div className="action-row">
        <button className="button" type="submit" disabled={state.status === "submitting"}>
          {state.status === "submitting" ? "Submitting..." : "Send inquiry"}
        </button>
        {onCancel ? (
          <button className="button button-ghost" type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>

      {state.message ? (
        <p className={`form-message ${state.status}`}>{state.message}</p>
      ) : null}
    </form>
  );
}

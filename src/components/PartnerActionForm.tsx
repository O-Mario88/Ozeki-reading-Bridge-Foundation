"use client";

import { FormEvent, useState } from "react";

type SubmitState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

const initialState: SubmitState = {
  status: "idle",
  message: "",
};

export function PartnerActionForm({
  type,
  actionLabel,
  includeCountry = false,
  contextLabel,
  onSuccess,
  onCancel,
}: {
  type: string;
  actionLabel: string;
  includeCountry?: boolean;
  contextLabel?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [state, setState] = useState<SubmitState>(initialState);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "submitting", message: "Submitting request..." });

    const formData = new FormData(event.currentTarget);
    const payload = {
      type,
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      organization: String(formData.get("organization") || ""),
      message: [
        contextLabel ? `Request context: ${contextLabel}` : null,
        `Role: ${String(formData.get("role") || "")}`,
        includeCountry ? `Country: ${String(formData.get("country") || "")}` : null,
        `Geography scope: ${String(formData.get("geographyScope") || "")}`,
        `Geography focus: ${String(formData.get("geographyFocus") || "")}`,
        `Support intensity: ${String(formData.get("supportIntensity") || "")}`,
        `Add-ons: ${String(formData.get("addons") || "None")}`,
        `Preferred reporting level: ${String(formData.get("reportingLevel") || "")}`,
        `Intended partnership size: ${String(formData.get("partnershipSize") || "")}`,
        `Preferred timeline: ${String(formData.get("timeline") || "")}`,
        `Message: ${String(formData.get("message") || "")}`,
      ]
        .filter(Boolean)
        .join("\n"),
    };

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Could not submit request.");
      }

      event.currentTarget.reset();
      setState({
        status: "success",
        message: "Request submitted successfully. Our partnerships team will follow up.",
      });
      if (onSuccess) {
        window.setTimeout(() => {
          onSuccess();
        }, 900);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Submission failed.";
      setState({ status: "error", message });
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
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
      <label>
        Organization
        <input name="organization" required />
      </label>
      <label>
        Role
        <input name="role" placeholder="Program Lead, Partnerships Manager..." required />
      </label>
      {includeCountry ? (
        <label>
          Country
          <input name="country" required />
        </label>
      ) : null}
      <label>
        Geography scope
        <select name="geographyScope" required>
          <option value="">Select scope</option>
          <option value="Country">Country (Uganda)</option>
          <option value="Region/Sub-region">Region/Sub-region</option>
          <option value="District">District</option>
        </select>
      </label>
      <label>
        Geography focus
        <input
          name="geographyFocus"
          placeholder="Example: Uganda / Northern Uganda / Gulu District"
          required
        />
      </label>
      <label>
        Support intensity
        <select name="supportIntensity" required>
          <option value="">Select intensity</option>
          <option value="Standard Support">Standard Support</option>
          <option value="Intensive Support">Intensive Support</option>
        </select>
      </label>
      <label>
        Add-ons (optional)
        <select name="addons">
          <option value="">None</option>
          <option value="Reading Materials Booster">Reading Materials Booster</option>
          <option value="Assessments & Data Booster">Assessments & Data Booster</option>
          <option value="1001 Story Project Booster">1001 Story Project Booster</option>
          <option value="Materials + Data">Materials + Data</option>
          <option value="Materials + Data + 1001 Story">Materials + Data + 1001 Story</option>
        </select>
      </label>
      <label className="full-width">
        Preferred reporting level
        <select name="reportingLevel" required>
          <option value="">Select reporting level</option>
          <option value="Public (Aggregated)">Public (Aggregated)</option>
          <option value="Partner Scope (Portal)">Partner Scope (Portal)</option>
          <option value="Secure School Reports">Secure School Reports</option>
        </select>
      </label>
      <label className="full-width">
        Intended partnership size (optional)
        <input name="partnershipSize" placeholder="Example: 1 school pilot, district cluster, national scope" />
      </label>
      <label className="full-width">
        Timeline (optional)
        <input name="timeline" placeholder="Example: Start in Term 2, FY2026 / 3-year partnership window" />
      </label>
      <label className="full-width">
        Message
        <textarea name="message" rows={4} placeholder="Share your funding interest or proposal request." required />
      </label>

      <div className="action-row">
        <button className="button" type="submit" disabled={state.status === "submitting"}>
          {state.status === "submitting" ? "Submitting..." : actionLabel}
        </button>
        {onCancel ? (
          <button className="button button-ghost" type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>

      {state.message ? <p className={`form-message ${state.status}`}>{state.message}</p> : null}
    </form>
  );
}

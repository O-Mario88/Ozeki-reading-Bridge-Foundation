"use client";

import { useState } from "react";
import { serviceOptions } from "@/lib/content";
import { submitJsonWithOfflineQueue } from "@/lib/offline-form-queue";

import { BaseContactForm } from "./BaseContactForm";
import { FormSection } from "./forms/FormPrimitives";

type BookingSubmitState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
  eventLink?: string | null;
  meetLink?: string | null;
};

const initialState: BookingSubmitState = { status: "idle", message: "", eventLink: null, meetLink: null };

export function BookingForm({
  onSuccess,
  onCancel,
}: {
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [state, setState] = useState<BookingSubmitState>(initialState);

  async function handleSubmit(formData: FormData) {
    setState({
      status: "submitting",
      message: "Submitting request...",
      eventLink: null,
      meetLink: null,
    });

    const payload = Object.fromEntries(formData.entries());

    try {
      const result = await submitJsonWithOfflineQueue<{
        error?: string;
        message?: string;
        calendar?: {
          eventLink: string | null;
          meetLink: string | null;
        } | null;
        calendarWarning?: string;
      }>("/api/bookings", {
        payload,
        label: "Booking request",
      });

      if (result.queued) {
        setState({
          status: "success",
          message:
            "No internet connection. Booking request saved on this device and will sync automatically when connected.",
          eventLink: null,
          meetLink: null,
        });
        return;
      }

      const data = result.data ?? {};

      if (!result.response?.ok) {
        throw new Error(data.error ?? "Could not submit booking request.");
      }

      setState({
        status: "success",
        message: data.calendarWarning
          ? `Booking request submitted. ${data.calendarWarning}`
          : "Booking request submitted and calendar invite created.",
        eventLink: data.calendar?.eventLink ?? null,
        meetLink: data.calendar?.meetLink ?? null,
      });
      if (onSuccess) {
        window.setTimeout(() => {
          onSuccess();
        }, 700);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Submission failed. Try again.";
      setState({ status: "error", message, eventLink: null, meetLink: null });
    }
  }

  return (
    <BaseContactForm
      onSubmit={handleSubmit}
      onSuccess={onSuccess}
      onCancel={onCancel}
      successMessage="Booking request submitted and calendar invite created."
      submitLabel="Submit request"
      submittingLabel="Submitting..."
    >
      <FormSection title="Booking Service">
        <label className="form-field-label">
          Service
          <select name="service" required>
            <option value="">Select a service</option>
            {serviceOptions.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </label>
      </FormSection>

      <FormSection title="School Details">
        <label className="form-field-label">
          School name
          <input name="schoolName" required />
        </label>
        <label className="form-field-label">
          Location
          <input name="location" placeholder="District / Town" required />
        </label>
        <label className="form-field-label">
          Grades served
          <input name="grades" placeholder="Nursery, P1-P7" required />
        </label>
        <label className="form-field-label">
          Number of teachers
          <input type="number" name="teachers" min={1} required />
        </label>
      </FormSection>

      <FormSection title="Contact Person">
        <label className="form-field-label">
          Contact person
          <input name="contactName" required />
        </label>
        <label className="form-field-label">
          Email
          <input type="email" name="email" required />
        </label>
        <label className="form-field-label">
          Phone / WhatsApp
          <input type="tel" name="phone" required />
        </label>
      </FormSection>

      <FormSection title="Scheduling Preferences">
        <label className="form-field-label">
          Preferred date
          <input
            type="date"
            name="preferredDate"
            required
            // Block past dates at the picker level — saves a server round-trip
            // and avoids the silent "submit succeeds but reservation invalid"
            // failure mode.
            min={new Date().toISOString().slice(0, 10)}
          />
        </label>
        <label className="form-field-label">
          Preferred time
          <input type="time" name="preferredTime" required />
        </label>
      </FormSection>

      <FormSection title="Instructional Context">
        <label className="form-field-label full-width">
          Key literacy challenges
          <textarea
            name="challenges"
            rows={4}
            placeholder="Describe current challenges in reading instruction."
            required
          />
        </label>
      </FormSection>

      <div className="action-row"></div>
      {state.eventLink || state.meetLink ? (
        <div className="form-message success" style={{ marginTop: "-1rem" }}>
          {state.eventLink ? (
            <p>
              <a href={state.eventLink} target="_blank" rel="noreferrer">
                Open calendar event
              </a>
            </p>
          ) : null}
          {state.meetLink ? (
            <p>
              <a href={state.meetLink} target="_blank" rel="noreferrer">
                Open Meet link
              </a>
            </p>
          ) : null}
        </div>
      ) : null}
    </BaseContactForm>
  );
}

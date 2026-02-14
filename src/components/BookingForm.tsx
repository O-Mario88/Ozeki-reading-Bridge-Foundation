"use client";

import { FormEvent, useState } from "react";
import { serviceOptions } from "@/lib/content";

type SubmitState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

const initialState: SubmitState = { status: "idle", message: "" };

export function BookingForm() {
  const [state, setState] = useState<SubmitState>(initialState);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "submitting", message: "Submitting request..." });

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Could not submit booking request.");
      }

      event.currentTarget.reset();
      setState({
        status: "success",
        message:
          "Booking request submitted. Our team will confirm by email and WhatsApp.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Submission failed. Try again.";
      setState({ status: "error", message });
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label>
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

      <label>
        School name
        <input name="schoolName" required />
      </label>

      <label>
        Contact person
        <input name="contactName" required />
      </label>

      <label>
        Email
        <input type="email" name="email" required />
      </label>

      <label>
        Phone / WhatsApp
        <input name="phone" required />
      </label>

      <label>
        Number of teachers
        <input type="number" name="teachers" min={1} required />
      </label>

      <label>
        Grades served
        <input name="grades" placeholder="Nursery, P1-P7" required />
      </label>

      <label>
        Location
        <input name="location" placeholder="District / Town" required />
      </label>

      <label>
        Preferred date
        <input type="date" name="preferredDate" required />
      </label>

      <label>
        Preferred time
        <input type="time" name="preferredTime" required />
      </label>

      <label className="full-width">
        Key literacy challenges
        <textarea
          name="challenges"
          rows={4}
          placeholder="Describe current challenges in reading instruction."
          required
        />
      </label>

      <button className="button" type="submit" disabled={state.status === "submitting"}>
        {state.status === "submitting" ? "Submitting..." : "Submit booking request"}
      </button>

      {state.message ? (
        <p className={`form-message ${state.status}`}>{state.message}</p>
      ) : null}
    </form>
  );
}

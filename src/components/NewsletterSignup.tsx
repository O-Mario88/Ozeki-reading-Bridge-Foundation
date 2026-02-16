"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type SubmitState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

const initialState: SubmitState = { status: "idle", message: "" };

export function NewsletterSignup() {
  const [state, setState] = useState<SubmitState>(initialState);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "submitting", message: "Submitting..." });

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Could not subscribe.");
      }

      event.currentTarget.reset();
      setState({
        status: "success",
        message: "Subscribed. You will receive weekly reading teaching tips.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Subscription failed. Try again.";
      setState({ status: "error", message });
    }
  }

  return (
    <form className="form-grid newsletter-form" onSubmit={handleSubmit}>
      <label>
        Name
        <input name="name" required />
      </label>
      <label>
        Email
        <input name="email" type="email" required />
      </label>

      <div className="newsletter-actions full-width">
        <button
          className="button newsletter-submit-button"
          type="submit"
          disabled={state.status === "submitting"}
        >
          {state.status === "submitting" ? "Submitting..." : "Subscribe"}
        </button>
        <Link className="button button-ghost newsletter-events-button" href="/events">
          View monthly events
        </Link>
      </div>

      {state.message ? (
        <p className={`form-message ${state.status} full-width`}>{state.message}</p>
      ) : null}
    </form>
  );
}

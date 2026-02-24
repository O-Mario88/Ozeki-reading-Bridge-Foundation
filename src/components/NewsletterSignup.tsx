"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type SubmitState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

const initialState: SubmitState = { status: "idle", message: "" };

export function NewsletterSignup() {
  const [state, setState] = useState<SubmitState>(initialState);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

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
    <>
      <div className="newsletter-actions full-width">
        <button className="button newsletter-submit-button" type="button" onClick={() => setIsOpen(true)}>
          Subscribe to Newsletter
        </button>
        <Link className="button button-ghost newsletter-events-button" href="/events">
          View monthly events
        </Link>
      </div>

      {state.message ? (
        <p className={`form-message ${state.status} full-width`}>{state.message}</p>
      ) : null}

      {isOpen
        ? createPortal(
          <div
            className="floating-donor-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Newsletter signup"
            onClick={() => setIsOpen(false)}
          >
            <div className="card floating-donor-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="floating-donor-header">
                <div>
                  <p className="kicker">Stay connected</p>
                  <h3>Subscribe to Newsletter</h3>
                  <p>Get weekly reading teaching tips delivered to your inbox.</p>
                </div>
                <button className="button button-ghost" type="button" onClick={() => setIsOpen(false)}>
                  Cancel
                </button>
              </div>
              <form className="form-grid newsletter-form" onSubmit={handleSubmit}>
                <label>
                  Name
                  <input name="name" required />
                </label>
                <label>
                  Email
                  <input name="email" type="email" required />
                </label>
                <button
                  className="button newsletter-submit-button full-width"
                  type="submit"
                  disabled={state.status === "submitting"}
                >
                  {state.status === "submitting" ? "Submitting..." : "Subscribe"}
                </button>
                {state.message ? (
                  <p className={`form-message ${state.status} full-width`}>{state.message}</p>
                ) : null}
              </form>
            </div>
          </div>,
          document.body,
        )
        : null}
    </>
  );
}

"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { submitJsonWithOfflineQueue } from "@/lib/offline-form-queue";
import { useFormSubmit } from "@/lib/forms/useFormSubmit";
import { SubmitButton } from "@/components/forms/SubmitButton";

export function NewsletterSignup() {
  const [isOpen, setIsOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);

  const submitter = useFormSubmit<void>({
    onSuccess: () => { formRef.current?.reset(); },
    resetMs: 2500,
  });

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
    formRef.current = event.currentTarget;
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    setStatusMessage("");
    await submitter.submit(async () => {
      const result = await submitJsonWithOfflineQueue<{ error?: string }>("/api/newsletter", {
        payload,
        label: "Newsletter signup",
      });
      if (result.queued) {
        setStatusMessage("No internet connection. Subscription saved on this device and will sync when connected.");
        return;
      }
      if (!result.response.ok) {
        throw new Error(result.data?.error ?? "Could not subscribe.");
      }
      setStatusMessage("Subscribed. You will receive weekly reading teaching tips.");
    });
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

      {(submitter.status === "success" || submitter.status === "failed") && statusMessage ? (
        <p className={`form-message ${submitter.status === "success" ? "success" : "error"} full-width`}>{statusMessage}</p>
      ) : submitter.status === "failed" && submitter.message ? (
        <p className="form-message error full-width">{submitter.message}</p>
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
              <form className="form-grid newsletter-form" onSubmit={handleSubmit} ref={formRef}>
                <label>
                  Name
                  <input name="name" required />
                </label>
                <label>
                  Email
                  <input name="email" type="email" required />
                </label>
                <SubmitButton
                  state={submitter}
                  type="submit"
                  idleLabel="Subscribe"
                  className="button newsletter-submit-button full-width"
                />
                {(submitter.status === "success" || submitter.status === "failed") && statusMessage ? (
                  <p className={`form-message ${submitter.status === "success" ? "success" : "error"} full-width`}>{statusMessage}</p>
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

"use client";

import { useState, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { officialContactLinks } from "@/lib/contact";

export const dynamic = "force-dynamic";

function MfaVerifyForm() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const [state, setState] = useState({ status: "idle", message: "" });

  if (!userId) {
    return <div className="portal-login-message error">Invalid session. Please sign in again.</div>;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "submitting", message: "Verifying code..." });

    const formData = new FormData(event.currentTarget);
    const code = formData.get("code") as string;

    try {
      const response = await fetch("/api/auth/mfa-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      });

      let data: Record<string, unknown> = {};
      try { data = await response.json(); } catch (_e) { /* ignore parse error */ }

      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Verification failed. Please try again.");
      }

      setState({ status: "success", message: "Verified successfully. Redirecting..." });
      window.location.href = typeof data.redirectTo === "string" ? data.redirectTo : "/portal/dashboard";
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Verification failed." });
    }
  }

  return (
    <div className="portal-login-card">
      <div className="portal-login-brand">
        <h1 className="portal-login-title">Security Verification</h1>
        <p className="portal-login-subtitle">A verification code has been sent to your email.</p>
      </div>

      <form className="portal-login-form" onSubmit={handleSubmit}>
        <label className="portal-login-label">
          <div className="portal-login-input-wrap">
            <input
              name="code"
              required
              maxLength={6}
              minLength={6}
              defaultValue={searchParams.get("devOtp") ?? ""}
              autoComplete="one-time-code"
              placeholder="Enter 6-digit code"
              className="portal-login-input"
              style={{ letterSpacing: "0.2em", textAlign: "center", fontSize: "1.2rem" }}
            />
          </div>
        </label>

        <button
          type="submit"
          disabled={state.status === "submitting"}
          className="portal-login-submit"
        >
          {state.status === "submitting" ? "Verifying..." : "Verify Code"}
        </button>

        {state.message && (
          <p className={`portal-login-message ${state.status === "error" ? "error" : "success"}`}>
            {state.message}
          </p>
        )}

        <div className="portal-login-footer" style={{ marginTop: "1rem" }}>
          <div className="portal-login-links">
            <a href="/portal/login">Back to Login</a>
            <a href={officialContactLinks.mailto}>Contact IT Support</a>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function PortalMfaVerifyPage() {
  return (
    <div className="portal-login-page">
      <div className="portal-login-page-inner">
        <Suspense fallback={<div className="portal-login-card">Loading...</div>}>
          <MfaVerifyForm />
        </Suspense>
      </div>
    </div>
  );
}

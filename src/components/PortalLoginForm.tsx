"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { officialContactLinks } from "@/lib/contact";

type SubmitState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

const initialState: SubmitState = { status: "idle", message: "" };
const approvedGoogleDomain = "ozekiread.org";

export function PortalLoginForm() {
  const [state, setState] = useState<SubmitState>(initialState);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "submitting", message: "Signing in..." });

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Could not sign in.");
      }

      const data = (await response.json()) as { redirectTo?: string };
      setState({ status: "success", message: "Sign-in successful. Redirecting..." });
      window.location.href = data.redirectTo ?? "/portal/dashboard";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign-in failed.";
      setState({ status: "error", message });
    }
  }

  return (
    <form className="form-grid portal-login-form" onSubmit={handleSubmit}>
      <label className="full-width">
        Email or Phone
        <input
          name="identifier"
          required
          placeholder="edwin@ozekiread.org or +2567xxxxxxx"
        />
      </label>
      <label className="full-width">
        Password
        <div className="portal-password-row">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            required
            minLength={6}
          />
          <button
            className="button button-ghost"
            type="button"
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      <button className="button" type="submit" disabled={state.status === "submitting"}>
        {state.status === "submitting" ? "Signing in..." : "Sign In"}
      </button>

      <a className="button button-ghost" href="/api/auth/google">
        Continue with Google
      </a>

      <p className="portal-login-note">
        Google sign-in is limited to approved <strong>@{approvedGoogleDomain}</strong> staff accounts.
        Use <strong>edwin@ozekiread.org</strong> or contact admin if your access has not been provisioned.
      </p>

      <p className="portal-login-note">
        Email/password sign-in remains available for the superadmin account if Google Workspace OAuth is unavailable.
      </p>

      <div className="portal-login-links">
        <a href={officialContactLinks.mailto}>Forgot password?</a>
        <a href={officialContactLinks.mailto}>Need access? Contact Admin</a>
      </div>

      {oauthError ? <p className="form-message error">{oauthError}</p> : null}

      {state.message ? (
        <p className={`form-message ${state.status}`}>{state.message}</p>
      ) : null}

      <p className="portal-login-footer">Version 1.0 • Support • Privacy</p>
    </form>
  );
}

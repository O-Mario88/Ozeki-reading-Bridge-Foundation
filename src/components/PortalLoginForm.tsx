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

      let data: Record<string, unknown> = {};
      try {
        const text = await response.text();
        if (text) {
          data = JSON.parse(text);
        }
      } catch {
        // response body was empty or not valid JSON
      }

      if (!response.ok) {
        const errorMsg =
          typeof data.error === "string"
            ? data.error
            : response.status === 502 || response.status === 504
              ? "The server is taking too long to respond. The database may be temporarily unreachable — please try again in a moment."
              : "Could not sign in. Please try again.";
        throw new Error(errorMsg);
      }

      setState({ status: "success", message: "Sign-in successful. Redirecting..." });
      window.location.href = (data.redirectTo as string) ?? "/portal/dashboard";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign-in failed.";
      setState({ status: "error", message });
    }
  }

  return (
    <div className="portal-login-card">
      {/* Branding */}
      <div className="portal-login-brand">
        <div className="portal-login-brand-icon">OR</div>
        <div>
          <h1 className="portal-login-title">Staff Portal</h1>
          <p className="portal-login-subtitle">Sign in to your Ozeki account</p>
        </div>
      </div>

      <form className="portal-login-form" onSubmit={handleSubmit}>
        <label className="portal-login-label">
          Email or Phone
          <input
            name="identifier"
            required
            placeholder="edwin@ozekiread.org or +2567xxxxxxx"
            className="portal-login-input"
            autoComplete="username"
          />
        </label>

        <label className="portal-login-label">
          <span className="portal-login-label-row">
            <span>Password</span>
            <button
              type="button"
              className="portal-login-toggle"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </span>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            required
            minLength={6}
            placeholder="Enter your password"
            className="portal-login-input"
            autoComplete="current-password"
          />
        </label>

        <button
          type="submit"
          disabled={state.status === "submitting"}
          className="portal-login-submit"
        >
          {state.status === "submitting" ? (
            <>
              <span className="portal-login-spinner" />
              Signing in…
            </>
          ) : (
            "Sign In"
          )}
        </button>

        <div className="portal-login-divider">
          <span>or</span>
        </div>

        <a href="/api/auth/google" className="portal-login-google">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </a>

        {/* Error/Success messages */}
        {oauthError && (
          <p className="portal-login-message error">{oauthError}</p>
        )}
        {state.message && (
          <p className={`portal-login-message ${state.status === "error" ? "error" : "success"}`}>
            {state.message}
          </p>
        )}

        {/* Footer */}
        <div className="portal-login-footer">
          <p className="portal-login-footnote">
            Google sign-in is limited to approved @{approvedGoogleDomain} staff accounts.
          </p>
          <div className="portal-login-links">
            <a href={officialContactLinks.mailto}>Forgot password?</a>
            <a href={officialContactLinks.mailto}>Contact Admin</a>
          </div>
        </div>
      </form>
    </div>
  );
}

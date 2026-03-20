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
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
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
    <div className="bg-white/95 backdrop-blur-xl rounded-[24px] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] p-8 sm:p-10 w-full border border-white/60 relative overflow-hidden">
      
      {/* TABS */}
      <div className="flex w-full mb-8 border-b border-gray-100">
        <button 
          type="button"
          className={`flex-1 pb-4 text-center font-semibold text-[15px] transition-colors relative ${activeTab === "login" ? "text-brand-text" : "text-gray-400 hover:text-gray-600"}`}
          onClick={() => setActiveTab("login")}
        >
          Sign In
          {activeTab === "login" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--md-sys-color-primary)] rounded-t-full" />
          )}
        </button>
        <button 
          type="button"
          className={`flex-1 pb-4 text-center font-semibold text-[15px] transition-colors relative ${activeTab === "signup" ? "text-brand-text" : "text-gray-400 hover:text-gray-600"}`}
          onClick={() => setActiveTab("signup")}
        >
          Sign Up
          {activeTab === "signup" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--md-sys-color-primary)] rounded-t-full" />
          )}
        </button>
      </div>

      {activeTab === "signup" ? (
        <div className="text-center py-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="w-16 h-16 bg-[var(--md-sys-color-primary)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[var(--md-sys-color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">School Enrollment</h3>
          <p className="text-brand-muted text-[15px] mb-8 leading-relaxed px-2">
            Staff portals are provisioned internally. If you are a school looking to join Ozeki, please self-register through an upcoming remote training session.
          </p>
          <a 
            href="/" 
            className="w-full inline-flex items-center justify-center bg-white border-[1.5px] border-gray-200 hover:border-[var(--md-sys-color-primary)] text-gray-700 hover:text-[var(--md-sys-color-primary)] rounded-full py-3.5 font-semibold transition-all shadow-sm"
          >
            Find an Event to Register
          </a>
        </div>
      ) : (
        <form className="flex flex-col gap-5 animate-in fade-in slide-in-from-left-4 duration-300" onSubmit={handleSubmit}>
          
          <label className="flex flex-col gap-2 text-[14px] font-medium text-brand-text">
            Email or Phone
            <input
              name="identifier"
              required
              placeholder="edwin@ozekiread.org or +2567xxxxxxx"
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-[14px] focus:bg-white focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/20 focus:border-[var(--md-sys-color-primary)] outline-none transition-all text-base text-gray-900 placeholder:text-gray-400"
            />
          </label>

          <label className="flex flex-col gap-2 text-[14px] font-medium text-brand-text relative">
            <div className="flex items-center justify-between">
              <span>Password</span>
              <button
                type="button"
                className="text-[13px] text-gray-500 hover:text-brand-text transition-colors font-medium"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              minLength={6}
              placeholder="Enter your password"
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-[14px] focus:bg-white focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/20 focus:border-[var(--md-sys-color-primary)] outline-none transition-all text-base text-gray-900 placeholder:text-gray-400"
            />
          </label>

          <button 
            type="submit" 
            disabled={state.status === "submitting"}
            className="w-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-full py-3.5 font-semibold hover:opacity-90 transition-all shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none mt-2"
          >
            {state.status === "submitting" ? "Signing in..." : "Sign In"}
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">or</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          <a 
            href="/api/auth/google"
            className="w-full flex items-center justify-center gap-2 bg-white border-[1.5px] border-gray-200 text-gray-700 rounded-full py-3.5 font-semibold hover:bg-gray-50 transition-all shadow-sm active:scale-[0.99]"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            Continue with Google
          </a>

          {oauthError ? <p className="text-[13px] text-red-600 font-medium text-center bg-red-50 p-3 rounded-xl">{oauthError}</p> : null}
          {state.message ? <p className={`text-[13px] font-medium text-center p-3 rounded-xl ${state.status === 'error' ? 'text-red-600 bg-red-50' : 'text-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)]/10'}`}>{state.message}</p> : null}

          <div className="text-center mt-3 mb-1">
             <span className="text-[14px] text-gray-500">Don't have an account? </span>
             <button type="button" onClick={() => setActiveTab("signup")} className="text-[14px] text-[var(--md-sys-color-primary)] font-semibold hover:underline bg-transparent border-none cursor-pointer">
               Sign up
             </button>
          </div>
          
          <div className="flex flex-col gap-1 items-center justify-center mt-2 border-t border-gray-100 pt-4">
             <p className="text-[12px] text-brand-muted text-center max-w-[90%] mx-auto">
               Google sign-in is limited to approved @{approvedGoogleDomain} staff accounts.
             </p>
             <div className="flex gap-4 text-[12px] text-gray-400 font-medium mt-1">
               <a href={officialContactLinks.mailto} className="hover:text-brand-text transition-colors">Forgot password?</a>
               <a href={officialContactLinks.mailto} className="hover:text-brand-text transition-colors">Contact Admin</a>
             </div>
          </div>
        </form>
      )}
    </div>
  );
}

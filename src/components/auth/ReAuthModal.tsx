"use client";

import { useState, FormEvent, ReactNode } from "react";
import { FormModal } from "@/components/forms";

type ReAuthModalProps = {
  triggerLabel: string | ReactNode;
  actionName: string;
  triggerClassName?: string;
  onVerify: () => void | Promise<void>;
};

export function ReAuthModal({ triggerLabel, actionName, triggerClassName = "button danger", onVerify }: ReAuthModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password) return;

    setStatus("submitting");
    try {
      const res = await fetch("/api/auth/reverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Incorrect password.");
      }

      // Success
      setIsOpen(false);
      setPassword("");
      setStatus("idle");
      // Fire callback
      await onVerify();
    } catch (error) {
      setStatus("error");
      setErrorMsg(error instanceof Error ? error.message : "Verification failed.");
    }
  }

  function handleOpen() {
    setIsOpen(true);
    setPassword("");
    setStatus("idle");
    setErrorMsg("");
  }

  return (
    <>
      <button type="button" className={triggerClassName} onClick={handleOpen}>
        {triggerLabel}
      </button>

      <FormModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={`Verify Identity to ${actionName}`}
        description="This is a sensitive action. Please enter your password to confirm."
        closeLabel="Cancel"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontWeight: 600 }}>
            Password
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                background: "#fff",
                border: "1px solid #ccc",
                borderRadius: "4px",
                padding: "10px",
                fontSize: "1rem"
              }}
              placeholder="Your current password"
            />
          </label>
          
          {status === "error" && (
            <p style={{ color: "var(--color-danger, #d32f2f)", fontSize: "0.9rem", margin: 0 }}>
              {errorMsg}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <button 
              type="button" 
              className="button hollow" 
              onClick={() => setIsOpen(false)}
              disabled={status === "submitting"}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="button danger"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "Verifying..." : "Confirm Action"}
            </button>
          </div>
        </form>
      </FormModal>
    </>
  );
}

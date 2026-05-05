"use client";

import { useCallback, useRef, useState } from "react";

export type SubmitStatus = "idle" | "submitting" | "success" | "failed";

export type UseFormSubmitOptions<T> = {
  /** Called once on success — typical use: clear inputs, refresh router. */
  onSuccess?: (result: T) => void;
  /** Called once on failure — typical use: surface a toast or inline detail. */
  onError?: (error: Error) => void;
  /** How long to keep the success/failed state visible before reverting to
   *  idle so the button is ready for the next submission. Default 2000ms. */
  resetMs?: number;
  /** When true (default), automatically reverts to idle after resetMs. */
  autoReset?: boolean;
};

export type UseFormSubmitReturn<T> = {
  status: SubmitStatus;
  message: string | null;
  isSubmitting: boolean;
  submit: (work: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
};

/**
 * Unified submit-state hook used by every form across the system.
 *
 * Wrap your fetch in `submit(async () => …)`. The hook tracks status
 * (idle / submitting / success / failed) and surfaces a default message
 * so a shared <SubmitButton /> can render a consistent label.
 *
 * On success it stays in the "success" state for `resetMs` (default 2s)
 * so users see the confirmation, then returns to "idle" so the form is
 * immediately ready for the next entry.
 *
 * Caller-provided `onSuccess` / `onError` fire on the same tick, so
 * resetting form fields stays simple:
 *
 *     const submitter = useFormSubmit({ onSuccess: () => setForm(empty) });
 *     <SubmitButton state={submitter} idleLabel="Save Visit" />
 */
export function useFormSubmit<T = unknown>(
  options: UseFormSubmitOptions<T> = {},
): UseFormSubmitReturn<T> {
  const { onSuccess, onError, resetMs = 2000, autoReset = true } = options;
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStatus("idle");
    setMessage(null);
  }, []);

  const scheduleReset = useCallback(() => {
    if (!autoReset) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setStatus("idle");
      setMessage(null);
    }, resetMs);
  }, [autoReset, resetMs]);

  const submit = useCallback(
    async (work: () => Promise<T>): Promise<T | null> => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setStatus("submitting");
      setMessage(null);
      try {
        const result = await work();
        setStatus("success");
        setMessage("Successful");
        onSuccess?.(result);
        scheduleReset();
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setStatus("failed");
        setMessage(err.message || "Failed");
        onError?.(err);
        scheduleReset();
        return null;
      }
    },
    [onSuccess, onError, scheduleReset],
  );

  return {
    status,
    message,
    isSubmitting: status === "submitting",
    submit,
    reset,
  };
}

/**
 * Convenience helper: throws if response is non-2xx so callers don't
 * need to check `res.ok` themselves. Returns parsed JSON.
 */
export async function submitJson<T = unknown>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty / non-json response is fine */
  }
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && typeof data.error === "string")
        ? data.error
        : `Request failed (HTTP ${res.status}).`;
    throw new Error(message);
  }
  return data as T;
}

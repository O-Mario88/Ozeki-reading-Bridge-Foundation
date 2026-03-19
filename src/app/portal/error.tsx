"use client";

import { useEffect } from "react";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PortalError]", error);
  }, [error]);

  return (
    <div
      style={{
        maxWidth: 500,
        margin: "80px auto",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Portal Temporarily Unavailable</h1>
      <p style={{ color: "#555", marginBottom: "1.5rem" }}>
        We&apos;re experiencing a temporary issue connecting to our services. Please try again in a moment.
      </p>
      <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
        <button
          onClick={reset}
          style={{
            padding: "0.6rem 1.5rem",
            background: "#1f2a44",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: "0.95rem",
          }}
        >
          Try Again
        </button>
        <a
          href="/"
          style={{
            padding: "0.6rem 1.5rem",
            background: "#e5e7eb",
            color: "#111",
            border: "none",
            borderRadius: 6,
            textDecoration: "none",
            fontSize: "0.95rem",
          }}
        >
          Go Home
        </a>
      </div>
      {error.digest ? (
        <p style={{ color: "#999", fontSize: "0.8rem", marginTop: "1.5rem" }}>
          Reference: {error.digest}
        </p>
      ) : null}
    </div>
  );
}

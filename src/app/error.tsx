"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RootError]", error);
  }, [error]);

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "80px auto",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
      <p style={{ color: "#555", marginBottom: "1.5rem" }}>
        We encountered an unexpected error loading this page. Our team has been notified.
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

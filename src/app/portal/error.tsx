"use client";

import { useEffect, useState } from "react";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    console.error("[PortalError]", error);
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
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Portal Temporarily Unavailable</h1>
      <p style={{ color: "#555", marginBottom: "1.5rem" }}>
        We&apos;re experiencing a temporary issue connecting to our services. Please try again in a moment.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "center" }}>
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
        <a
          href="/api/health/db"
          target="_blank"
          rel="noopener noreferrer"
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
          DB Health
        </a>
      </div>
      {error.digest ? (
        <p style={{ color: "#999", fontSize: "0.8rem", marginTop: "1.5rem" }}>
          Reference: {error.digest}
        </p>
      ) : null}

      {/* Diagnostic detail — collapsed by default, helps operators triage */}
      <div style={{ marginTop: "1rem" }}>
        <button
          onClick={() => setShowDetail(!showDetail)}
          style={{
            background: "none",
            border: "none",
            color: "#666",
            fontSize: "0.75rem",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          {showDetail ? "Hide diagnostics" : "Show diagnostics"}
        </button>
        {showDetail ? (
          <pre
            style={{
              textAlign: "left",
              background: "#f6f6f6",
              padding: "0.75rem",
              borderRadius: 6,
              fontSize: "0.7rem",
              color: "#444",
              overflow: "auto",
              maxHeight: 240,
              marginTop: "0.5rem",
              whiteSpace: "pre-wrap",
            }}
          >
            {error.name}: {error.message}
            {error.stack ? `\n\n${error.stack}` : ""}
          </pre>
        ) : null}
      </div>
    </div>
  );
}

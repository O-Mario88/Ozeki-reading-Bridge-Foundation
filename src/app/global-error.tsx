"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
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
          We encountered an unexpected error. Please try refreshing the page.
        </p>
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
        {error.digest ? (
          <p style={{ color: "#999", fontSize: "0.8rem", marginTop: "1.5rem" }}>
            Reference: {error.digest}
          </p>
        ) : null}
      </body>
    </html>
  );
}

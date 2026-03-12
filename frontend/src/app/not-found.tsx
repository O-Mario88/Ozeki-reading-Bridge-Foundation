import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container card stack" style={{ maxWidth: 700 }}>
      <h1 style={{ margin: 0 }}>Page not found</h1>
      <p style={{ margin: 0, color: "var(--text-muted)" }}>
        The requested page does not exist in the rebuilt production architecture.
      </p>
      <div>
        <Link className="button" href="/">
          Go Home
        </Link>
      </div>
    </div>
  );
}

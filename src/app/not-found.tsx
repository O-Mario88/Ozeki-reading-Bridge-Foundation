import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section" style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="container card flow" style={{ maxWidth: "600px", textAlign: "center" }}>
        <h1>Page not found</h1>
        <p>Sorry, we couldn't find the page you were looking for. It might have been moved or deleted.</p>

        <div style={{ marginTop: "2rem", marginBottom: "2rem" }}>
          <p><strong>Here are some helpful links:</strong></p>
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "1rem" }}>
            <li><Link href="/" className="phonics-link">Home</Link></li>
            <li><Link href="/programs" className="phonics-link">Programs</Link></li>
            <li><Link href="/resources" className="phonics-link">Resources</Link></li>
            <li><Link href="/contact" className="phonics-link">Contact</Link></li>
          </ul>
        </div>

        <Link className="button" href="/">
          Return home
        </Link>
      </div>
    </section>
  );
}

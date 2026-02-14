import Link from "next/link";

const quickLinks = [
  { href: "/about", label: "About" },
  { href: "/programs", label: "Programs" },
  { href: "/academy", label: "Ozeki Literacy Academy" },
  { href: "/pricing", label: "Pricing" },
  { href: "/transparency", label: "Transparency" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <section>
          <h3>Ozeki Reading Bridge Foundation</h3>
          <p>
            We strengthen reading instruction in nursery and primary schools through
            practical phonics, coaching, and literacy systems.
          </p>
          <a href="https://wa.me/256700000000" target="_blank" rel="noreferrer">
            WhatsApp: +256 700 000 000
          </a>
        </section>
        <section>
          <h3>Quick Links</h3>
          <ul>
            {quickLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3>Contact</h3>
          <p>Email: info@ozekireadingbridge.org</p>
          <p>Kampala, Uganda</p>
          <Link href="/contact">Send inquiry</Link>
        </section>
      </div>
      <div className="container footer-bottom">
        <p>
          © {new Date().getFullYear()} Ozeki Reading Bridge Foundation. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
}

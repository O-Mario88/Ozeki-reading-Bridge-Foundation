import Link from "next/link";
import { officialContact, officialContactLinks } from "@/lib/contact";

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/programs", label: "Programs" },
  { href: "/about", label: "About Ozeki" },
  { href: "/impact", label: "Impact Hub" },
  { href: "/impact/reports", label: "Impact Reports" },
  { href: "/media", label: "Evidence Gallery" },
  { href: "/resources", label: "Resources" },
  { href: "/partner", label: "Partner With Us" },
  { href: "/impact/case-studies", label: "Case Studies" },
  { href: "/transparency", label: "Trust & Accountability" },
  { href: "/contact", label: "Contact" },
  { href: "/donate", label: "Donate" },
];

export function SiteFooter() {
  const quickLinkColumns = chunkArray(quickLinks, 5);

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <section>
          <h3>Ozeki Reading Bridge Foundation</h3>
          <p>
            We strengthen reading instruction in nursery and primary schools through
            practical phonics, coaching, and literacy systems.
          </p>
          <p>
            We are based in Gulu City and prioritize literacy recovery in Northern
            Uganda communities affected by long-term education disruption.
          </p>
          <p>
            <Link href="/partner">Partner to support school literacy recovery</Link>
          </p>
        </section>
        <section className="footer-quick-links">
          <h3>Quick Links</h3>
          <div className="footer-links-columns">
            {quickLinkColumns.map((column, columnIndex) => (
              <ul className="footer-links-list" key={`footer-column-${columnIndex + 1}`}>
                {column.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </section>
        <section>
          <h3>Northern Uganda Focus</h3>
          <p>{officialContact.address}</p>
          <p>
            TIN: {officialContact.tin} <br />
            Registration No: {officialContact.regNo}
          </p>
          <p>
            <a href={officialContactLinks.mailto}>Email: {officialContact.email}</a>
            <br />
            <a href={officialContactLinks.tel}>Phone: {officialContact.phoneDisplay}</a>
          </p>
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

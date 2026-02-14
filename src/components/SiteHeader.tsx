import Link from "next/link";
import { primaryNav } from "@/lib/content";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden>
            ORB
          </span>
          <span>
            <strong>Ozeki Reading Bridge Foundation</strong>
            <small>Practical literacy systems for schools</small>
          </span>
        </Link>

        <nav aria-label="Primary">
          <ul className="nav-list">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/impact", label: "Impact" },
  { href: "/stories", label: "Stories" },
  { href: "/blog", label: "Blog" },
  { href: "/partner", label: "Partner" },
  { href: "/portal/login", label: "Portal" },
];

export function MainNav() {
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link className="brand" href="/">
          Ozeki Reading Bridge Foundation
        </Link>
        <nav className="nav-links" aria-label="Main">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

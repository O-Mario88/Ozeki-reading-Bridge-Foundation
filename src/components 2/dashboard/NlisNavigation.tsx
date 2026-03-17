"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
    label: string;
    href: string;
    icon?: string;
}

const PUBLIC_NAV: NavItem[] = [
    { label: "Dashboard", href: "/impact/dashboard", icon: "📊" },
    { label: "Government View", href: "/impact/government", icon: "🏛️" },
    { label: "Calculator", href: "/impact/calculator", icon: "💡" },
    { label: "Case Studies", href: "/impact/case-studies", icon: "📖" },
    { label: "Methodology", href: "/impact/methodology", icon: "📑" },
    { label: "Reports", href: "/impact/reports", icon: "📄" },
    { label: "Gallery", href: "/impact/gallery", icon: "🖼️" },
    { label: "Partner Data Room", href: "/partner/data-room", icon: "🤝" },
];

const STAFF_NAV: NavItem[] = [
    { label: "Portal", href: "/portal/dashboard", icon: "🏠" },
    { label: "Training", href: "/portal/training", icon: "🎓" },
    { label: "Visits", href: "/portal/visits", icon: "📍" },
    { label: "Schools", href: "/portal/schools", icon: "🏫" },
    { label: "Assessments", href: "/portal/assessments", icon: "📝" },
    { label: "Analytics", href: "/portal/analytics", icon: "📈" },
    { label: "Reports", href: "/portal/reports", icon: "📊" },
    { label: "Resources", href: "/portal/resources", icon: "📚" },
];

export default function NlisNavigation({ mode = "public" }: { mode?: "public" | "staff" }) {
    const pathname = usePathname();
    const items = mode === "staff" ? STAFF_NAV : PUBLIC_NAV;

    return (
        <nav
            aria-label={mode === "staff" ? "Staff navigation" : "Impact navigation"}
            style={{
                display: "flex",
                gap: "0.25rem",
                flexWrap: "wrap",
                padding: "0.5rem",
                background: "var(--md-sys-color-surface-container, #f0f0f0)",
                borderRadius: "12px",
                marginBottom: "1.5rem",
            }}
        >
            {items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        style={{
                            padding: "0.45rem 0.85rem",
                            borderRadius: "8px",
                            fontSize: "0.82rem",
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? "#fff" : "var(--md-sys-color-on-surface, #333)",
                            background: isActive ? "var(--md-sys-color-primary, #2563eb)" : "transparent",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            transition: "background 0.15s, color 0.15s",
                            whiteSpace: "nowrap",
                        }}
                    >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}

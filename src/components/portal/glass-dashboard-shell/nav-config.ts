import {
  LayoutDashboard,
  Lightbulb,
  School as SchoolIcon,
  UsersRound,
  CreditCard,
  ClipboardCheck,
  Eye,
  MapPin,
  Users,
  GraduationCap,
  Target,
  BookOpen,
  FileText,
  Trophy,
  TrendingUp,
  PenSquare,
  Calendar,
  MessageSquareQuote,
  Image as GalleryIcon,
  Info,
  UserCog,
  ShieldCheck,
  Headphones,
  Settings,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import type { PortalUserRole } from "@/lib/types";

export type GlassNavSection = "menu" | "features" | "cms" | "system";

export type GlassNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  section: GlassNavSection;
  superAdminOnly?: boolean;
  roles?: PortalUserRole[];
};

/**
 * Mirrors the legacy PortalShell nav list exactly so route coverage is
 * unchanged — only the rendering language is new.
 */
export const glassNavItems: GlassNavItem[] = [
  // Menu
  { href: "/portal/dashboard", label: "Reading Command Center", icon: LayoutDashboard, section: "menu", roles: ["Staff", "Admin", "Accountant"] },
  { href: "/portal/national-intelligence", label: "Reading Intelligence", icon: Lightbulb, section: "menu", roles: ["Staff", "Admin", "Accountant"] },
  { href: "/portal/schools", label: "Schools", icon: SchoolIcon, section: "menu", roles: ["Staff", "Admin", "Volunteer", "Accountant"] },
  { href: "/portal/learning-outcomes", label: "Learning Outcomes", icon: TrendingUp, section: "menu", roles: ["Staff", "Admin", "Volunteer", "Accountant"] },
  { href: "/portal/contacts", label: "CRM", icon: UsersRound, section: "menu", roles: ["Staff", "Admin", "Accountant"] },
  // Finance is locked to Super Admin per the 2026-05-06 onboarding-tier
  // spec. Plain Admins lose Finance visibility; only Super Admins see it.
  { href: "/portal/finance", label: "Finance", icon: CreditCard, section: "menu", superAdminOnly: true },

  // Features (renamed visually to "Reading Operations" via sectionMeta below; routes kept identical)
  { href: "/portal/assessments", label: "Reading Assessments", icon: ClipboardCheck, section: "features", roles: ["Staff", "Admin", "Volunteer", "Accountant"] },
  { href: "/portal/observations", label: "Teaching Quality", icon: Eye, section: "features", roles: ["Staff", "Admin", "Volunteer"] },
  { href: "/portal/visits", label: "Coaching & Support", icon: MapPin, section: "features", roles: ["Staff", "Admin", "Accountant", "Volunteer"] },
  { href: "/portal/coach-workload", label: "Coach Workload", icon: Users, section: "features", roles: ["Staff", "Admin"] },
  { href: "/portal/trainings", label: "Teacher Training", icon: GraduationCap, section: "features", roles: ["Staff", "Admin", "Accountant", "Volunteer"] },
  { href: "/portal/interventions", label: "Reading Interventions", icon: Target, section: "features", roles: ["Staff", "Admin", "Accountant"] },
  { href: "/portal/stories", label: "Story & Read-Alouds", icon: BookOpen, section: "features", roles: ["Staff", "Admin", "Volunteer", "Accountant"] },
  { href: "/portal/reports", label: "Reports", icon: FileText, section: "features", roles: ["Staff", "Volunteer", "Admin", "Accountant"] },
  { href: "/portal/graduation-queue", label: "Graduation Queue", icon: Trophy, section: "features", roles: ["Staff", "Admin", "Accountant"] },

  // CMS
  { href: "/portal/blog", label: "Blog", icon: PenSquare, section: "cms", roles: ["Staff", "Admin"] },
  { href: "/portal/events", label: "Events", icon: Calendar, section: "cms", roles: ["Staff", "Admin"] },
  { href: "/portal/testimonials", label: "Testimonials", icon: MessageSquareQuote, section: "cms", roles: ["Staff", "Admin"] },
  { href: "/portal/gallery", label: "Gallery", icon: GalleryIcon, section: "cms", roles: ["Staff", "Admin"] },
  { href: "/portal/about", label: "About Page", icon: Info, section: "cms", roles: ["Staff", "Admin"] },

  // System
  { href: "/portal/superadmin", label: "User Management", icon: UserCog, section: "system", superAdminOnly: true },
  { href: "/portal/data-quality", label: "Data Quality", icon: ShieldCheck, section: "system", roles: ["Staff", "Admin"] },
  { href: "/portal/support", label: "Support Requests", icon: Headphones, section: "system", roles: ["Staff", "Admin"] },
  { href: "/portal/admin/audit-trail", label: "Audit Trail", icon: ScrollText, section: "system", roles: ["Admin"] },
  { href: "/portal/admin/settings", label: "Admin / Settings", icon: Settings, section: "system", superAdminOnly: true },
];

const sectionMeta: Record<GlassNavSection, { label: string; icon: LucideIcon }> = {
  menu: { label: "Menu", icon: LayoutDashboard },
  features: { label: "Reading Operations", icon: GraduationCap },
  cms: { label: "Content", icon: PenSquare },
  system: { label: "System", icon: Settings },
};

export function getSectionMeta(section: GlassNavSection) {
  return sectionMeta[section];
}

export function filterNavForUser(
  items: GlassNavItem[],
  user: { isSuperAdmin?: boolean; role: PortalUserRole },
): GlassNavItem[] {
  return items.filter((item) => {
    if (item.superAdminOnly && !user.isSuperAdmin) return false;
    if (user.isSuperAdmin) return true;
    if (item.roles && !item.roles.includes(user.role)) return false;
    return true;
  });
}

/** Treat `/portal/finance/expenses` as a match for `/portal/finance`, etc. */
export function isHrefActive(itemHref: string, activeHref: string): boolean {
  if (activeHref === itemHref) return true;
  if (itemHref === "/portal/dashboard") return activeHref === itemHref; // dashboard is exact-match only
  return activeHref.startsWith(itemHref + "/");
}

export function findActiveSection(activeHref: string): GlassNavSection {
  // Prefer the longest prefix match so deeper routes win over the dashboard.
  const sorted = [...glassNavItems].sort((a, b) => b.href.length - a.href.length);
  const match = sorted.find((i) => isHrefActive(i.href, activeHref));
  return match?.section ?? "menu";
}

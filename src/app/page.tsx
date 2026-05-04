import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  Heart, GraduationCap, BookOpen, Users, ClipboardCheck, Library,
  Building2, TrendingUp, ChevronDown, ChevronLeft, ChevronRight, ArrowUpRight,
  Quote, Facebook, Twitter, Instagram, Youtube, Linkedin, Mail, Phone, MapPin,
  type LucideIcon,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Ozeki Reading Bridge Foundation — Building Strong Readers Across Uganda",
  description:
    "We equip teachers, reach children, and strengthen literacy across Uganda from the classroom to the community.",
};

const TEAL        = "#066a67";
const TEAL_DARK   = "#044f4d";
const TEAL_DEEP   = "#033f3e";
const TEAL_SOFT   = "#e6f3f2";
const ORANGE      = "#ff7235";
const ORANGE_DARK = "#e85f24";
const ORANGE_SOFT = "#fff0e8";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Impact", href: "/impact" },
  { label: "Programs", href: "/programs", hasMenu: true },
  { label: "Training", href: "/training" },
  { label: "Stories", href: "/stories" },
  { label: "About", href: "/about", hasMenu: true },
];

const PARTNERS = [
  { name: "USAID",                            text: "USAID" },
  { name: "UNICEF",                           text: "unicef" },
  { name: "Save the Children",                text: "Save the Children" },
  { name: "Global Partnership for Education", text: "Global Partnership for EDUCATION" },
  { name: "Wordworks",                        text: "Wordworks" },
];

const IMPACT_STATS: { icon: LucideIcon; value: string; label: string }[] = [
  { icon: Users,         value: "10,000+", label: "Teachers Trained Across Uganda" },
  { icon: GraduationCap, value: "32,600+", label: "Learners Reached In 2023" },
  { icon: BookOpen,      value: "1.2M+",   label: "Books & Materials Distributed" },
  { icon: Building2,     value: "1,450+",  label: "Schools Supported Nationally" },
  { icon: TrendingUp,    value: "76%",     label: "Average Reading Improvement" },
];

const PROGRAMS: { icon: string; title: string; description: string; href: string; iconBg: string; iconColor: string }[] = [
  { icon: "abc",  title: "Phonics Training",                description: "Practical phonics instruction that helps children decode and read with confidence.", href: "/programs/phonics",     iconBg: TEAL_SOFT,  iconColor: TEAL },
  { icon: "user", title: "Teacher Professional Development", description: "Building teacher capacity through ongoing training, mentorship & support.",          href: "/programs/teachers",    iconBg: ORANGE_SOFT, iconColor: ORANGE },
  { icon: "team", title: "In-School Coaching",              description: "On-site coaching and classroom support to strengthen teaching and learning.",         href: "/programs/coaching",    iconBg: TEAL_SOFT,  iconColor: TEAL },
  { icon: "doc",  title: "Reading Assessments",             description: "Data-driven tools to measure progress and inform instruction.",                       href: "/programs/assessments", iconBg: ORANGE_SOFT, iconColor: ORANGE },
  { icon: "book", title: "Reading Materials",               description: "High-quality, leveled books and resources for every learner.",                        href: "/programs/materials",   iconBg: TEAL_SOFT,  iconColor: TEAL },
];

const TESTIMONIALS = [
  { quote: "Since the training, my pupils are reading more confidently and participating actively in class.", name: "Mary Nalwadda", role: "Primary Teacher, Mukono" },
  { quote: "I love reading storybooks now. I can read to my little sister at home!",                          name: "Derrick O.",    role: "PS Learner, Lira" },
  { quote: "Ozeki's coaching helped our school improve reading scores by more than 60%.",                     name: "Headteacher",   role: "Rwentanda Primary School" },
];

const REGION_BARS = [
  { label: "Central",  value: "12,450", pct: 100 },
  { label: "Northern", value: "9,870",  pct: 79 },
  { label: "Eastern",  value: "6,890",  pct: 55 },
  { label: "Western",  value: "3,390",  pct: 27 },
];

const FOOTER_COLUMNS = [
  {
    title: "Explore",
    links: [
      { label: "Home",     href: "/" },
      { label: "Impact",   href: "/impact" },
      { label: "Programs", href: "/programs" },
      { label: "Training", href: "/training" },
      { label: "Stories",  href: "/stories" },
      { label: "About Us", href: "/about" },
    ],
  },
  {
    title: "Our Programs",
    links: [
      { label: "Phonics Training",          href: "/programs/phonics" },
      { label: "Teacher Development",       href: "/programs/teachers" },
      { label: "In-School Coaching",        href: "/programs/coaching" },
      { label: "Reading Assessments",       href: "/programs/assessments" },
      { label: "Reading Materials",         href: "/programs/materials" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog",                      href: "/blog" },
      { label: "Reports & Publications",    href: "/transparency" },
      { label: "Events",                    href: "/events" },
      { label: "FAQs",                      href: "/faqs" },
      { label: "Contact",                   href: "/contact" },
    ],
  },
];

/* ──────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="bg-white text-gray-900" style={{ fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
      <SiteHeader />
      <HeroSection />
      <PartnerLogoBand />
      <ImpactNumbersBand />
      <ProgramsSection />
      <UgandaImpactSection />
      <TestimonialsSection />
      <DonationCtaStrip />
      <SiteFooter />
    </div>
  );
}

/* ── Top utility strip ─────────────────────────────────────────────── */
function TopUtilityStrip() {
  return (
    <div style={{ background: TEAL_DARK }} className="text-white text-[12px]">
      <div className="max-w-[1280px] mx-auto px-6 h-9 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <span aria-hidden style={{ color: ORANGE }}>📣</span>
          <span>Building strong readers. Transforming futures across Uganda.</span>
        </div>
        <div className="hidden md:inline-flex items-center gap-2">
          <span>Teachers. Learners. Communities. Together.</span>
          <Heart className="h-3.5 w-3.5" style={{ color: ORANGE }} fill={ORANGE} />
        </div>
      </div>
    </div>
  );
}

/* ── Top nav bar ───────────────────────────────────────────────────── */
function TopNavBar() {
  return (
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-[1280px] mx-auto px-6 h-[72px] flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image src="/photos/logo.png" alt="Ozeki" width={40} height={40} className="rounded-lg object-contain" priority />
          <span className="leading-none">
            <span className="block text-[14px] font-extrabold tracking-tight" style={{ color: TEAL }}>OZEKI</span>
            <span className="block text-[9px] font-bold tracking-[0.18em] mt-1 text-gray-500">READING BRIDGE<br />FOUNDATION</span>
          </span>
        </Link>
        <nav className="hidden lg:flex items-center gap-7 text-[13.5px] font-semibold text-gray-700">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="inline-flex items-center gap-1 transition relative"
              style={item.label === "Home" ? { color: TEAL } : undefined}
            >
              {item.label}
              {item.hasMenu && <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.25} />}
              {item.label === "Home" && (
                <span aria-hidden className="absolute -bottom-[26px] left-0 right-0 h-[2px] mx-auto w-6" style={{ background: TEAL }} />
              )}
            </Link>
          ))}
        </nav>
        <Link
          href="/donate"
          className="inline-flex items-center gap-2 h-10 px-5 rounded-lg text-white text-[13px] font-bold shadow-sm shrink-0 transition"
          style={{ background: ORANGE }}
        >
          <Heart className="h-4 w-4" fill="white" strokeWidth={0} />
          Donate
        </Link>
      </div>
    </header>
  );
}

/* ── Hero section ──────────────────────────────────────────────────── */
function HeroSection() {
  return (
    <section className="relative bg-white overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-6 pt-14 pb-20 grid lg:grid-cols-[1.05fr_1fr] gap-10 items-start">
        {/* LEFT */}
        <div className="pt-4">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] mb-5" style={{ color: ORANGE }}>
            Strong Phonics. Confident Readers. Brighter Futures.
          </p>
          <h1
            className="text-[44px] md:text-[52px] lg:text-[58px] font-extrabold tracking-tight leading-[1.05] text-gray-900"
            style={{ fontFamily: '"Playfair Display", Georgia, "Times New Roman", serif' }}
          >
            Building Uganda&rsquo;s Future, <span style={{ color: TEAL }}>One Reader</span> At a Time.
          </h1>
          <p className="mt-6 text-[15px] text-gray-600 leading-relaxed max-w-[480px]">
            We equip teachers. We reach children. We strengthen literacy from the classroom to the community.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/donate"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-lg text-white font-bold text-[14px] shadow-md transition hover:opacity-95"
              style={{ background: ORANGE }}
            >
              <Heart className="h-4 w-4" fill="white" strokeWidth={0} />
              Support Our Mission
            </Link>
            <Link
              href="/programs"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-white border-2 font-bold text-[14px] transition"
              style={{ borderColor: TEAL, color: TEAL }}
            >
              Explore Programs
              <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} />
            </Link>
          </div>
          <div className="mt-9 flex items-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className="h-9 w-9 rounded-full border-2 border-white overflow-hidden bg-gray-200">
                  <span
                    className="block h-full w-full"
                    style={{
                      background: `linear-gradient(135deg, ${i % 2 ? TEAL : ORANGE} 0%, ${i % 2 ? TEAL_DARK : ORANGE_DARK} 100%)`,
                    }}
                  />
                </span>
              ))}
            </div>
            <p className="text-[13px] text-gray-700">
              <strong className="font-bold text-gray-900">10,000+</strong>{" "}
              <span className="text-gray-500">teachers trained across Uganda</span>
            </p>
          </div>
        </div>

        {/* RIGHT — composed image with floating cards + decorative shapes */}
        <div className="relative min-h-[500px] hidden lg:block">
          <div
            aria-hidden
            className="absolute right-2 top-2 w-[78%] h-[80%] rounded-[36px]"
            style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)`, opacity: 0.95 }}
          />
          <div aria-hidden className="absolute right-0 top-12 grid grid-cols-4 gap-1.5">
            {Array.from({ length: 16 }).map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: TEAL_SOFT }} />
            ))}
          </div>
          <div className="absolute right-6 top-8 w-[70%] aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/photos/classroom-learners-writing.jpg"
              alt="Ugandan student reading in class"
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
              priority
            />
          </div>
          <div className="absolute right-2 bottom-12 w-[42%] aspect-[5/4] rounded-2xl overflow-hidden shadow-xl border-4 border-white">
            <Image
              src="/photos/Reading Session in Dokolo Greater Bata Cluster.jpeg"
              alt="Classroom in session"
              fill
              sizes="(min-width: 1024px) 22vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="absolute left-0 top-16 bg-white rounded-2xl shadow-xl p-4 w-[200px] border border-gray-100">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl shrink-0" style={{ background: TEAL_SOFT }}>
                <GraduationCap className="h-5 w-5" style={{ color: TEAL }} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-[18px] font-extrabold text-gray-900 leading-none">32,600+</p>
                <p className="text-[10.5px] text-gray-500 leading-snug mt-1.5">Learners Reached<br />in 2023</p>
              </div>
            </div>
          </div>
          <div className="absolute left-2 top-[290px] bg-white rounded-2xl shadow-xl p-4 w-[200px] border border-gray-100">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl shrink-0" style={{ background: TEAL_SOFT }}>
                <BookOpen className="h-5 w-5" style={{ color: TEAL }} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-[18px] font-extrabold text-gray-900 leading-none">1.2M+</p>
                <p className="text-[10.5px] text-gray-500 leading-snug mt-1.5">Books &amp; Materials<br />Distributed</p>
              </div>
            </div>
          </div>
          <svg aria-hidden className="absolute right-0 bottom-0 w-32 h-32" viewBox="0 0 120 120">
            <path d="M 20 100 Q 50 50, 100 30 Q 70 70, 30 110 Z" fill={TEAL} opacity="0.18" />
            <path d="M 30 110 Q 60 80, 110 60" stroke={TEAL} strokeWidth="2" fill="none" opacity="0.4" />
          </svg>
          <svg aria-hidden className="absolute right-4 top-0 w-16 h-16" viewBox="0 0 60 60">
            <path d="M 5 30 Q 20 10, 35 30 Q 50 50, 55 25" stroke={ORANGE} strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      </div>
    </section>
  );
}

/* ── Partner logo band ─────────────────────────────────────────────── */
function PartnerLogoBand() {
  return (
    <section className="bg-white pb-10">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-5 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 items-center">
          <p className="text-[11px] font-bold text-gray-700 leading-snug">
            Trusted by partners and supporters who believe in every child.
          </p>
          <div className="flex flex-wrap items-center justify-around gap-x-6 gap-y-3">
            {PARTNERS.map((p) => (
              <span key={p.name} className="text-gray-400 text-[14px] font-bold tracking-wide opacity-70 hover:opacity-100 transition">
                {p.text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Impact Numbers band ───────────────────────────────────────────── */
function ImpactNumbersBand() {
  return (
    <section className="px-6 pb-12">
      <div
        className="max-w-[1280px] mx-auto rounded-3xl px-8 py-10 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${TEAL_DEEP} 0%, ${TEAL_DARK} 60%, ${TEAL} 100%)` }}
      >
        <svg aria-hidden className="absolute right-2 top-2 w-40 h-40 opacity-10" viewBox="0 0 100 100">
          <path d="M 10 90 Q 40 50, 90 20" stroke="white" strokeWidth="1.5" fill="none" />
          <path d="M 20 80 Q 50 40, 85 30" stroke="white" strokeWidth="1.5" fill="none" />
        </svg>
        <h2
          className="text-center text-white text-[22px] md:text-[26px] font-extrabold tracking-tight mb-7"
          style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
        >
          Our Impact in Numbers
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {IMPACT_STATS.map(({ icon: Icon, value, label }) => (
            <div key={label} className="bg-white rounded-xl p-5 text-center shadow-md">
              <span className="grid h-11 w-11 place-items-center rounded-full mx-auto mb-3" style={{ background: TEAL }}>
                <Icon className="h-5 w-5 text-white" strokeWidth={2} />
              </span>
              <p className="text-[24px] font-extrabold tracking-tight" style={{ color: TEAL }}>{value}</p>
              <p className="text-[11.5px] text-gray-600 leading-snug mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Programs section ──────────────────────────────────────────────── */
function ProgramIcon({ kind, color }: { kind: string; color: string }) {
  if (kind === "abc") {
    return <span className="text-[15px] font-extrabold" style={{ color }}>abc</span>;
  }
  const map: Record<string, LucideIcon> = {
    user: Users,
    team: Users,
    doc: ClipboardCheck,
    book: Library,
  };
  const Icon = map[kind] ?? BookOpen;
  return <Icon className="h-5 w-5" style={{ color }} strokeWidth={2} />;
}

function ProgramsSection() {
  return (
    <section className="px-6 py-16">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-10">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] mb-2" style={{ color: ORANGE }}>What We Do</p>
          <h2
            className="text-[32px] md:text-[36px] font-extrabold tracking-tight text-gray-900"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            Programs That Build Strong Readers
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {PROGRAMS.map((p) => (
            <div key={p.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
              <span className="grid h-10 w-10 place-items-center rounded-xl mb-4" style={{ background: p.iconBg }}>
                <ProgramIcon kind={p.icon} color={p.iconColor} />
              </span>
              <h3 className="text-[15px] font-bold text-gray-900 mb-2">{p.title}</h3>
              <p className="text-[12px] text-gray-600 leading-relaxed flex-1">{p.description}</p>
              <Link
                href={p.href}
                className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold transition"
                style={{ color: ORANGE }}
              >
                Learn more
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Uganda impact map section ─────────────────────────────────────── */
function UgandaImpactSection() {
  return (
    <section className="px-6 pb-16">
      <div
        className="max-w-[1280px] mx-auto rounded-3xl p-8 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr_1.3fr] gap-6 items-stretch"
        style={{ background: `linear-gradient(135deg, ${TEAL_DEEP} 0%, ${TEAL_DARK} 100%)` }}
      >
        <div className="text-white py-2">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] mb-3" style={{ color: ORANGE }}>
            National Reach
          </p>
          <h3
            className="text-[28px] md:text-[32px] font-extrabold leading-tight tracking-tight"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            Changing Lives<br />Across Uganda
          </h3>
          <p className="text-[13px] text-white/80 leading-relaxed mt-4 max-w-[280px]">
            From rural villages to urban centers, we&rsquo;re building a nation of confident readers.
          </p>
          <Link
            href="/impact"
            className="mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-white/10 border border-white/20 text-white text-[12.5px] font-semibold hover:bg-white/15 transition"
          >
            Explore Our Reach
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
          </Link>
        </div>

        <div className="flex items-center justify-center">
          <UgandaMap />
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[14px] font-bold text-gray-900">Impact Overview</h4>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 border border-gray-200 rounded-md px-2 py-1">
              2023 <ChevronDown className="h-3 w-3" strokeWidth={2.25} />
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Regions",  value: "112" },
              { label: "Districts", value: "48" },
              { label: "Schools",  value: "1,450+" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-gray-100 px-3 py-2.5">
                <p className="text-[10px] text-gray-500 font-semibold">{s.label}</p>
                <p className="text-[18px] font-extrabold mt-0.5" style={{ color: TEAL }}>{s.value}</p>
              </div>
            ))}
          </div>
          <p className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wider mb-2">Learners Reached by Region</p>
          <div className="grid grid-cols-[1fr_140px] gap-4 items-center">
            <div className="space-y-2">
              {REGION_BARS.map((r) => (
                <div key={r.label} className="grid grid-cols-[60px_1fr_56px] items-center gap-2 text-[11px]">
                  <span className="text-gray-700 font-semibold">{r.label}</span>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: TEAL }} />
                  </div>
                  <span className="text-right font-bold text-gray-900">{r.value}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center">
              <DonutChart />
              <p className="text-[10px] text-gray-500 mt-1.5 font-semibold">Total Learners</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function UgandaMap() {
  const markers = [
    { x: 68, y: 35 }, { x: 72, y: 50 }, { x: 60, y: 45 }, { x: 50, y: 38 },
    { x: 40, y: 42 }, { x: 30, y: 55 }, { x: 45, y: 60 }, { x: 55, y: 65 },
    { x: 65, y: 70 }, { x: 75, y: 65 }, { x: 50, y: 72 }, { x: 35, y: 75 },
    { x: 55, y: 85 }, { x: 70, y: 85 }, { x: 60, y: 90 },
  ];
  return (
    <svg viewBox="0 0 100 110" className="w-full max-w-[260px] h-auto" role="img" aria-label="Uganda — coverage map">
      <defs>
        <linearGradient id="ugMapFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.18" />
          <stop offset="100%" stopColor="white" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <path
        d="M 12 22 L 36 14 L 60 12 L 84 18 L 92 30 L 90 44 L 88 60 L 92 80 L 78 100 L 60 104 L 40 100 L 22 96 L 10 78 L 8 56 L 14 38 Z"
        fill="url(#ugMapFill)"
        stroke="white"
        strokeOpacity="0.35"
        strokeWidth="0.6"
      />
      {markers.map((m, i) => (
        <g key={i}>
          <circle cx={m.x} cy={m.y - 1.2} r="1.6" fill={ORANGE} />
          <path d={`M ${m.x} ${m.y - 0.2} L ${m.x - 1.2} ${m.y - 2.4} L ${m.x + 1.2} ${m.y - 2.4} Z`} fill={ORANGE} />
        </g>
      ))}
    </svg>
  );
}

function DonutChart() {
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = 0.76 * c;
  return (
    <svg width="92" height="92" viewBox="0 0 92 92">
      <circle cx="46" cy="46" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
      <circle
        cx="46"
        cy="46"
        r={r}
        fill="none"
        stroke={TEAL}
        strokeWidth="10"
        strokeDasharray={`${dash} ${c - dash}`}
        strokeDashoffset={c / 4}
        strokeLinecap="round"
        transform="rotate(-90 46 46)"
      />
      <circle
        cx="46"
        cy="46"
        r={r}
        fill="none"
        stroke={ORANGE}
        strokeWidth="10"
        strokeDasharray={`${c * 0.12} ${c}`}
        strokeDashoffset={-dash + c / 4}
        strokeLinecap="round"
        transform="rotate(-90 46 46)"
      />
      <text x="46" y="44" textAnchor="middle" fontWeight="800" fontSize="13" fill="#0f172a">
        32,600+
      </text>
      <text x="46" y="58" textAnchor="middle" fontSize="6.5" fill="#64748b">Total Learners</text>
    </svg>
  );
}

/* ── Testimonials ──────────────────────────────────────────────────── */
function TestimonialsSection() {
  return (
    <section className="px-6 pb-16 bg-white">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-10">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] mb-2" style={{ color: ORANGE }}>Stories of Change</p>
          <h2
            className="text-[32px] md:text-[36px] font-extrabold tracking-tight text-gray-900"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            Real Stories. Real Impact.
          </h2>
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label="Previous testimonial"
            className="hidden md:grid absolute -left-2 top-1/2 -translate-y-1/2 h-9 w-9 place-items-center rounded-full text-white shadow-md transition hover:opacity-90"
            style={{ background: ORANGE }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next testimonial"
            className="hidden md:grid absolute -right-2 top-1/2 -translate-y-1/2 h-9 w-9 place-items-center rounded-full text-white shadow-md transition hover:opacity-90"
            style={{ background: ORANGE }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 px-2 md:px-10">
            {TESTIMONIALS.map((t) => (
              <article key={t.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <Quote className="h-4 w-4 mb-3" style={{ color: ORANGE }} fill={ORANGE} />
                <p className="text-[13px] text-gray-700 leading-relaxed">{t.quote}</p>
                <div className="mt-5 flex items-center gap-3">
                  <span className="h-10 w-10 rounded-full grid place-items-center text-white font-bold" style={{ background: TEAL }}>
                    {t.name.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-gray-900 leading-tight">{t.name}</p>
                    <p className="text-[11px] text-gray-500 leading-tight">{t.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-6" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-1.5 rounded-full" style={{ width: i === 1 ? 16 : 6, background: i === 1 ? ORANGE : "#cbd5e1" }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Donation CTA strip ────────────────────────────────────────────── */
function DonationCtaStrip() {
  return (
    <section className="px-6 pb-16">
      <div
        className="max-w-[1280px] mx-auto rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-[280px_1fr_auto] items-center gap-6 px-6 py-7 relative"
        style={{ background: `linear-gradient(135deg, ${TEAL_DEEP} 0%, ${TEAL_DARK} 100%)` }}
      >
        <svg aria-hidden className="absolute left-4 top-2 w-32 h-24 opacity-15" viewBox="0 0 80 60">
          <path d="M 5 40 Q 20 10, 75 5" stroke="white" strokeWidth="1.5" fill="none" />
          <path d="M 10 50 Q 30 20, 70 15" stroke="white" strokeWidth="1.5" fill="none" />
        </svg>
        <div className="relative h-[150px] md:h-[160px] rounded-2xl overflow-hidden shadow-lg">
          <Image
            src="/photos/Reading Session in Dokolo Greater Bata Cluster.jpeg"
            alt="Child reading"
            fill
            sizes="280px"
            className="object-cover"
          />
        </div>
        <div className="text-white">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] mb-2" style={{ color: ORANGE }}>
            Be the Reason a Child Can Read
          </p>
          <h3
            className="text-[24px] md:text-[28px] font-extrabold leading-tight tracking-tight"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            Your Support Today Builds Their Tomorrow.
          </h3>
          <p className="text-[13px] text-white/85 mt-2 max-w-[420px]">
            Together, we can ensure every child has the skills, confidence, and opportunity to thrive.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 md:gap-3">
          <Link
            href="/donate"
            className="inline-flex items-center gap-2 h-12 px-7 rounded-xl text-white font-bold text-[14px] shadow-lg transition hover:opacity-95"
            style={{ background: ORANGE }}
          >
            Donate Now
            <Heart className="h-4 w-4" fill="white" strokeWidth={0} />
          </Link>
          <Link href="/donate?tab=other" className="text-[11.5px] text-white/85 font-semibold hover:text-white inline-flex items-center gap-1">
            Other ways to give <ArrowUpRight className="h-3 w-3" strokeWidth={2.25} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ────────────────────────────────────────────────────────── */
function SiteFooterReplica() {
  return (
    <footer className="bg-white">
      <div className="max-w-[1280px] mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.3fr_repeat(3,_1fr)_1.2fr] gap-8">
        <div>
          <Link href="/" className="flex items-center gap-2.5 mb-4">
            <Image src="/photos/logo.png" alt="Ozeki" width={36} height={36} className="rounded-lg object-contain" />
            <span className="leading-none">
              <span className="block text-[13px] font-extrabold tracking-tight" style={{ color: TEAL }}>OZEKI</span>
              <span className="block text-[8.5px] font-bold tracking-[0.18em] mt-1 text-gray-500">READING BRIDGE<br />FOUNDATION</span>
            </span>
          </Link>
          <p className="text-[12.5px] text-gray-600 leading-relaxed max-w-[280px]">
            Strengthening literacy in Uganda through teacher training, quality instruction, and community partnerships.
          </p>
          <div className="flex items-center gap-2 mt-4">
            {[
              { Icon: Facebook,  href: "https://facebook.com/ozeki",  label: "Facebook" },
              { Icon: Twitter,   href: "https://twitter.com/ozeki",   label: "Twitter" },
              { Icon: Instagram, href: "https://instagram.com/ozeki", label: "Instagram" },
              { Icon: Youtube,   href: "https://youtube.com/@ozeki",  label: "YouTube" },
              { Icon: Linkedin,  href: "https://linkedin.com/company/ozeki", label: "LinkedIn" },
            ].map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="grid h-8 w-8 place-items-center rounded-full text-white transition hover:opacity-90"
                style={{ background: TEAL }}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              </a>
            ))}
          </div>
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-[12.5px] font-extrabold text-gray-900 mb-3">{col.title}</p>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[12px] text-gray-600 hover:text-gray-900 transition">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <p className="text-[12.5px] font-extrabold text-gray-900 mb-3">Contact Us</p>
          <ul className="space-y-2.5 text-[12px] text-gray-600">
            <li className="inline-flex items-start gap-2">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: TEAL }} strokeWidth={2} />
              <span>Plot 15, Nakasero Road<br />Kampala, Uganda</span>
            </li>
            <li className="inline-flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: TEAL }} strokeWidth={2} />
              +256 773 397 375
            </li>
            <li className="inline-flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: TEAL }} strokeWidth={2} />
              info@ozekireadingbridge.org
            </li>
          </ul>
        </div>
      </div>
      <div className="text-white text-[11.5px]" style={{ background: TEAL_DARK }}>
        <div className="max-w-[1280px] mx-auto px-6 h-11 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-white/85">© 2026 Ozeki Reading Bridge Foundation. All rights reserved.</p>
          <nav className="flex items-center gap-5">
            <Link href="/privacy" className="text-white/85 hover:text-white transition">Privacy Policy</Link>
            <Link href="/terms"   className="text-white/85 hover:text-white transition">Terms of Use</Link>
            <Link href="/sitemap" className="text-white/85 hover:text-white transition">Sitemap</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

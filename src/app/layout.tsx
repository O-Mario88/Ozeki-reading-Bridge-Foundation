import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import "@/styles/finance-theme.css";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ModalAccessibilityManager } from "@/components/ModalAccessibilityManager";
import { organizationName, tagline } from "@/lib/content";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
  display: "swap",
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ozekireadingbridge.org"),
  title: {
    default: `${organizationName} | Practical Phonics and Literacy Support`,
    template: `%s | ${organizationName}`,
  },
  description:
    "Evidence-based teacher training, coaching, assessments, and literacy resources for nursery and primary schools.",
  applicationName: organizationName,
  openGraph: {
    type: "website",
    title: organizationName,
    description: tagline,
    siteName: organizationName,
  },
  twitter: {
    card: "summary_large_image",
    title: organizationName,
    description: tagline,
  },
  keywords: [
    "phonics training Uganda",
    "reading assessment primary schools",
    "teacher coaching literacy",
    "remedial reading",
    "decodable readers",
  ],
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} bg-brand-background text-brand-text antialiased`} suppressHydrationWarning>
        <ModalAccessibilityManager />
        <ServiceWorkerRegister />
        <SiteHeader />
        <main className="dashboard-inspired-main min-h-[calc(100vh-var(--header-height))]">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

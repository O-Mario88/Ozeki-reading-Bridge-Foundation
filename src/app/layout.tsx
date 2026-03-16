import type { Metadata } from "next";
import "./globals.css";
import "@/styles/finance-theme.css";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { organizationName, tagline } from "@/lib/content";

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-brand-background text-brand-text antialiased">
        <ServiceWorkerRegister />
        <SiteHeader />
        <main className="dashboard-inspired-main min-h-[calc(100vh-var(--header-height))]">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

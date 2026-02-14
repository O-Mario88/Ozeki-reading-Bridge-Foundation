import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

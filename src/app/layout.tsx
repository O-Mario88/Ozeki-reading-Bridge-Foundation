import type { Metadata } from "next";

import "./globals.css";
import "@/styles/finance-theme.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ModalAccessibilityManager } from "@/components/ModalAccessibilityManager";
import { organizationName, tagline } from "@/lib/content";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { Inter } from "next/font/google";
import { LayoutOrchestrator } from "@/components/public/LayoutOrchestrator";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ozekiread.org"),
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
      <body className={`${inter.variable} font-sans text-brand-text antialiased`} suppressHydrationWarning>
        <GradientBackground />
        <ModalAccessibilityManager />
        <ServiceWorkerRegister />
        <LayoutOrchestrator>
          {children}
        </LayoutOrchestrator>
      </body>
    </html>
  );
}

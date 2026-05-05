import type { Metadata, Viewport } from "next";

import "./globals.css";
import "@/styles/finance-theme.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ModalAccessibilityManager } from "@/components/ModalAccessibilityManager";
import { organizationName, tagline } from "@/lib/content";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { LayoutOrchestrator } from "@/components/public/LayoutOrchestrator";
import { OfflineBanner } from "@/components/public/OfflineBanner";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ozekiread.org"),
  title: {
    default: `${organizationName} | Practical Phonics and Literacy Support`,
    template: `%s | ${organizationName}`,
  },
  description:
    "Evidence-based teacher training, coaching, assessments, and literacy resources for nursery and primary schools across Uganda.",
  applicationName: organizationName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    title: organizationName,
    description: tagline,
    siteName: organizationName,
    url: "https://www.ozekiread.org",
    locale: "en_UG",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${organizationName} — ${tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: organizationName,
    description: tagline,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  keywords: [
    "phonics training Uganda",
    "reading assessment primary schools",
    "teacher coaching literacy",
    "remedial reading",
    "decodable readers",
    "early grade reading",
    "literacy NGO Uganda",
    "school partnerships Uganda",
    "teacher professional development",
  ],
  authors: [{ name: organizationName, url: "https://www.ozekiread.org" }],
  publisher: organizationName,
  category: "Education",
  manifest: "/manifest.webmanifest",
  // PWA / install metadata. The portal is the data-entry app target,
  // so installing on a phone drops the user straight into the login.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ozeki RBF",
    startupImage: ["/photos/logo.png"],
  },
  icons: {
    icon: [
      { url: "/photos/logo.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/photos/logo.png", sizes: "180x180", type: "image/png" },
    ],
  },
  verification: {
    // Drop your GSC token here once verified:
    // google: "<google-site-verification-token>",
  },
};

export const viewport: Viewport = {
  themeColor: "#003F37",
  width: "device-width",
  initialScale: 1,
  // Allow the user to zoom — accessibility requirement.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${plusJakarta.variable} font-sans text-brand-text antialiased`} suppressHydrationWarning>
        <OfflineBanner />
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

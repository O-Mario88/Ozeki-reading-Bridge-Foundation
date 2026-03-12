import type { Metadata } from "next";

import { MainNav } from "@/components/MainNav";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Ozeki Reading Bridge Foundation",
    template: "%s | Ozeki Reading Bridge Foundation",
  },
  description: "National literacy intelligence platform for measurable reading outcomes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MainNav />
        <main>{children}</main>
      </body>
    </html>
  );
}

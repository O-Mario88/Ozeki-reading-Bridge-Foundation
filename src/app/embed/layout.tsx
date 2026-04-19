import type { Metadata } from "next";
import "./embed.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Embed layout — chrome (nav/footer) is suppressed by LayoutOrchestrator
 * which detects the /embed/ path prefix. We must NOT re-define <html>/<body>
 * here because there is already a root layout; that would create duplicate
 * root markup and break the production build.
 */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <div className="embed-wrapper">{children}</div>;
}

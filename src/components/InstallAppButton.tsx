"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";

/**
 * InstallAppButton — the public-facing "Install on your phone" button
 * for the data-entry PWA.
 *
 * Three runtime branches:
 *
 * 1. Already running standalone (the user already installed). Renders
 *    nothing — there's nothing to install.
 *
 * 2. Android / Chromium browsers fire `beforeinstallprompt`. We capture
 *    the event and call `prompt()` when the user clicks. Once they
 *    accept (or dismiss), the event is consumed and the button hides.
 *
 * 3. iOS Safari never fires `beforeinstallprompt`. Detected via the
 *    UA and the absence of the standalone display mode; clicking shows
 *    a small inline hint explaining the Share → Add to Home Screen
 *    flow, since Apple gives us no programmatic install API.
 *
 * Renders nothing on the server; the install eligibility is a runtime
 * concern only.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type Platform = "android" | "ios" | "desktop" | "unknown";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Mobi|Tablet/.test(ua)) return "android"; // safer default for non-iOS mobile
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS exposes a non-standard property
  return Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

interface Props {
  /** Compact mode renders just an outlined button without the helper text. */
  compact?: boolean;
  className?: string;
}

export function InstallAppButton({ compact = false, className = "" }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setInstalled(true);
        }
        setDeferredPrompt(null);
      } catch {
        // Prompt may have been consumed by the browser; reset state.
        setDeferredPrompt(null);
      }
      return;
    }
    if (platform === "ios") {
      setShowIosHint((v) => !v);
      return;
    }
    // Desktop or other browsers without prompt support: show iOS-style hint
    // as a generic fallback so the user sees something actionable.
    setShowIosHint((v) => !v);
  };

  // On desktop without a deferred prompt, hide entirely — nothing useful
  // we can do, and the install is a phone-first feature.
  if (platform === "desktop" && !deferredPrompt) return null;

  return (
    <div className={`orbf-install-wrap ${className}`} style={{ display: "inline-flex", flexDirection: "column", gap: 8, alignItems: "stretch" }}>
      <button
        type="button"
        onClick={handleClick}
        className={compact ? "orbf-install-btn orbf-install-btn--compact" : "orbf-install-btn"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          height: compact ? 36 : 44,
          padding: compact ? "0 14px" : "0 18px",
          borderRadius: 12,
          background: "#003F37",
          color: "#fff",
          fontSize: compact ? 13 : 14,
          fontWeight: 700,
          border: "1px solid #003F37",
          cursor: "pointer",
          fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
        }}
      >
        {platform === "ios" ? <Smartphone size={16} /> : <Download size={16} />}
        <span>{platform === "ios" ? "Add to Home Screen" : "Install App"}</span>
      </button>

      {!compact ? (
        <p style={{ fontSize: 11, color: "#667085", margin: 0, textAlign: "center", maxWidth: 280, fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif' }}>
          Install Ozeki RBF on your phone for fast, offline-friendly data entry — assessments, observations, and visits.
        </p>
      ) : null}

      {showIosHint ? (
        <div
          role="dialog"
          aria-label="How to install on iPhone"
          style={{
            position: "relative",
            background: "#FFFFFF",
            border: "1px solid #E5EAF0",
            borderRadius: 12,
            padding: 14,
            fontSize: 12.5,
            color: "#111827",
            boxShadow: "0 4px 12px rgba(16,24,40,0.08)",
            fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
            lineHeight: 1.5,
          }}
        >
          <button
            type="button"
            onClick={() => setShowIosHint(false)}
            aria-label="Close"
            style={{
              position: "absolute", top: 6, right: 6, background: "transparent",
              border: 0, color: "#667085", cursor: "pointer", padding: 4,
            }}
          >
            <X size={14} />
          </button>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {platform === "ios" ? "Install on iPhone / iPad" : "Install from your phone browser"}
          </div>
          {platform === "ios" ? (
            <ol style={{ margin: 0, paddingLeft: 18, color: "#475467" }}>
              <li>Tap the <strong style={{ color: "#111827" }}>Share <Share size={11} style={{ display: "inline", verticalAlign: "middle" }} /></strong> button at the bottom of Safari.</li>
              <li>Scroll down and tap <strong style={{ color: "#111827" }}>Add to Home Screen</strong>.</li>
              <li>Tap <strong style={{ color: "#111827" }}>Add</strong>. The Ozeki app icon appears on your home screen.</li>
            </ol>
          ) : (
            <ol style={{ margin: 0, paddingLeft: 18, color: "#475467" }}>
              <li>Open this page in <strong style={{ color: "#111827" }}>Chrome</strong> on your Android phone.</li>
              <li>Tap the menu (<strong style={{ color: "#111827" }}>⋮</strong>) and choose <strong style={{ color: "#111827" }}>Install app</strong> or <strong style={{ color: "#111827" }}>Add to Home screen</strong>.</li>
              <li>Confirm. The Ozeki app icon appears on your home screen.</li>
            </ol>
          )}
        </div>
      ) : null}
    </div>
  );
}

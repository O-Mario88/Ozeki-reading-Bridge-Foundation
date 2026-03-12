"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { officialContact, officialContactLinks } from "@/lib/contact";
import { submitJsonWithOfflineQueue } from "@/lib/offline-form-queue";
import { Facebook, Instagram, Twitter, Youtube, Send, Mail, Phone, MapPin } from "lucide-react";

type FooterSubscribeState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

export function SiteFooter() {
  const [subscribeState, setSubscribeState] = useState<FooterSubscribeState>({
    status: "idle",
    message: "",
  });

  async function handleSubscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();

    if (!email) {
      setSubscribeState({ status: "error", message: "Email is required." });
      return;
    }

    setSubscribeState({ status: "submitting", message: "Saving..." });

    try {
      const result = await submitJsonWithOfflineQueue<{ error?: string }>("/api/newsletter", {
        payload: { email },
        label: "Footer newsletter signup",
      });

      if (result.queued) {
        form.reset();
        setSubscribeState({
          status: "success",
          message:
            "No internet connection. Subscription saved on this device and will sync automatically when connected.",
        });
        return;
      }

      if (!result.response.ok) {
        throw new Error(result.data?.error ?? "Could not subscribe right now.");
      }

      form.reset();
      setSubscribeState({
        status: "success",
        message: "Subscribed successfully for promotions and newsletter updates.",
      });
    } catch (error) {
      setSubscribeState({
        status: "error",
        message: error instanceof Error ? error.message : "Subscription failed. Try again.",
      });
    }
  }

  return (
    <footer className="site-footer-v2">
      <div className="footer-v2-container">
        <div className="footer-v2-grid">

          {/* Column 1: Brand & Social */}
          <div className="footer-v2-brand">
            <h2>Ozeki Reading Bridge</h2>
            <p>
              An innovative and engaging educational platform designed to make learning fun and accessible for children and practical phonics for teachers.
            </p>
            <div className="footer-v2-social">
              <a href="#" aria-label="Facebook"><Facebook size={18} /></a>
              <a href="#" aria-label="Instagram"><Instagram size={18} /></a>
              <a href="#" aria-label="Twitter"><Twitter size={18} /></a>
              <a href="#" aria-label="YouTube"><Youtube size={18} /></a>
            </div>
            <p className="footer-v2-note">
              <strong>TIN:</strong> {officialContact.tin}
            </p>
          </div>

          {/* Column 2: Useful Links */}
          <div className="footer-v2-col">
            <h3>Useful Links</h3>
            <ul className="footer-v2-links">
              <li><Link href="/">Home</Link></li>
              <li><Link href="/programs">Programs</Link></li>
              <li><Link href="/impact">Impact Hub</Link></li>
              <li><Link href="/newsletter">Newsletter</Link></li>
              <li><Link href="/stories">1001 Story Library</Link></li>
              <li><Link href="/resources">Resources</Link></li>
            </ul>
            <p className="footer-v2-note">
              <strong>Registration No:</strong> {officialContact.regNo}
            </p>
          </div>

          {/* Column 3: Our Company */}
          <div className="footer-v2-col">
            <h3>Our Company</h3>
            <ul className="footer-v2-links">
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/media">Media</Link></li>
              <li><Link href="/partner">Partner With Us</Link></li>
              <li><Link href="/contact">Contact Us</Link></li>
              <li><Link href="/transparency">Trust & Accountability</Link></li>
            </ul>
            <p className="footer-v2-note">Ozeki Reading Bridge Foundation, Uganda</p>
          </div>

          {/* Column 4: Subscribe & Contact */}
          <div className="footer-v2-col">
            <h3>Subscribe News</h3>
            <div className="footer-v2-subscribe">
              <form onSubmit={handleSubscribe}>
                <input
                  name="email"
                  type="email"
                  placeholder="Email address"
                  aria-label="Email address"
                  required
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  disabled={subscribeState.status === "submitting"}
                >
                  <Send size={16} />
                </button>
              </form>
              <p className="footer-v2-note" style={{ marginTop: "0.6rem" }}>
                Receive promotions and the Ozeki newsletter.
              </p>
              {subscribeState.message ? (
                <p className={`footer-v2-subscribe-message ${subscribeState.status}`}>
                  {subscribeState.message}
                </p>
              ) : null}
            </div>

            <div className="footer-v2-contact">
              <div className="footer-v2-contact-item">
                <div className="footer-v2-contact-icon">
                  <Mail size={14} />
                </div>
                <a href={officialContactLinks.mailto}>{officialContact.email}</a>
              </div>
              <div className="footer-v2-contact-item">
                <div className="footer-v2-contact-icon">
                  <Phone size={14} />
                </div>
                <a href={officialContactLinks.tel}>{officialContact.phoneDisplay}</a>
              </div>
              <div className="footer-v2-contact-item">
                <div className="footer-v2-contact-icon">
                  <MapPin size={14} />
                </div>
                <span>{officialContact.address}</span>
              </div>
            </div>

            <div className="footer-v2-meta">
              <p className="footer-v2-meta-item">
                <strong>P.O. Box:</strong> {officialContact.postalAddress}
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Banner */}
        <div className="footer-v2-bottom">
          <span>©{new Date().getFullYear()} Ozeki Reading Bridge Foundation</span>
          <span>|</span>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms & Conditions</Link>
        </div>
      </div>
    </footer>
  );
}

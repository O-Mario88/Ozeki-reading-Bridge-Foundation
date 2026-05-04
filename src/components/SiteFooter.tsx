"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { officialContact, officialContactLinks, socialLinks } from "@/lib/contact";
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
              <a href={socialLinks.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook size={18} /></a>
              <a href={socialLinks.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={18} /></a>
              <a href={socialLinks.twitter} target="_blank" rel="noreferrer" aria-label="Twitter / X"><Twitter size={18} /></a>
              <a href={socialLinks.youtube} target="_blank" rel="noreferrer" aria-label="YouTube"><Youtube size={18} /></a>
            </div>
          </div>

          {/* Column 2: Explore */}
          <div className="footer-v2-col">
            <h3>Explore</h3>
            <ul className="footer-v2-links">
              <li><Link href="/">Home</Link></li>
              <li><Link href="/programs">Programs</Link></li>
              <li><Link href="/impact">Impact Hub</Link></li>
              <li><Link href="/blog">Blog</Link></li>
              <li><Link href="/stories">1001 Story Library</Link></li>
              <li><Link href="/resources">Resources</Link></li>
              <li><Link href="/academy">Academy</Link></li>
              <li><Link href="/newsletter">Newsletter</Link></li>
            </ul>
          </div>

          {/* Column 3: Get Involved */}
          <div className="footer-v2-col">
            <h3>Get Involved</h3>
            <ul className="footer-v2-links">
              <li><Link href="/donate">Donate</Link></li>
              <li><Link href="/partner">Partner With Us</Link></li>
              <li><Link href="/sponsor-a-school">Sponsor a School</Link></li>
              <li><Link href="/sponsor-a-district">Sponsor a District</Link></li>
              <li><Link href="/sponsor-a-sub-region">Sponsor a Sub-Region</Link></li>
              <li><Link href="/sponsor-a-region">Sponsor a Region</Link></li>
              <li><Link href="/for-teachers">For Teachers</Link></li>
              <li><Link href="/for-schools">For Schools</Link></li>
              <li><Link href="/book-visit">Book a Visit</Link></li>
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

        {/* Sitemap row — single-hop link surface for every public page */}
        <nav aria-label="Site map" className="footer-v2-sitemap">
          <div className="footer-v2-sitemap-col">
            <h4>About</h4>
            <Link href="/about">About Us</Link>
            <Link href="/about/our-story">Our Story</Link>
            <Link href="/about/leadership-team">Leadership</Link>
            <Link href="/problem">The Problem</Link>
            <Link href="/partners">Partners</Link>
            <Link href="/testimonials">Testimonials</Link>
            <Link href="/media">Media</Link>
            <Link href="/faqs">FAQs</Link>
            <Link href="/contact">Contact</Link>
          </div>
          <div className="footer-v2-sitemap-col">
            <h4>Programs</h4>
            <Link href="/phonics-training">Phonics Training</Link>
            <Link href="/teacher-professional-development">Teacher PD</Link>
            <Link href="/in-school-coaching-mentorship">In-School Coaching</Link>
            <Link href="/learner-reading-assessments-progress-tracking">Reading Assessments</Link>
            <Link href="/remedial-catch-up-reading-interventions">Remedial Reading</Link>
            <Link href="/reading-materials-development">Reading Materials</Link>
            <Link href="/teaching-aids-instructional-resources-teachers">Teaching Aids</Link>
            <Link href="/school-systems-routines">School Systems</Link>
            <Link href="/instructional-leadership-support">Leadership Support</Link>
            <Link href="/monitoring-evaluation-reporting">M&amp;E Reporting</Link>
            <Link href="/literacy-content-creation-advocacy">Content &amp; Advocacy</Link>
          </div>
          <div className="footer-v2-sitemap-col">
            <h4>Impact &amp; Evidence</h4>
            <Link href="/impact">Impact Hub</Link>
            <Link href="/impact/case-studies">Case Studies</Link>
            <Link href="/impact/methodology">Methodology</Link>
            <Link href="/impact/gallery">Evidence Gallery</Link>
            <Link href="/impact/calculator">Impact Calculator</Link>
            <Link href="/insights">Insights</Link>
            <Link href="/transparency">Trust &amp; Accountability</Link>
            <Link href="/transparency/financials">Financials</Link>
            <Link href="/governance">Governance</Link>
            <Link href="/safeguarding">Safeguarding</Link>
          </div>
          <div className="footer-v2-sitemap-col">
            <h4>Content</h4>
            <Link href="/blog">Blog</Link>
            <Link href="/stories">Stories</Link>
            <Link href="/story-project">1001 Story Project</Link>
            <Link href="/story-library">Story Library</Link>
            <Link href="/anthologies">Anthologies</Link>
            <Link href="/resources">Resources</Link>
            <Link href="/events">Events</Link>
            <Link href="/diagnostic-quiz">Diagnostic Quiz</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/academy">Academy</Link>
          </div>
        </nav>

        {/* Bottom Banner */}
        <div className="footer-v2-bottom">
          <span>©{new Date().getFullYear()} Ozeki Reading Bridge Foundation</span>
          <span>|</span>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms &amp; Conditions</Link>
          <Link href="/safeguarding">Safeguarding</Link>
          <Link href="/governance">Governance</Link>
          <span>|</span>
          <span><strong>Reg No:</strong> {officialContact.regNo}</span>
          <span><strong>TIN:</strong> {officialContact.tin}</span>
        </div>
      </div>
    </footer>
  );
}

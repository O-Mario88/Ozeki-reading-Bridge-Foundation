"use client";

import Link from "next/link";
import { officialContact, officialContactLinks } from "@/lib/contact";
import { Facebook, Instagram, Twitter, Youtube, Send, Mail, Phone } from "lucide-react";

export function SiteFooter() {
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
          </div>

          {/* Column 2: Useful Links */}
          <div className="footer-v2-col">
            <h3>Useful Links</h3>
            <ul className="footer-v2-links">
              <li><Link href="/">Home</Link></li>
              <li><Link href="/programs">Programs</Link></li>
              <li><Link href="/impact">Impact Hub</Link></li>
              <li><Link href="/stories">1001 Story Library</Link></li>
              <li><Link href="/resources">Resources</Link></li>
            </ul>
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
          </div>

          {/* Column 4: Subscribe & Contact */}
          <div className="footer-v2-col">
            <h3>Subscribe News</h3>
            <div className="footer-v2-subscribe">
              <form onSubmit={(e) => e.preventDefault()}>
                <input type="email" placeholder="Email address" aria-label="Email address" />
                <button type="submit" aria-label="Subscribe">
                  <Send size={16} />
                </button>
              </form>
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

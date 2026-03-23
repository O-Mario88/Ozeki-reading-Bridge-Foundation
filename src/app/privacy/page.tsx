import { SectionWrapper } from "@/components/public/SectionWrapper";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How Ozeki Reading Bridge Foundation collects, stores, and protects your personal data.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-brand-background pt-24 pb-16 md:pt-32 md:pb-20 border-b border-gray-100">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
            Privacy Policy
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Your privacy matters. This page explains how we handle personal information.
          </p>
        </div>
      </section>

      <SectionWrapper theme="light">
        <div className="max-w-3xl mx-auto prose prose-lg prose-gray">
          <p className="text-sm text-gray-500 mb-8">
            <strong>Last updated:</strong> March 2026
          </p>

          <h2>1. Information We Collect</h2>
          <p>
            Ozeki Reading Bridge Foundation (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
            &ldquo;our&rdquo;) collects information that you provide when you use
            our website, subscribe to our newsletter, fill out contact forms, or
            interact with our services. This may include:
          </p>
          <ul>
            <li>Name and email address</li>
            <li>Phone number (when voluntarily provided)</li>
            <li>School or organization name</li>
            <li>Aggregated academic performance data (anonymised)</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve our services</li>
            <li>Respond to inquiries and support requests</li>
            <li>Send newsletters and program updates (with your consent)</li>
            <li>Generate anonymised impact reports</li>
          </ul>

          <h2>3. Data Protection</h2>
          <p>
            We implement reasonable security measures to protect your personal
            data against unauthorized access, alteration, or destruction. All
            learner-level data is stored in encrypted databases and only
            accessible by authorized staff.
          </p>

          <h2>4. Data Sharing</h2>
          <p>
            We do not sell or share your personal information with third parties
            for marketing purposes. We may share aggregated, anonymised data with
            partners and government bodies to support literacy planning.
          </p>

          <h2>5. Cookies</h2>
          <p>
            Our website may use cookies to improve your browsing experience. You
            can control cookie preferences through your browser settings.
          </p>

          <h2>6. Your Rights</h2>
          <p>
            You have the right to access, correct, or delete your personal data.
            To exercise these rights, contact us at{" "}
            <a href="mailto:support@ozekiread.org">support@ozekiread.org</a>.
          </p>

          <h2>7. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. We will notify you of
            any changes by posting the new policy on this page with an updated
            revision date.
          </p>

          <h2>8. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact
            us at{" "}
            <a href="mailto:support@ozekiread.org">support@ozekiread.org</a> or
            visit our <a href="/contact">Contact page</a>.
          </p>
        </div>
      </SectionWrapper>
    </>
  );
}

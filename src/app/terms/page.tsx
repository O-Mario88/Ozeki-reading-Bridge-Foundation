import { SectionWrapper } from "@/components/public/SectionWrapper";

export const metadata = {
  title: "Terms & Conditions",
  description:
    "Terms and conditions for using the Ozeki Reading Bridge Foundation website and services.",
};

export default function TermsPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-brand-background pt-24 pb-16 md:pt-32 md:pb-20 border-b border-gray-100">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
            Terms &amp; Conditions
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Please review these terms carefully before using our website and services.
          </p>
        </div>
      </section>

      <SectionWrapper theme="light">
        <div className="max-w-3xl mx-auto prose prose-lg prose-gray">
          <p className="text-sm text-gray-500 mb-8">
            <strong>Last updated:</strong> March 2026
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing the Ozeki Reading Bridge Foundation website
            (&ldquo;Site&rdquo;), you agree to be bound by these Terms &amp;
            Conditions. If you do not agree with any part of these terms, you
            should not use the Site.
          </p>

          <h2>2. Use of the Site</h2>
          <p>
            The content on this Site is provided for general information and
            educational purposes. You may not use this Site for any unlawful
            purpose or in violation of these Terms.
          </p>

          <h2>3. Intellectual Property</h2>
          <p>
            All content, branding, and materials on this Site are the property of
            Ozeki Reading Bridge Foundation unless otherwise noted. You may not
            reproduce, distribute, or create derivative works without our prior
            written consent.
          </p>

          <h2>4. User Contributions</h2>
          <p>
            If you submit information through our forms (contact, newsletter,
            support requests), you grant us the right to use that information in
            accordance with our{" "}
            <a href="/privacy">Privacy Policy</a>.
          </p>

          <h2>5. Disclaimer</h2>
          <p>
            The Site and its content are provided &ldquo;as is&rdquo; without
            warranties of any kind. We do not guarantee that the Site will be
            error-free or uninterrupted.
          </p>

          <h2>6. Limitation of Liability</h2>
          <p>
            Ozeki Reading Bridge Foundation shall not be liable for any indirect,
            incidental, or consequential damages arising from your use of the
            Site or reliance on any information provided.
          </p>

          <h2>7. External Links</h2>
          <p>
            Our Site may contain links to third-party websites. We do not
            control or endorse those sites and are not responsible for their
            content or practices.
          </p>

          <h2>8. Modifications</h2>
          <p>
            We reserve the right to modify these Terms at any time. Changes will
            be posted on this page with an updated revision date. Continued use
            of the Site after changes constitutes acceptance of the new Terms.
          </p>

          <h2>9. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the
            laws of the Republic of Uganda.
          </p>

          <h2>10. Contact</h2>
          <p>
            For questions regarding these Terms, please contact us at{" "}
            <a href="mailto:support@ozekiread.org">support@ozekiread.org</a> or
            visit our <a href="/contact">Contact page</a>.
          </p>
        </div>
      </SectionWrapper>
    </>
  );
}

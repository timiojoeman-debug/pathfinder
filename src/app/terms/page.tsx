import type { Metadata } from "next";
import { LegalPage, LegalH2 } from "@/components/pf/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service — PathFinder",
  description: "The terms under which you use PathFinder.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="11 Jul 2026">
      <p>
        These terms govern your use of PathFinder. By creating an account or using the product, you agree to
        them. If you don&apos;t, please don&apos;t use the service.
      </p>
      <p style={{ marginTop: 12, fontSize: 13.5, fontStyle: "italic" }}>
        This is a starting-point agreement for an early-access product and should be reviewed by legal counsel
        before a public launch.
      </p>

      <LegalH2>Who can use it</LegalH2>
      <p>
        You must be at least 16 and able to form a binding agreement. You&apos;re responsible for keeping your
        login credentials secure and for activity under your account.
      </p>

      <LegalH2>Acceptable use</LegalH2>
      <ul>
        <li>Don&apos;t misuse the service — no scraping, abuse of AI features to generate bulk or deceptive content, attempts to break authentication or rate limits, or uploading unlawful content.</li>
        <li>Don&apos;t submit other people&apos;s personal data without a lawful basis.</li>
        <li>We may suspend accounts that abuse the platform or threaten its stability.</li>
      </ul>

      <LegalH2>AI-generated content</LegalH2>
      <p>
        PathFinder produces drafts — CV rewrites, cover letters, outreach, interview answers — using automated
        systems. Output can be inaccurate or generic. <strong>You must review and edit everything before you
        send it to an employer.</strong> The service does not provide legal, financial, or professional career
        advice, and outcomes (interviews, offers) are not guaranteed.
      </p>

      <LegalH2>Your content</LegalH2>
      <p>
        You keep ownership of the content you enter. You grant us a limited licence to process it solely to
        provide the service (including sending relevant text to our AI provider as described in the Privacy
        Policy). You can export or delete your content at any time from Settings.
      </p>

      <LegalH2>Availability</LegalH2>
      <p>
        The service is provided &quot;as is&quot; during early access. We don&apos;t guarantee uptime, and we
        may change or remove features. We&apos;ll give reasonable notice of material changes where we can.
      </p>

      <LegalH2>Liability</LegalH2>
      <p>
        To the extent permitted by law, PathFinder is not liable for indirect or consequential losses, or for
        decisions you make based on AI-generated drafts. Nothing in these terms limits liability that cannot be
        limited by law.
      </p>

      <LegalH2>Changes</LegalH2>
      <p>
        We may update these terms. If a change is material, we&apos;ll update the date above and, where
        appropriate, notify you. Continued use after a change means you accept the updated terms.
      </p>

      <LegalH2>Contact</LegalH2>
      <p><strong>support@pathfinder.app</strong> (replace with your real contact before launch).</p>
    </LegalPage>
  );
}

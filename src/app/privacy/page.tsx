import type { Metadata } from "next";
import { LegalPage, LegalH2 } from "@/components/pf/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy · PathFinder",
  description: "How PathFinder collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="2 Oct 2026">
      <p>
        PathFinder helps university students navigate internship applications. This policy explains what
        we collect, why, and the rights you have over your data. It is written to be readable; where a term
        has a specific legal meaning under UK GDPR / the EU GDPR, that meaning applies.
      </p>
      <p style={{ marginTop: 12, fontSize: 13.5, fontStyle: "italic" }}>
        This is a starting-point policy for an early-access product and should be reviewed by legal counsel
        before a public launch.
      </p>

      <LegalH2>What we collect</LegalH2>
      <ul>
        <li><strong>Account data</strong>: your email address and a securely hashed password.</li>
        <li><strong>Career data you enter</strong>: CV text, target roles, applications, networking contacts, interview notes, and progress. Your CV may contain personal data; you choose what to paste or upload.</li>
        <li><strong>Usage data</strong>: basic technical information (e.g. approximate request timing) needed to operate and secure the service.</li>
      </ul>

      <LegalH2>How we use it</LegalH2>
      <ul>
        <li>To provide the product: analysing your CV, matching opportunities, generating outreach and interview prep.</li>
        <li>To personalise recommendations across the six phases (your profile improves as you use it).</li>
        <li>To secure the service (authentication, rate limiting, abuse prevention).</li>
      </ul>

      <LegalH2>Legal basis</LegalH2>
      <p>
        We process account and career data to <strong>perform the service you request</strong> (contract),
        and process minimal security data on the basis of our <strong>legitimate interest</strong> in keeping
        the platform safe. You can withdraw and delete your data at any time.
      </p>

      <LegalH2>AI processing</LegalH2>
      <p>
        Some features send the text you provide (e.g. CV or job-description content) to a third-party AI
        provider (OpenAI) to generate analysis. We do not send your email or password. AI output is a draft
        for you to review. It is not advice, and you are responsible for what you submit to employers.
      </p>

      <LegalH2>People you add</LegalH2>
      <p>
        The contacts board lets you keep notes on people you are networking with. That is someone else&apos;s
        personal data, so we keep it small and on your side.
      </p>
      <ul>
        <li><strong>What is stored</strong>: a name, company, optional role, how you met, an optional web link (http or https only), your own notes, an optional follow-up date, a stage, and when it was added and last changed. Please do not add personal phone numbers or home addresses; the board has no fields for them and your notes are not the place for them.</li>
        <li><strong>Where it lives</strong>: in your browser&apos;s local storage. If you are signed in, it is also synced to your account&apos;s data in Supabase so it follows you between devices.</li>
        <li><strong>AI</strong>: a contact is never sent to the AI provider unless you act on that specific contact (for example by asking for research, outreach or coffee-chat prep). Then only what that action needs is sent.</li>
        <li><strong>Export and delete</strong>: contacts are included in your data export and are deleted with your account. You can also use &ldquo;Delete all contacts&rdquo; at any time.</li>
        <li><strong>LinkedIn import</strong>: if you import your LinkedIn <code>Connections.csv</code>, the file is read in your browser only and is never uploaded. Only the name, company and position of the rows you tick are kept.</li>
        <li><strong>Keeping it tidy</strong>: the board will ask &ldquo;still relevant?&rdquo; about contacts you have not touched for 12 months and offer a one-click delete. It does not delete anything on its own.</li>
      </ul>
      <p style={{ marginTop: 12 }}>
        Our basis for holding this data is the legitimate interest you have in managing your own professional
        network for a job search. If you are someone a student has added and you want your details removed, ask
        the student, or contact us at the address below.
      </p>

      <LegalH2>Third parties we rely on</LegalH2>
      <ul>
        <li><strong>Supabase</strong>: database and storage hosting.</li>
        <li><strong>OpenAI</strong>: AI text generation for the features above.</li>
        <li><strong>Job data providers</strong>: when you search for live opportunities, PathFinder queries
          <strong> Adzuna</strong> (a job-search API) and pulls from open, community-maintained internship lists
          published on <strong>GitHub</strong> (e.g. the Summer-internship repos). We only send your search terms
          (role, location) to these sources; every listing links out to the original posting, and we do not
          re-host or claim ownership of it.</li>
      </ul>

      <LegalH2>Retention</LegalH2>
      <p>
        We keep your data while your account is active. When you delete your account, your user record and all
        associated data are permanently removed. Backups are rotated on a rolling basis.
      </p>

      <LegalH2>Your rights</LegalH2>
      <p>
        You can <strong>access and export</strong> all your data, and <strong>permanently delete</strong> your
        account and data, from <a href="/settings" style={{ color: "var(--accentText)", fontWeight: 600 }}>Settings → Data &amp; privacy</a>.
        You also have the right to rectification and to object to processing. To exercise any right you cannot
        action in-app, contact us.
      </p>

      <LegalH2>Security</LegalH2>
      <p>
        Passwords are hashed (PBKDF2). Sessions use signed, http-only cookies. Traffic is served over HTTPS
        with a strict content-security policy, and API requests are rate limited.
      </p>

      <LegalH2>Contact</LegalH2>
      <p>
        Questions or requests: <strong>privacy@pathfinder.app</strong> (replace with your real contact before
        launch).
      </p>
    </LegalPage>
  );
}

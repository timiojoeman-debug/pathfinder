"use client";

/**
 * Cold outreach to a small company, where there is no recruiter to go through.
 *
 * The route refuses to generate without a specific detail about the company —
 * under 20 characters and it throws a 400 rather than writing something
 * generic. That rule is enforced here too rather than only server-side, because
 * a student should learn *why* the field is required at the moment they are
 * filling it in, not after spending a generation to be told no.
 */

import { useState } from "react";
import { usePfStore, useProfile } from "@/lib/pf/store";
import { networkingProfileLine } from "@/lib/pf/ai-context";
import { useAiTask, type AiEnvelope } from "@/lib/pf/use-ai";
import { Panel } from "@/components/pf/ui";
import { AiCaveat, AiError, AiSection, GenerateButton } from "@/components/pf/ai-panel";
import { NaturalnessNote, type Naturalness } from "@/components/pf/networking/naturalness-note";

/** Mirrors the route's own floor in `buildStartupOutreachPrompt`. */
const MIN_DETAIL = 20;

interface StartupData {
  message?: string;
  targetRole?: string;
  companySpecificDetail?: string;
  callToAction?: string;
  editReminder?: string;
}

type StartupEnvelope = AiEnvelope<StartupData> & { naturalness?: Naturalness };

export function StartupPanel() {
  const emit = usePfStore((s) => s.emit);
  const profile = useProfile();

  const [company, setCompany] = useState("");
  const [detail, setDetail] = useState("");

  const { data, loading, error, needsAuth, run } = useAiTask<StartupEnvelope>("/api/network/startup-outreach");
  const out = data?.data;

  const companyName = company.trim();
  const companyDetail = detail.trim();
  const detailShort = companyDetail.length > 0 && companyDetail.length < MIN_DETAIL;
  const ready = companyName.length > 0 && companyDetail.length >= MIN_DETAIL;

  const generate = async () => {
    if (!ready) return;
    const result = await run({
      studentProfile: networkingProfileLine(profile),
      companyName,
      companyDetail,
    });
    if (result?.data?.message) emit("AiConsulted", "networking", `Drafted startup outreach to ${companyName}`, { kind: "startup-outreach" });
  };

  return (
    <Panel style={{ padding: "22px 24px", marginBottom: 18 }}>
      <h2 className="pf-display-sm" style={{ fontSize: 21, margin: "0 0 3px" }}>Startup outreach</h2>
      <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, display: "block", maxWidth: "58ch" }}>
        Small companies have no recruiter to route around: you email someone who can actually decide.
        That only works if you have read something they made.
      </span>

      <input
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        placeholder="Company name"
        className="pf-input"
        style={{ height: 44, padding: "0 15px", width: "100%", marginTop: 15 }}
      />

      <textarea
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        placeholder="One specific thing about them: a blog post, a repo, a product decision you have an opinion on…"
        style={{
          width: "100%", minHeight: 90, marginTop: 10, padding: 13, borderRadius: 13,
          border: `1px dashed ${detailShort ? "var(--warn)" : "var(--lineStrong)"}`,
          background: "var(--panelSolid)", color: "var(--fg)",
          fontSize: 13, lineHeight: 1.6, fontFamily: "'Manrope',sans-serif", outline: "none", resize: "vertical",
        }}
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <GenerateButton onClick={generate} loading={loading} disabled={!ready} loadingLabel="Writing…">
          {out ? "Rewrite outreach" : "Write the email"}
        </GenerateButton>
        {!ready && (
          <span style={{ fontSize: 11.5, color: detailShort ? "var(--warn)" : "var(--faint)", maxWidth: "44ch", lineHeight: 1.5 }}>
            {companyName
              ? "The specific detail is not optional: a generic email to fifty startups gets zero replies. Ten minutes on their site is the whole trick."
              : "Company name first."}
          </span>
        )}
      </div>

      <AiError message={error} needsAuth={needsAuth} />

      {out?.message && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              border: "1px dashed var(--lineStrong)", background: "var(--panel2)", borderRadius: 12,
              padding: "14px 16px", fontSize: 13, lineHeight: 1.7, color: "var(--fg)", whiteSpace: "pre-wrap",
            }}
          >
            {out.message}
          </div>

          <NaturalnessNote result={data?.naturalness} />

          {out.callToAction && (
            <AiSection title="The ask">
              <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{out.callToAction}</p>
            </AiSection>
          )}

          <AiCaveat>
            {out.editReminder ||
              "Edit this before sending. The detail you supplied is the only part that makes it yours. The rest is scaffolding."}
          </AiCaveat>
        </div>
      )}
    </Panel>
  );
}

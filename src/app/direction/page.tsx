"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { setDirection } from "@/lib/store";
import { TARGET_ROLES, TECH_STACK_OPTIONS, INDUSTRIES, COUNTRIES, CITIES_BY_COUNTRY } from "@/lib/constants";
import { MagBtn } from "@/components/ui/mag-btn";
import { Tag } from "@/components/ui/typography";

type DirectionResult = {
  statement: string;
  specificity: string;
  suggestions: string[];
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[var(--foreground)]">{label}</label>
      {children}
    </div>
  );
}

export default function DirectionPage() {
  const [step, setStep] = useState(1);
  const [directionForm, setDirectionForm] = useState({
    roleType: "",
    techStack: [] as string[],
    industry: "",
    country: "",
    city: "",
    companySize: "",
    workMode: "",
  });
  const [directionResult, setDirectionResult] = useState<DirectionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const progressPct = step === 1 ? 33 : step === 2 ? 66 : 100;

  function toggleTechStack(tech: string) {
    setDirectionForm((f) => ({
      ...f,
      techStack: f.techStack.includes(tech)
        ? f.techStack.filter((t) => t !== tech)
        : [...f.techStack, tech],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const techStackStr = directionForm.techStack.join(", ");
      const res = await fetch("/api/direction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: directionForm.industry,
          roleType: directionForm.roleType,
          techStack: techStackStr,
          location: directionForm.city && directionForm.country
            ? `${directionForm.city}, ${directionForm.country}`
            : directionForm.country || directionForm.city,
          companySize: directionForm.companySize,
          workMode: directionForm.workMode,
        }),
      });
      const data = (await res.json()) as DirectionResult;
      setDirectionResult(data);
      setDirection({
        ...directionForm,
        techStack: techStackStr,
        location: directionForm.city && directionForm.country
          ? `${directionForm.city}, ${directionForm.country}`
          : directionForm.country || directionForm.city,
      });
      setStep(3);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="section-label">Phase 1</p>
        <h1 className="section-title">Career Direction Wizard</h1>
        <p className="section-subtitle">
          Define what you&apos;re targeting so PathFinder can prioritise internships and projects
          that fit your actual goals.
        </p>
      </section>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="card flex-1 p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Profile parameters</p>
              <p className="mt-0.5 text-sm text-[var(--muted)]">
                Fill in your preferences to generate a targeted statement.
              </p>
            </div>
            <span className="hidden text-sm text-[var(--muted)] sm:inline">
              Step {step} of 3 · {progressPct}%
            </span>
          </div>
          <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {step === 1 && (
              <div className="space-y-5">
                <Field label="Target role (choose one)">
                  <select
                    className="input"
                    value={directionForm.roleType}
                    onChange={(e) =>
                      setDirectionForm((f) => ({ ...f, roleType: e.target.value }))
                    }
                    required
                  >
                    <option value="">Select a role...</option>
                    {TARGET_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Select your preferred tech stack (choose multiple)">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {TECH_STACK_OPTIONS.map((tech) => (
                      <button
                        key={tech}
                        type="button"
                        onClick={() => toggleTechStack(tech)}
                        className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${
                          directionForm.techStack.includes(tech)
                            ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                            : "border-[var(--border)] text-[var(--foreground)] hover:border-[var(--accent-muted)]"
                        }`}
                      >
                        {tech}
                      </button>
                    ))}
                  </div>
                  {directionForm.techStack.length > 0 && (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Selected: {directionForm.techStack.join(", ")}
                    </p>
                  )}
                </Field>
                <div className="flex justify-end pt-1">
                  <MagBtn variant="primary" size="md" onClick={() => setStep(2)}>
                    Next: Preferences →
                  </MagBtn>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Industry">
                    <select
                      className="input"
                      value={directionForm.industry}
                      onChange={(e) =>
                        setDirectionForm((f) => ({ ...f, industry: e.target.value }))
                      }
                    >
                      <option value="">Select industry...</option>
                      {INDUSTRIES.map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Company size">
                    <select
                      className="input"
                      value={directionForm.companySize}
                      onChange={(e) =>
                        setDirectionForm((f) => ({ ...f, companySize: e.target.value }))
                      }
                    >
                      <option value="">Choose...</option>
                      <option value="early‑stage startups">Startup (0–50)</option>
                      <option value="scaleups">Scaleup (50–500)</option>
                      <option value="large tech companies">Big Tech / Enterprise</option>
                    </select>
                  </Field>
                  <Field label="Country">
                    <select
                      className="input"
                      value={directionForm.country}
                      onChange={(e) =>
                        setDirectionForm((f) => ({
                          ...f,
                          country: e.target.value,
                          city: "",
                        }))
                      }
                    >
                      <option value="">Select country...</option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="City">
                    <select
                      className="input"
                      value={directionForm.city}
                      onChange={(e) =>
                        setDirectionForm((f) => ({ ...f, city: e.target.value }))
                      }
                      disabled={!directionForm.country}
                    >
                      <option value="">
                        {directionForm.country ? "Select city..." : "Select country first"}
                      </option>
                      {(CITIES_BY_COUNTRY[directionForm.country] ?? []).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Work setting">
                    <select
                      className="input"
                      value={directionForm.workMode}
                      onChange={(e) =>
                        setDirectionForm((f) => ({ ...f, workMode: e.target.value }))
                      }
                    >
                      <option value="">Choose...</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">Onsite</option>
                    </select>
                  </Field>
                </div>
                <div className="flex justify-between gap-2 pt-1">
                  <MagBtn variant="secondary" size="md" onClick={() => setStep(1)}>
                    ← Back
                  </MagBtn>
                  <button type="submit" disabled={loading} className="bg-transparent border-0 p-0">
                    <MagBtn variant="primary" size="md" style={loading ? { opacity: 0.5, pointerEvents: 'none'} : {}}>
                      {loading ? "Generating..." : "Generate statement"}
                    </MagBtn>
                  </button>
                </div>
              </div>
            )}

            {step === 3 && directionResult && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-[var(--foreground)]">Your AI‑generated direction</p>
                <div className="card border-[var(--accent)] bg-[var(--accent)]/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Career focus statement
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]">{directionResult.statement}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-sm text-[var(--muted)]">Specificity</span>
                    <Tag>
                      {directionResult.specificity}
                    </Tag>
                  </div>
                </div>
                {directionResult.suggestions?.length ? (
                  <div className="card p-4">
                    <p className="text-sm font-semibold text-[var(--foreground)]">How to sharpen it further</p>
                    <ul className="mt-2 space-y-1.5 list-disc pl-5 text-sm text-[var(--muted)]">
                      {directionResult.suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="flex justify-between pt-1 text-sm text-[var(--muted)]">
                  <button type="button" className="hover:underline" onClick={() => setStep(1)}>
                    Start over
                  </button>
                  <Link href="/cv" className="font-medium text-[var(--foreground)] hover:underline">
                    Next phase: CV Optimizer →
                  </Link>
                </div>
              </div>
            )}
          </form>
        </div>

        <aside className="card w-full border-dashed p-5 lg:w-72">
          <p className="text-sm font-semibold text-[var(--foreground)]">Why direction first?</p>
          <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
            A clear direction lets you judge every role, project and networking message with one
            question: &quot;Does this move me closer to this target?&quot;
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
            <li>• Faster yes/no decisions on internship listings.</li>
            <li>• Stronger, more consistent narrative on your CV.</li>
            <li>• Sharper talking points in coffee chats and interviews.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

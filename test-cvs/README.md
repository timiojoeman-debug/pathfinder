# PathFinder test CVs

Fictional CV fixtures for exercising PathFinder's CV features. **All names,
companies, and details are invented** — no real people or data.

Paste the contents of any file into **Phase 02 · CV Optimisation** (the "Paste
your CV text" box), or upload it. They also feed the Portfolio review, job-match
compatibility, cover-letter generation, and interview-question tabs, so one
pasted CV lets you test most of the app.

The heuristic scorer (`analyzeCvText`) works like this, so these are tuned
against it: `score = 92 − (vague terms × 7) − (missing target keywords × 6)`,
clamped to 25–95. "Missing keywords" is measured against your Direction stack,
or the default **React / TypeScript / Node / SQL** if you haven't set one. The
AI layer (`/api/cv/analyze`) adds a richer read on top when signed in.

| File | Designed to be | What it should trigger |
|---|---|---|
| `01-weak-rough-draft.txt` | A low-effort first draft | Low score (~25) · "Rebuild the top third" · many vague terms flagged · all target keywords missing · the "Aspiring" / no-metrics checks |
| `02-mid-working-draft.txt` | A real but untailored CV | Mid score (~55–70) · "Working — needs tailoring" · a couple of vague terms · partial keyword coverage |
| `03-strong-tailored.txt` | A sharp, tailored CV | High score (~85–95) · "Strong — tailor per role" · no vague terms · all keywords present · deployed projects for the Portfolio panel |
| `04-strong-wrong-direction.txt` | Strong, but Data/ML-focused | High *quality* but big **missing-keyword** gap if your Direction is full-stack — tests CV-vs-direction alignment and job-match mismatch |

Suggested runs:
- **Weak vs strong:** paste `01`, analyse, note the score/verdict, then paste
  `03` and compare — the vague-terms and missing-keywords panels should flip.
- **Direction mismatch:** set your Direction to Full-Stack SWE, then paste `04`
  — a strong CV that still shows missing full-stack keywords.
- **Portfolio:** copy the PROJECTS block from `03` into the Portfolio review.
- **Job match:** paste any CV, then in Phase 03 paste a job description and
  compare the compatibility score against the CV's keyword coverage.

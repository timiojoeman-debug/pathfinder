# Legitimate interests assessment: the contacts board

**Status: DRAFT for the operator to review. This is not legal advice.** Have it checked by someone qualified before relying on it, and record the decision and date once reviewed.

**Processing covered**: students store details of third parties (people they network with) in the PathFinder contacts board, and PathFinder keeps a synced copy for signed-in users.

**What is stored per contact**: name, company, optional role, how the student met them, an optional http(s) link, free-text notes, an optional follow-up date, a stage, and created/updated timestamps. Held in the browser's localStorage; for signed-in users also synced to `profiles.client_state` in Supabase. Included in `/api/account/export`, deleted with the account, and removable via "Delete all contacts". Not sent to the AI unless the student acts on that specific contact. A planned LinkedIn `Connections.csv` import is parsed in the browser only, keeps name, company and position for ticked rows only, and never uploads the file. A planned prompt offers one-click deletion of contacts untouched for 12 months.

## 1. Purpose test

- **Interest**: the student's interest in managing their own professional network (who they have contacted, when to follow up) as part of a job search. PathFinder's own interest is in providing the feature the student asked for.
- **Is it legitimate?** Networking for employment is an ordinary, lawful activity and is the stated purpose of the product.
- **Benefit**: real for the student (organised follow-ups, referrals). Modest and indirect for contacts, who are better served by a student who follows up properly.

## 2. Necessity test

- **Could it be done another way?** Partly: a student could use a private spreadsheet. The board does the same job inside the tool they already use, with fewer copies.
- **Minimisation**: fields are limited to what a follow-up needs. There are no phone number, email or address fields, and the privacy page asks students not to put them in notes. Free-text notes are the weak point: they are the student's own words and the board cannot police them. Notes are capped at 4,000 characters.
- **No scraping**: PathFinder does not look people up, scrape profiles or enrich contacts. Data enters only by the student typing it or importing their own LinkedIn export.
- **No data brokers**: no purchased or third-party contact data is used.
- **Import** (planned): browser-only parsing, ticked rows only, three fields kept.
- **AI**: contact data goes to the AI provider only on a deliberate action on that contact.

## 3. Balancing test

**Nature of the data**: ordinary professional details plus the student's notes. No special category data is requested. Notes could contain anything the student chooses to write, which is a residual risk (see safeguards).

**Reasonable expectations**: someone connected to, introduced to, or messaged by a student in a professional setting would expect the student to keep a note of the contact and follow up. They are less likely to expect the details to be held by a third-party service, which is why the privacy page says so plainly. Cold-outreach recipients have the weakest expectation, so the notes and the AI step matter most there.

**Impact on the individual**: low. Data is not published, shared with other students, used for marketing, or sold, and does not feed any score about the contact.

**Safeguards in place**
- Data minimisation; no phone or address fields.
- Scoped to the student's account (RLS plus application-layer `user_id` scoping).
- No AI use without a specific action by the student.
- Export, "Delete all contacts", and deletion with the account.
- A 12-month "still relevant?" prompt (planned) to limit retention. It prompts; it does not delete automatically.
- Link field accepts http(s) only.

**Rights of the people in the contacts**
- Access, rectification, erasure and objection apply. A third party can ask the student directly (the student can edit or delete the entry at once), or contact the operator at the address on the privacy page.
- **Gap to resolve**: the operator cannot easily tell which account holds a given person (contacts sit inside `client_state`), and cannot say which student added them without disclosing that student's data. Decide a procedure (for example, search by name and delete on a verified request) and write it down. None of this is built.
- The operator should not promise more than it can do.

**Outcome (draft)**: on the information above, legitimate interests looks reasonable for the student's use, provided the safeguards stay as described and the privacy page stays accurate. The operator should confirm.

## Household exemption

The UK GDPR does not apply to processing by an individual in the course of a purely personal or household activity. A student keeping their own contact list for a job search might fall within that, but it is arguable: the purpose is professional rather than personal, and the point is not settled. Even if the student is exempt, **PathFinder is not**. It stores a synced copy on its servers and operates the service, so the operator should treat itself as a controller for that copy (or at minimum a processor for the student) and meet the usual duties: a lawful basis, transparency, security, rights handling and retention. This assessment assumes the operator is a controller for the synced copy. Confirm that.

## Open items for the operator

- Confirm controller or processor status for the synced copy.
- Decide and document the third-party erasure procedure.
- Replace the placeholder contact address on the privacy page with a real, monitored one.
- Check the OpenAI terms and international-transfer position for the "act on a contact" flows.
- Decide whether a DPIA is needed. None has been done here.
- Re-review when the import and retention prompt ship, and whenever the contact fields change.

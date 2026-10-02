import { describe, it, expect, beforeEach } from "vitest";
import { getProfile, getProgress, usePfStore } from "../store";
import { applicationsAtCompany, contactsAtCompany, sanitizeContacts } from "../contacts";

/**
 * The contacts board holds other people's data and must not become a way to
 * self-report progress. These pin the actions, the migration from the single
 * working contact, and the evidence rules: a manual move to Messaged changes no
 * count, Chatted goes through the 24-hour guard, and Referred is logged but feeds
 * no progress number.
 */

const PRISTINE = usePfStore.getState();
const s = () => usePfStore.getState();
const reset = () => {
  usePfStore.setState(PRISTINE, true);
  localStorage.clear();
};
const sam = { name: "Sam Lee", company: "Monzo", howWeMet: "alumni" as const };
function addSam() {
  expect(s().addContact(sam)).toBe("added");
  return s().contacts[0];
}

describe("contacts — add, edit, remove", () => {
  beforeEach(reset);

  it("adds a Researched contact and dedupes on name + company, ignoring case", () => {
    const c = addSam();
    expect(c.stage).toBe("researched");
    expect(s().addContact({ ...sam, name: "  sam lee ", company: "MONZO" })).toBe("duplicate");
    expect(s().addContact({ ...sam, company: "Wise" })).toBe("added");
    expect(s().contacts).toHaveLength(2);
  });

  it("needs a name, and keeps only http(s) links", () => {
    expect(s().addContact({ ...sam, name: "  " })).toBe("no-name");
    expect(s().addContact({ ...sam, link: "javascript:alert(1)" })).toBe("bad-link");
    expect(s().contacts).toHaveLength(0);
    expect(s().addContact({ ...sam, link: "https://www.linkedin.com/in/sam" })).toBe("added");
    expect(s().contacts[0].link).toBe("https://www.linkedin.com/in/sam");
  });

  it("edits details, but refuses a blank name, a clashing identity and a bad link", () => {
    const c = addSam();
    s().addContact({ name: "Ana", company: "Wise", howWeMet: "event" });
    s().updateContact(c.id, { role: "SWE", notes: "Met at the careers fair.", howWeMet: "event", link: "https://example.org/sam" });
    expect(s().contacts.find((x) => x.id === c.id)).toMatchObject({ role: "SWE", notes: "Met at the careers fair.", howWeMet: "event", link: "https://example.org/sam" });
    s().updateContact(c.id, { name: "   " });
    s().updateContact(c.id, { name: "ana", company: "WISE" });
    s().updateContact(c.id, { link: "ftp://nope" });
    expect(s().contacts.find((x) => x.id === c.id)).toMatchObject({ name: "Sam Lee", company: "Monzo", link: "https://example.org/sam" });
    s().updateContact(c.id, { link: "" });
    expect(s().contacts.find((x) => x.id === c.id)?.link).toBeUndefined();
  });

  it("sets and clears a follow-up date, rejecting a malformed one", () => {
    const c = addSam();
    s().setContactFollowUp(c.id, "2026-10-09");
    expect(s().contacts[0].followUpOn).toBe("2026-10-09");
    s().setContactFollowUp(c.id, "next week");
    expect(s().contacts[0].followUpOn).toBeUndefined();
  });

  it("removes one contact and clears all, dropping their bookkeeping events but not evidence", () => {
    const c = addSam();
    s().addContact({ name: "Ana", company: "Wise", howWeMet: "event" });
    s().moveContact(c.id, "replied");
    s().generateOutreach({ name: "Sam Lee", company: "Monzo", message: "Hello Sam" });
    expect(s().events.some((e) => e.type === "ContactStageChanged")).toBe(true);
    s().removeContact(c.id);
    expect(s().contacts.map((x) => x.name)).toEqual(["Ana"]);
    expect(s().events.some((e) => e.type === "ContactStageChanged")).toBe(false);
    expect(s().events.some((e) => e.type === "RecruiterContacted")).toBe(true);
    s().clearContacts();
    expect(s().contacts).toEqual([]);
  });

  it("selectContact makes them the working contact and drops another person's pasted profile", () => {
    const c = addSam();
    s().set({ netContact: { name: "Ana", company: "Wise", about: "Ana's About", experience: "x" } });
    s().selectContact(c.id);
    expect(s().netContact).toEqual({ name: "Sam Lee", company: "Monzo", about: "", experience: "" });
    s().set({ netContact: { ...s().netContact, about: "Sam's About" } });
    s().selectContact(c.id);
    expect(s().netContact.about).toBe("Sam's About");
  });
});

describe("contacts — evidence rules", () => {
  beforeEach(reset);

  it("a manual move to Messaged changes no count and logs no outreach", () => {
    const c = addSam();
    const before = getProgress();
    s().moveContact(c.id, "messaged");
    expect(s().contacts[0].stage).toBe("messaged");
    expect(s().netSent).toBe(0);
    expect(s().events.some((e) => e.type === "RecruiterContacted")).toBe(false);
    expect(getProfile().outreachSent).toBe(0);
    expect(getProfile().contactedCompanies).toEqual([]);
    expect(getProgress()).toEqual(before);
    const ev = s().events[s().events.length - 1];
    expect(ev.type).toBe("ContactStageChanged");
    expect(ev.meta).toEqual({ contact: "Sam Lee", company: "Monzo", stage: "messaged" });
    // The label travels to the mentor as recent activity, so it carries no name.
    expect(ev.label).not.toMatch(/Sam/);
  });

  it("Mark as sent on a real message logs the outreach and moves the matching contact to Messaged", () => {
    addSam();
    expect(s().generateOutreach({ name: "sam lee", company: "monzo", message: "" })).toBe(false);
    expect(s().contacts[0].stage).toBe("researched");
    expect(s().generateOutreach({ name: "sam lee", company: "monzo", message: "Hi Sam, ..." })).toBe(true);
    expect(s().contacts[0].stage).toBe("messaged");
    expect(s().netSent).toBe(1);
    expect(getProfile().contactedCompanies).toEqual(["monzo"]);
  });

  it("Mark as sent does not pull a contact backwards from a later stage", () => {
    const c = addSam();
    s().moveContact(c.id, "replied");
    s().generateOutreach({ name: "Sam Lee", company: "Monzo", message: "Following up" });
    expect(s().contacts[0].stage).toBe("replied");
  });

  it("Chatted logs one coffee chat through the 24-hour guard", () => {
    const c = addSam();
    s().moveContact(c.id, "chatted");
    expect(getProfile().coffeeChatsDone).toBe(1);
    expect(s().events[s().events.length - 1]).toMatchObject({ type: "CoffeeChatCompleted", meta: { contact: "Sam Lee", company: "Monzo", stage: "chatted" } });
    s().moveContact(c.id, "replied");
    s().moveContact(c.id, "chatted");
    expect(getProfile().coffeeChatsDone).toBe(1);
    // The move is still recorded, as bookkeeping.
    expect(s().events[s().events.length - 1]).toMatchObject({ type: "ContactStageChanged", meta: { stage: "chatted" } });
  });

  it("Referred emits ReferralReceived but moves no progress number", () => {
    const c = addSam();
    const before = getProgress();
    s().moveContact(c.id, "referred");
    expect(s().events[s().events.length - 1]).toMatchObject({ type: "ReferralReceived", meta: { contact: "Sam Lee", company: "Monzo", stage: "referred" } });
    expect(getProfile().referralsReceived).toBe(1);
    expect(getProgress()).toEqual(before);
    // Leaving and re-entering Referred does not count the same person twice.
    s().moveContact(c.id, "replied");
    s().moveContact(c.id, "referred");
    expect(getProfile().referralsReceived).toBe(1);
  });

  it("moving to the stage a contact is already in does nothing", () => {
    const c = addSam();
    const n = s().events.length;
    s().moveContact(c.id, "researched");
    expect(s().events).toHaveLength(n);
  });
});

describe("contacts — persistence and migration", () => {
  const merge = (persisted: unknown) => usePfStore.persist.getOptions().merge!(persisted, PRISTINE) as ReturnType<typeof usePfStore.getState>;

  it("seeds one Researched contact from a persisted working contact that is not on the board", () => {
    const m = merge({ netContact: { name: "Priya", company: "Stripe", about: "", experience: "" } });
    expect(m.contacts).toHaveLength(1);
    expect(m.contacts[0]).toMatchObject({ name: "Priya", company: "Stripe", stage: "researched", howWeMet: "other" });
  });

  it("does not duplicate the working contact when the board already has them", () => {
    const board = sanitizeContacts([{ id: "a", name: "Priya", company: "stripe", stage: "chatted", howWeMet: "event" }]);
    const m = merge({ netContact: { name: "priya", company: "Stripe", about: "", experience: "" }, contacts: board });
    expect(m.contacts).toHaveLength(1);
    expect(m.contacts[0].stage).toBe("chatted");
  });

  it("seeds nothing for a blank working contact, and tolerates a store from before the board", () => {
    expect(merge({ netContact: { name: " ", company: "", about: "", experience: "" } }).contacts).toEqual([]);
    expect(merge({}).contacts).toEqual([]);
  });

  it("sanitises persisted contacts: junk dropped, unknown values defaulted, unsafe links removed", () => {
    const out = sanitizeContacts([
      null, { id: "", name: "x" }, { id: "n", name: " " },
      { id: "ok", name: "Sam", company: "Monzo", stage: "bogus", howWeMet: "bogus", link: "javascript:alert(1)", followUpOn: "tomorrow", notes: 5 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "ok", stage: "researched", howWeMet: "other", notes: "" });
    expect(out[0].link).toBeUndefined();
    expect(out[0].followUpOn).toBeUndefined();
  });

  it("is part of the persisted slice, so it syncs with the account's client_state", () => {
    reset();
    addSam();
    const slice = usePfStore.persist.getOptions().partialize!(s()) as { contacts: unknown[] };
    expect(slice.contacts).toHaveLength(1);
    expect(Object.keys(slice)).not.toContain("contactDetail");
  });
});

describe("company linkage", () => {
  const contacts = sanitizeContacts([
    { id: "1", name: "Sam", company: "Monzo" },
    { id: "2", name: "Ana", company: " monzo " },
    { id: "3", name: "Raj", company: "Wise" },
    { id: "4", name: "Kim", company: "" },
  ]);

  it("finds people at a company ignoring case and spaces, and nobody for a blank company", () => {
    expect(contactsAtCompany(contacts, "MONZO").map((c) => c.id)).toEqual(["1", "2"]);
    expect(contactsAtCompany(contacts, "  ")).toEqual([]);
  });

  it("finds tracker cards at a company with their column", () => {
    reset();
    s().addCard({ company: "Monzo", role: "Backend Intern", column: "applied" });
    s().addCard({ company: "Wise", role: "Data Intern", column: "saved" });
    expect(applicationsAtCompany(s().board, "monzo")).toEqual([{ key: "monzo::backend intern", role: "Backend Intern", column: expect.any(String) }]);
    expect(applicationsAtCompany(s().board, "")).toEqual([]);
  });
});

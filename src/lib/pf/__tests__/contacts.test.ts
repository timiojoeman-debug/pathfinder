import { describe, it, expect, beforeEach } from "vitest";
import { getProfile, getProgress, usePfStore } from "../store";
import { makeEvent } from "../events";
import { alumniSearchUrl, normCompany, applicationsAtCompany, contactsAtCompany, sanitizeContacts } from "../contacts";

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

  it("a rename follows through to the working contact, so marking outreach sent still moves the card", () => {
    const c = addSam();
    s().selectContact(c.id);
    s().updateContact(c.id, { name: "Samuel Lee" });
    expect(s().netContact.name).toBe("Samuel Lee");
    s().generateOutreach({ name: s().netContact.name, company: "Monzo", message: "Hello Samuel" });
    expect(s().contacts[0].stage).toBe("messaged");
  });

  it("deleting the working contact forgets them, and a reload does not bring them back", () => {
    const c = addSam();
    s().selectContact(c.id);
    s().set({ netContact: { ...s().netContact, about: "Sam's About" } });
    s().removeContact(c.id);
    expect(s().netContact.name).toBe("");
    const slice = usePfStore.persist.getOptions().partialize!(s());
    const m = usePfStore.persist.getOptions().merge!(slice, PRISTINE) as ReturnType<typeof usePfStore.getState>;
    expect(m.contacts).toEqual([]);
    addSam();
    s().selectContact(s().contacts[0].id);
    s().clearContacts();
    expect(s().netContact.name).toBe("");
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
    expect(ev.meta).toEqual({ contact: "Sam Lee", company: "Monzo", stage: "messaged", contactId: c.id });
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

describe("contacts — erasure and re-seeding", () => {
  const merge = (persisted: unknown) => usePfStore.persist.getOptions().merge!(persisted, PRISTINE) as ReturnType<typeof usePfStore.getState>;
  const reload = () => merge(usePfStore.persist.getOptions().partialize!(s()));
  beforeEach(reset);

  it("a removed contact, and everyone after Delete all, stay gone on reload", () => {
    const c = addSam();
    s().selectContact(c.id);
    s().removeContact(c.id);
    expect(reload().contacts).toEqual([]);
    addSam();
    s().addContact({ name: "Ana", company: "Wise", howWeMet: "event" });
    s().selectContact(s().contacts[0].id);
    s().clearContacts();
    expect(reload().contacts).toEqual([]);
    expect(reload().netContact.name).toBe("");
  });

  it("a rename does not come back as a duplicate after a reload", () => {
    const c = addSam();
    s().selectContact(c.id);
    s().updateContact(c.id, { name: "Samuel Lee" });
    expect(reload().contacts.map((x) => x.name)).toEqual(["Samuel Lee"]);
  });

  it("seeds a pre-board working contact once, then records that it has", () => {
    const m = merge({ netContact: { name: "Priya", company: "Stripe", about: "", experience: "" } });
    expect(m.contacts).toHaveLength(1);
    expect(m.contactsSeeded).toBe(true);
    const gone = merge({ netContact: { name: "Priya", company: "Stripe", about: "", experience: "" }, contacts: [], contactsSeeded: true });
    expect(gone.contacts).toEqual([]);
  });

  it("Delete all keeps the working contact when they are not on the board", () => {
    addSam();
    s().set({ netContact: { name: "Ana", company: "Wise", about: "Ana's About", experience: "" } });
    s().clearContacts();
    expect(s().netContact.name).toBe("Ana");
  });

  it("removing the working contact also clears research and the draft about them", () => {
    const c = addSam();
    s().selectContact(c.id);
    s().set({
      netContact: { ...s().netContact, about: "Sam's About" },
      netResearch: { key: "sam lee|monzo", name: "Sam Lee", data: { summary: "x" } },
      netDraft: { key: "k", paras: ["Hi Sam"], followUp: null, naturalness: null, questions: [], topics: [] },
    });
    s().removeContact(c.id);
    expect(s().netContact).toEqual({ name: "", company: "", about: "", experience: "" });
    expect(s().netResearch).toBeNull();
    expect(s().netDraft).toBeNull();
  });

  it("scrubs the name from kept evidence events, keeps the counts, and rewrites labels that carried it", () => {
    const c = addSam();
    s().generateOutreach({ name: "Sam Lee", company: "Monzo", message: "Hi Sam" });
    s().moveContact(c.id, "chatted");
    s().moveContact(c.id, "referred");
    s().pushEvent(makeEvent("CoffeeChatCompleted", "networking", "Coffee chat with Sam Lee at Monzo", { contact: "Sam Lee", company: "Monzo" }));
    s().pushEvent(makeEvent("AiConsulted", "networking", "Drafted outreach to sam lee", { kind: "outreach" }));
    const before = { chats: getProfile().coffeeChatsDone, companies: getProfile().contactedCompanies, refs: getProfile().referralsReceived };
    s().removeContact(c.id);
    const after = getProfile();
    expect({ chats: after.coffeeChatsDone, companies: after.contactedCompanies, refs: after.referralsReceived }).toEqual(before);
    expect(JSON.stringify(s().events)).not.toMatch(/Sam/i);
    expect(s().events.filter((e) => e.type === "RecruiterContacted")[0].meta).toMatchObject({ company: "Monzo", contact: "" });
  });

  it("two referrals at one company still count as two after Delete all blanks both names", () => {
    const a = addSam();
    s().addContact({ name: "Ana Diaz", company: "Monzo", howWeMet: "event" });
    const b = s().contacts.find((c) => c.name === "Ana Diaz")!;
    s().moveContact(a.id, "referred");
    s().moveContact(b.id, "referred");
    expect(getProfile().referralsReceived).toBe(2);
    s().clearContacts();
    expect(getProfile().referralsReceived).toBe(2);
    expect(JSON.stringify(s().events)).not.toMatch(/Sam|Ana/);
  });

  it("new evidence labels carry no name", () => {
    const c = addSam();
    s().generateOutreach({ name: "Sam Lee", company: "Monzo", message: "Hi" });
    s().moveContact(c.id, "chatted");
    s().moveContact(c.id, "referred");
    expect(s().events.map((e) => e.label).join("|")).not.toMatch(/Sam/);
  });
});

describe("contacts — one chat per contact", () => {
  beforeEach(reset);
  const ageEvents = () => s().set({ events: s().events.map((e) => ({ ...e, ts: e.ts - 3 * 864e5 })) });

  it("Chatted, back, then Chatted again after a day does not count a second chat", () => {
    const c = addSam();
    s().moveContact(c.id, "chatted");
    ageEvents();
    s().moveContact(c.id, "researched");
    s().moveContact(c.id, "chatted");
    expect(getProfile().coffeeChatsDone).toBe(1);
  });

  it("a rename does not make the same contact's chat count again", () => {
    const c = addSam();
    s().moveContact(c.id, "chatted");
    ageEvents();
    s().updateContact(c.id, { name: "Samuel Lee" });
    s().moveContact(c.id, "replied");
    s().moveContact(c.id, "chatted");
    expect(getProfile().coffeeChatsDone).toBe(1);
  });

  it("the workspace path keeps its own rule: a later chat a day on still counts", () => {
    s().completeCoffeeChat({ contact: "Ana", company: "Wise" });
    ageEvents();
    expect(s().completeCoffeeChat({ contact: "Ana", company: "Wise" })).toBe(true);
    expect(getProfile().coffeeChatsDone).toBe(2);
  });
});

describe("sanitizeContacts — duplicate ids", () => {
  it("keeps the newest copy of a repeated id", () => {
    const out = sanitizeContacts([
      { id: "a", name: "Old", updatedAt: 1 },
      { id: "a", name: "New", updatedAt: 9 },
      { id: "a", name: "Mid", updatedAt: 5 },
    ]);
    expect(out.map((c) => c.name)).toEqual(["New"]);
  });
});

describe("alumniSearchUrl", () => {
  const base = "https://www.linkedin.com/search/results/people/?keywords=";
  it("encodes the company and the university", () => {
    expect(alumniSearchUrl("Procter & Gamble", "University of Edinburgh")).toBe(`${base}Procter%20%26%20Gamble%20University%20of%20Edinburgh`);
  });
  it("uses the company alone when the university is unset or blank", () => {
    expect(alumniSearchUrl(" Monzo ")).toBe(`${base}Monzo`);
    expect(alumniSearchUrl("Monzo", "  ")).toBe(`${base}Monzo`);
  });
  it("returns null without a company", () => {
    expect(alumniSearchUrl("   ", "Edinburgh")).toBeNull();
  });
});

describe("normCompany", () => {
  it("ignores case, punctuation, spacing, ampersands and diacritics", () => {
    expect(normCompany("Stripe, Inc.")).toBe(normCompany("Stripe"));
    expect(normCompany("  Procter  &  Gamble ")).toBe(normCompany("procter and gamble"));
    expect(normCompany("McDonald’s")).toBe(normCompany("mcdonalds"));
    expect(normCompany("Société Générale")).toBe(normCompany("Societe Generale"));
    expect(normCompany("J.P. Morgan")).toBe(normCompany("j p morgan"));
  });
  it("strips trailing legal suffixes, one or several", () => {
    for (const s of ["Monzo Ltd", "Monzo Limited", "Monzo PLC", "Monzo LLP", "Monzo Inc", "Monzo LLC", "Monzo GmbH", "Monzo UK", "Monzo Group", "Monzo Group UK Ltd"]) {
      expect(normCompany(s)).toBe("monzo");
    }
  });
  it("never empties the name, and does not match on the suffix alone", () => {
    expect(normCompany("UK Ltd")).toBe("uk");
    expect(normCompany("Ltd")).toBe("ltd");
    expect(normCompany("   ")).toBe("");
    expect(normCompany("Barclays Bank PLC")).not.toBe(normCompany("Barclays"));
  });
  it("is what contactsAtCompany matches on", () => {
    const sam = { id: "1", name: "Sam", company: "Stripe, Inc." };
    expect(contactsAtCompany([sam], "stripe")).toEqual([sam]);
  });
});

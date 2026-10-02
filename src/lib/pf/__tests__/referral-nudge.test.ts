import { describe, it, expect, beforeEach } from "vitest";
import { getProfile, getProgress, usePfStore } from "../store";
import { recommend } from "../recommendations";

/**
 * Before applying somewhere, the student is nudged to talk to someone they already
 * know there; with nobody there, to look for alumni. Driven through the real store
 * so the profile derivation and the matching are exercised together.
 */

const PRISTINE = usePfStore.getState();
const s = () => usePfStore.getState();
const recs = () => recommend(getProfile(), getProgress());
const nudge = () => recs().find((r) => r.id.startsWith("referral-nudge-"));
const warm = () => recs().find((r) => r.id.startsWith("warm-path-"));

beforeEach(() => {
  usePfStore.setState(PRISTINE, true);
  localStorage.clear();
  s().addCard({ company: "Monzo", role: "Backend Intern", column: "applied" });
  s().addContact({ name: "Sam Lee", company: " monzo ", howWeMet: "alumni" });
});
const sam = () => s().contacts[0];

describe("referral nudge", () => {
  it("asks for a coffee chat when a contact at the company hasn't been spoken to", () => {
    const n = nudge()!;
    expect(n.title).toContain("Ask Sam Lee for a coffee chat");
    expect(n).toMatchObject({ contactId: sam().id, href: "/networking", phase: "networking" });
    expect(warm()).toBeUndefined();
  });

  it("words the nudge for the card's column: 'before applying' only while Saved", () => {
    s().moveCard("monzo::backend intern", "saved");
    expect(nudge()!.title).toBe("Ask Sam Lee for a coffee chat before applying");
    for (const column of ["applied", "interview"] as const) {
      s().moveCard("monzo::backend intern", column);
      expect(nudge()!.title).toBe("Ask Sam Lee for a coffee chat — a referral can still help at Monzo");
    }
  });

  it("matches the company through punctuation and legal suffixes", () => {
    s().removeContact(sam().id);
    s().addContact({ name: "Ana Roy", company: "MONZO Ltd.", howWeMet: "event" });
    expect(nudge()!.title).toContain("Ana Roy");
  });

  it("fires for researched, messaged and replied, and ignores the Saved/Applied/Interview split", () => {
    for (const stage of ["messaged", "replied"] as const) {
      s().moveContact(sam().id, stage);
      expect(nudge()).toBeDefined();
    }
    for (const column of ["saved", "interview"] as const) {
      s().moveCard("monzo::backend intern", column);
      expect(nudge()).toBeDefined();
    }
  });

  it("goes once the contact has chatted", () => {
    s().moveContact(sam().id, "chatted");
    expect(nudge()).toBeUndefined();
    expect(warm()).toBeUndefined();
  });

  it("goes when the contact is parked as not now", () => {
    s().moveContact(sam().id, "not-now");
    expect(nudge()).toBeUndefined();
    expect(warm()).toBeUndefined();
  });

  it("goes once the application is rejected or has become an offer", () => {
    s().moveCard("monzo::backend intern", "rejected");
    expect(nudge()).toBeUndefined();
    s().moveCard("monzo::backend intern", "offer");
    expect(nudge()).toBeUndefined();
  });

  it("goes once the contact is removed, and the link offer takes its place", () => {
    s().removeContact(sam().id);
    expect(nudge()).toBeUndefined();
    expect(warm()).toBeDefined();
  });
});

describe("warm-path offer", () => {
  it("is offered, low priority, when nobody is known at a tracked company", () => {
    s().removeContact(sam().id);
    const w = warm()!;
    expect(w).toMatchObject({ cardKey: "monzo::backend intern", href: "/tracker" });
    expect(w.title).toBe("Look for alumni at Monzo");
    expect(w.why).toContain("You haven't added anyone at Monzo yet");
    expect(w.why).not.toMatch(/know nobody/);
    expect(w.priority).toBeLessThan(70);
    s().moveCard("monzo::backend intern", "saved");
    expect(warm()!.title).toBe("Look for alumni at Monzo before applying");
  });

  it("is one offer at a time and never for a rejected application", () => {
    s().removeContact(sam().id);
    s().addCard({ company: "Wise", role: "Data Intern", column: "saved" });
    expect(recs().filter((r) => r.id.startsWith("warm-path-"))).toHaveLength(1);
    s().moveCard("monzo::backend intern", "rejected");
    s().moveCard("wise::data intern", "rejected");
    expect(warm()).toBeUndefined();
  });
});

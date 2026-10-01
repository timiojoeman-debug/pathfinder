/**
 * Who a networking contact is, because it changes what you can ask of them.
 * A peer on the team can refer you, so that relationship is trust-driven and the
 * referral ask comes last. A recruiter or hiring manager cannot refer you; there
 * the conversation is fit-driven: the role, your matching proof, one clear ask.
 */
export const CONTACT_TYPES = ["peer", "recruiter", "hiring_manager"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const CONTACT_TYPE_LABEL: Record<ContactType, string> = {
  peer: "Peer",
  recruiter: "Recruiter",
  hiring_manager: "Hiring manager",
};

/** Only someone on the team can refer you. */
export const canReferYou = (t: ContactType) => t === "peer";

/** Request bodies are loose: anything unrecognised is treated as the default, a peer. */
export function parseContactType(v: unknown): ContactType {
  return (CONTACT_TYPES as readonly unknown[]).includes(v) ? (v as ContactType) : "peer";
}

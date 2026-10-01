import { describe, it, expect } from "vitest";
import { timingPlan } from "../logic";

/* Works back from the student's own dates: outreach ~6 weeks before the deadline,
   the referral ask 1–2 weeks before, the application on opening day. */
const w = { company: "Stripe", role: "SWE Intern", opens: "2026-10-01", deadline: "2026-11-30" };

describe("timingPlan", () => {
  it("has nothing to say without dates", () => {
    expect(timingPlan({ company: "Stripe", role: "SWE Intern" }, "2026-10-10")).toBeNull();
  });

  it("before anything is due, names the first step coming", () => {
    const s = timingPlan(w, "2026-09-01")!;
    expect(s).toMatchObject({ kind: "apply", date: "2026-10-01", due: false });
    expect(timingPlan({ ...w, opens: undefined }, "2026-09-01")).toMatchObject({ kind: "outreach", date: "2026-10-19", due: false });
  });

  it("inside the ask window, the referral ask is due", () => {
    expect(timingPlan(w, "2026-11-18")).toMatchObject({ kind: "ask", due: true, date: "2026-11-16" });
  });

  it("in the last three days, only the application matters", () => {
    expect(timingPlan(w, "2026-11-28")).toMatchObject({ kind: "apply", due: true });
  });

  it("goes quiet once the deadline has passed", () => {
    expect(timingPlan(w, "2026-12-01")).toBeNull();
  });
});

import type { Metadata } from "next";
import { LANDING_HTML } from "@/components/landing/markup";
import { LandingRuntime } from "@/components/landing/landing-runtime";
import "./landing.css";

/**
 * PathFinder landing: a first-person Alpine walk scrubbed by scroll, the summit
 * turning into an ASCII outline behind the headline, then the six-stage route in 3D.
 * Built as a static prototype in cinematic/site; the markup is rendered here and
 * enhanced by the runtime, which owns every listener and cleans up on unmount.
 */
export const metadata: Metadata = {
  title: "PathFinder · Find your way up",
  description:
    "PathFinder turns your internship search into a route: six stages, one next step at a time, with the most weight on referrals and interview practice.",
  openGraph: {
    title: "PathFinder · Find your way up",
    description: "Your internship search, as a route. Six stages, one next step at a time.",
    type: "website",
    images: ["/landing/hero-end.jpg"],
  },
};

export default function Landing() {
  return (
    <>
      <div className="cine" id="cine" dangerouslySetInnerHTML={{ __html: LANDING_HTML }} />
      <LandingRuntime />
    </>
  );
}

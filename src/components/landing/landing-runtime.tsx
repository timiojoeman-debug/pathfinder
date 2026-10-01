"use client";

import { useEffect } from "react";
import { initLanding } from "./runtime.js";

/** Runs the landing's runtime over the server-rendered markup in `#cine`, and tears it down on unmount. */
export function LandingRuntime() {
  useEffect(() => {
    const root = document.getElementById("cine");
    return root ? initLanding(root) : undefined;
  }, []);
  return null;
}

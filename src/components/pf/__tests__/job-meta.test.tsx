import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobMeta } from "../job-meta";

const NOW = Date.parse("2026-10-10T12:00:00Z");

describe("JobMeta", () => {
  it("shows location, source and the age", () => {
    render(<JobMeta meta="London, UK · Monzo careers" postedAt="2026-10-05T12:00:00Z" now={NOW} />);
    expect(screen.getByText("London, UK · Monzo careers · posted 5 days ago")).toBeInTheDocument();
  });

  it("omits the age when the posting date is unknown", () => {
    render(<JobMeta meta="Edinburgh · via vanshb03" now={NOW} />);
    expect(screen.getByText("Edinburgh · via vanshb03")).toBeInTheDocument();
    expect(screen.queryByText(/posted/)).toBeNull();
  });
});

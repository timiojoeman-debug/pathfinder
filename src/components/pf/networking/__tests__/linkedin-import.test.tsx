import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/pf/use-ai", () => ({
  useAiTask: () => ({ data: null, loading: false, error: null, needsAuth: false, run: vi.fn(), reset: vi.fn() }),
}));

import { ContactsBoard } from "../contacts-board";
import { usePfStore } from "@/lib/pf/store";

const PRISTINE = usePfStore.getState();
const s = () => usePfStore.getState();

const CSV = `First Name,Last Name,URL,Email Address,Company,Position,Connected On
Alex,Example,https://x.test/a,a@x.test,Acme,Analyst,01 Sep 2026
Sam,Placeholder,https://x.test/s,,Widgets,Lead,15 Aug 2026
Jo,Sample,https://x.test/j,,Globex,Engineer,02 Jul 2026
`;

const csvFile = (text: string) => ({ name: "Connections.csv", text: () => Promise.resolve(text) }) as unknown as File;

function load(text: string) {
  render(<ContactsBoard />);
  fireEvent.click(screen.getByRole("button", { name: "Import from LinkedIn" }));
  fireEvent.change(screen.getByLabelText("LinkedIn Connections.csv"), { target: { files: [csvFile(text)] } });
}

beforeEach(() => {
  usePfStore.setState(PRISTINE, true);
  localStorage.clear();
});

describe("LinkedIn import", () => {
  it("states the privacy promise and shows rows unticked", async () => {
    load(CSV);
    expect(screen.getByText(/never leaves your browser/)).toBeInTheDocument();
    await screen.findByText("Alex Example");
    for (const n of ["Alex Example", "Sam Placeholder", "Jo Sample"]) {
      expect(screen.getByLabelText(`Import ${n}`)).not.toBeChecked();
    }
    expect(s().contacts).toHaveLength(0);
  });

  it("creates contacts only for ticked rows, as linkedin with role = position", async () => {
    load(CSV);
    await screen.findByText("Alex Example");
    fireEvent.click(screen.getByLabelText("Import Sam Placeholder"));
    fireEvent.click(screen.getByRole("button", { name: "Add 1 contact" }));
    expect(s().contacts).toHaveLength(1);
    expect(s().contacts[0]).toMatchObject({ name: "Sam Placeholder", company: "Widgets", role: "Lead", howWeMet: "linkedin" });
    expect(screen.getByRole("status")).toHaveTextContent("Added 1, skipped 0 already on your board.");
  });

  it("select-all ticks everything, and duplicates are skipped and counted", async () => {
    s().addContact({ name: "alex example", company: "ACME", howWeMet: "event" });
    load(CSV);
    await screen.findByText("Alex Example");
    fireEvent.click(screen.getByLabelText(/Select all/));
    fireEvent.click(screen.getByRole("button", { name: "Add 3 contacts" }));
    expect(s().contacts).toHaveLength(3);
    expect(screen.getByRole("status")).toHaveTextContent("Added 2, skipped 1 already on your board.");
  });

  it("shows the parser's error for a file that is not Connections.csv", async () => {
    load("a,b\n1,2\n");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Connections\.csv/));
    expect(screen.queryByText(/Select all/)).toBeNull();
  });

  it("importing 200 rows is one store write, and select-all stops at 200", async () => {
    const big = "First Name,Last Name,Company,Position\n" + Array.from({ length: 250 }, (_, i) => `P${i},Person,Co${i},Role`).join("\n");
    load(big);
    await screen.findByText("P0 Person");
    expect(screen.getByText(/You can import up to 200 more/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Select all/));
    const writes = vi.fn();
    const unsub = usePfStore.subscribe(writes);
    fireEvent.click(screen.getByRole("button", { name: "Add 200 contacts" }));
    unsub();
    expect(writes).toHaveBeenCalledTimes(1);
    expect(s().contacts).toHaveLength(200);
  });

  it("limits the allowance to what is left of the 500-contact board", async () => {
    usePfStore.setState({
      contacts: Array.from({ length: 450 }, (_, i) => ({ id: `x${i}`, name: `Old ${i}`, company: "Z", howWeMet: "other" as const, stage: "researched" as const, notes: "", createdAt: 1, updatedAt: Date.now() })),
    });
    load(CSV);
    await screen.findByText("Alex Example");
    expect(screen.getByText(/You can import up to 50 more/)).toBeInTheDocument();
    const rows = Array.from({ length: 60 }, (_, i) => `N${i},X,C${i},R`).join("\n");
    fireEvent.change(screen.getByLabelText("LinkedIn Connections.csv"), { target: { files: [csvFile("First Name,Last Name,Company,Position\n" + rows)] } });
    await screen.findByText("N0 X");
    fireEvent.click(screen.getByLabelText(/Select all/));
    fireEvent.click(screen.getByRole("button", { name: "Add 50 contacts" }));
    expect(s().contacts).toHaveLength(500);
  }, 30000);

  it("says how many rows were left out for having no name", async () => {
    load(CSV + ",,,,,,\n,,,x,Nameless Ltd,Intern,\n");
    await screen.findByText("Alex Example");
    expect(screen.getByText(/1 row was left out for having no name/)).toBeInTheDocument();
  });

  it("asks for the original export when the file was re-saved with semicolons", async () => {
    load("First Name;Last Name;Company;Position\nA;B;C;D\n");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/re-saved.*original/));
  });

  it("always renders the status region, links the toggle to its panel, and hints on the disabled button", async () => {
    load(CSV);
    expect(screen.getByRole("status")).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Import from LinkedIn" });
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)).not.toBeNull();
    await screen.findByText("Alex Example");
    expect(screen.getByRole("button", { name: "Add 0 contacts" })).toBeDisabled();
    expect(screen.getByText("Tick at least one person to add them.")).toBeInTheDocument();
  });
});


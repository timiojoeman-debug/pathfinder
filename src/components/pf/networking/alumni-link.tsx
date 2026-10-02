import { alumniSearchUrl } from "@/lib/pf/contacts";

/** "Find alumni at {company}": opens a LinkedIn people search in a new tab. No fetching. */
export function AlumniLink({ company, university }: { company: string; university?: string }) {
  const href = alumniSearchUrl(company, university);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 14, fontSize: 12.5, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>
      Find alumni at {company.trim()} ↗
    </a>
  );
}

import { NextResponse } from "next/server";

type SearchBody = {
  location?: string;
  roleType?: string;
  industry?: string;
  workMode?: string;
  companySize?: string;
  cvSummary?: string;
};

type JobListing = {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: string;
  source: string;
  description: string;
  url: string;
  matchScore: number;
  atsKeywords: string[];
};

function computeMatchScore(cv: string, jobDescription: string): { score: number; keywords: string[] } {
  const normalizedCv = cv.toLowerCase();
  const normalizedDesc = jobDescription.toLowerCase();

  const keywordCandidates = [
    "react",
    "node",
    "typescript",
    "python",
    "java",
    "sql",
    "aws",
    "gcp",
    "docker",
    "kubernetes",
    "api",
    "microservices",
    "tailwind",
    "postgresql",
  ];

  const keywords: string[] = [];
  let hits = 0;

  for (const kw of keywordCandidates) {
    if (normalizedDesc.includes(kw)) {
      keywords.push(kw);
      if (normalizedCv.includes(kw)) {
        hits += 1;
      }
    }
  }

  const score = keywords.length ? Math.round((hits / keywords.length) * 100) : 40;

  const importantKeywords = keywords.slice(0, 5);

  return { score, keywords: importantKeywords };
}

export async function POST(req: Request) {
  const body = (await req.json()) as SearchBody;

  const cvSummary = body.cvSummary ?? "";

  const seedJobs: Omit<JobListing, "matchScore" | "atsKeywords">[] = [
    {
      id: "adzuna-1",
      title: "Software Engineering Intern",
      company: "NovaTech Labs",
      location: body.location || "Remote",
      workMode: body.workMode || "Remote",
      source: "Adzuna",
      description:
        "Work with React, Node.js and PostgreSQL to build internal tools. Collaborate with senior engineers, write unit tests, and ship features every week.",
      url: "https://example.com/jobs/novatech-intern",
    },
    {
      id: "jsearch-1",
      title: "Full‑Stack Developer Intern",
      company: "ScaleUp Systems",
      location: body.location || "Hybrid - London",
      workMode: body.workMode || "Hybrid",
      source: "JSearch",
      description:
        "Internship focused on TypeScript, Next.js, TailwindCSS and REST APIs. Help design microservices and improve deployment pipelines.",
      url: "https://example.com/jobs/scaleup-intern",
    },
    {
      id: "greenhouse-1",
      title: "Backend Engineering Intern",
      company: "CloudFleet",
      location: body.location || "Onsite - Dublin",
      workMode: body.workMode || "Onsite",
      source: "Greenhouse",
      description:
        "Help design and build scalable Node.js services on AWS. Work with SQL databases, queues and monitoring dashboards.",
      url: "https://example.com/jobs/cloudfleet-intern",
    },
  ];

  const jobs: JobListing[] = seedJobs.map((job) => {
    const { score, keywords } = computeMatchScore(cvSummary, job.description);
    return {
      ...job,
      matchScore: score,
      atsKeywords: keywords,
    };
  });

  return NextResponse.json({
    jobs,
    meta: {
      note:
        "In a production deployment this endpoint would call APIs like Adzuna, JSearch, Greenhouse and Lever using their official SDKs or REST APIs. For the hackathon demo we return curated mock listings with deterministic compatibility scores.",
    },
  });
}


// Industries for Phase 1
export const INDUSTRIES = [
  "Fintech",
  "Healthtech",
  "AI / Machine Learning",
  "EdTech",
  "E-commerce",
  "Cybersecurity",
  "Gaming",
  "SaaS",
  "Climate / Green Tech",
  "Enterprise Software",
  "Media & Entertainment",
  "Other",
] as const;

// Countries for Phase 1 (location - start with country)
export const COUNTRIES = [
  "United Kingdom",
  "United States",
  "Canada",
  "Germany",
  "France",
  "Netherlands",
  "Ireland",
  "Switzerland",
  "Singapore",
  "Australia",
  "Remote (Any)",
  "Other",
] as const;

// Major cities by country (for location dropdown - specify down to city)
export const CITIES_BY_COUNTRY: Record<string, readonly string[]> = {
  "United Kingdom": ["London", "Edinburgh", "Manchester", "Bristol", "Birmingham", "Leeds", "Cambridge", "Oxford", "Glasgow", "Other"] as const,
  "United States": ["New York", "San Francisco", "Seattle", "Boston", "Austin", "Los Angeles", "Chicago", "Denver", "Remote", "Other"] as const,
  "Canada": ["Toronto", "Vancouver", "Montreal", "Waterloo", "Ottawa", "Calgary", "Remote", "Other"] as const,
  "Germany": ["Berlin", "Munich", "Hamburg", "Frankfurt", "Remote", "Other"] as const,
  "France": ["Paris", "Lyon", "Toulouse", "Remote", "Other"] as const,
  "Netherlands": ["Amsterdam", "Rotterdam", "Utrecht", "Remote", "Other"] as const,
  "Ireland": ["Dublin", "Cork", "Galway", "Remote", "Other"] as const,
  "Switzerland": ["Zurich", "Geneva", "Lausanne", "Remote", "Other"] as const,
  "Singapore": ["Singapore", "Remote", "Other"] as const,
  "Australia": ["Sydney", "Melbourne", "Brisbane", "Remote", "Other"] as const,
  "Remote (Any)": ["Remote"] as const,
  "Other": ["Other"] as const,
};

// Target roles for Phase 1
export const TARGET_ROLES = [
  "Software Engineering Intern",
  "Backend Engineering Intern",
  "Frontend Engineering Intern",
  "Full-Stack Engineering Intern",
  "Machine Learning Intern",
  "Data Science Intern",
  "Data Engineering Intern",
  "DevOps / SRE Intern",
  "Mobile Development Intern (iOS/Android)",
  "Product Management Intern",
  "UX/UI Design Intern",
  "Security Engineering Intern",
  "Cloud Engineering Intern",
] as const;

// Tech stack options for multi-select (Phase 1)
export const TECH_STACK_OPTIONS = [
  "React",
  "TypeScript",
  "JavaScript",
  "Python",
  "Java",
  "Go",
  "Rust",
  "C++",
  "C#",
  ".NET",
  "Node.js",
  "Swift",
  "Kotlin",
  "Flutter",
  "React Native",
  "AWS",
  "Docker",
  "Kubernetes",
  "PostgreSQL",
  "MongoDB",
  "TensorFlow",
  "PyTorch",
  "Scikit-learn",
  "Pandas",
] as const;

// STAR tutorial links
export const STAR_TUTORIAL_LINKS = [
  { label: "Indeed: STAR Method", url: "https://www.indeed.com/career-advice/interviewing/how-to-use-the-star-interview-technique" },
  { label: "Harvard: Behavioral Interviews", url: "https://hwpi.harvard.edu/files/ocs/files/behavioral-interviewing.pdf" },
  { label: "The Muse: STAR Examples", url: "https://www.themuse.com/advice/star-interview-method" },
];

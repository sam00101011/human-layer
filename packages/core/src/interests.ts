import { type InterestTag } from "./types";

export type InterestGroupDefinition = {
  id: string;
  label: string;
  description: string;
  tags: InterestTag[];
};

export const INTEREST_TAG_LABELS: Record<InterestTag, string> = {
  ai: "AI",
  agents: "Agents",
  crypto: "Crypto",
  devtools: "Devtools",
  research: "Research",
  oss: "Open source",
  security: "Security",
  design: "Design",
  startups: "Startups",
  markets: "Markets",
  governance: "Governance",
  infra: "Infrastructure",
  llms: "LLMs",
  ml: "ML",
  data: "Data",
  analytics: "Analytics",
  automation: "Automation",
  robotics: "Robotics",
  bio: "Bio",
  apis: "APIs",
  backend: "Backend",
  frontend: "Frontend",
  fullstack: "Full-stack",
  mobile: "Mobile",
  cloud: "Cloud",
  databases: "Databases",
  observability: "Observability",
  privacy: "Privacy",
  ux: "UX",
  product: "Product",
  creator_tools: "Creator tools",
  saas: "SaaS",
  enterprise: "Enterprise",
  growth: "Growth",
  ads: "Ads",
  seo: "SEO",
  sales: "Sales",
  marketplaces: "Marketplaces",
  ecommerce: "E-commerce",
  communities: "Communities",
  media: "Media",
  education: "Education",
  fintech: "Fintech",
  defi: "DeFi",
  trading: "Trading",
  gaming: "Gaming"
};

export const INTEREST_GROUPS: InterestGroupDefinition[] = [
  {
    id: "ai-frontier",
    label: "AI and research",
    description: "Frontier models, automation, data, and scientific work.",
    tags: ["ai", "agents", "llms", "ml", "data", "analytics", "automation", "research", "robotics", "bio"]
  },
  {
    id: "build-ship",
    label: "Build and ship",
    description: "Product engineering, APIs, infrastructure, and open source.",
    tags: [
      "devtools",
      "apis",
      "backend",
      "frontend",
      "fullstack",
      "mobile",
      "cloud",
      "infra",
      "databases",
      "observability",
      "oss",
      "security",
      "privacy"
    ]
  },
  {
    id: "product-experience",
    label: "Product and experience",
    description: "How things feel, look, and fit into people’s workflows.",
    tags: ["design", "ux", "product", "creator_tools", "gaming"]
  },
  {
    id: "growth-business",
    label: "Growth and business",
    description: "Audience building, GTM, and commercial surfaces.",
    tags: [
      "startups",
      "saas",
      "enterprise",
      "growth",
      "ads",
      "seo",
      "sales",
      "marketplaces",
      "ecommerce",
      "communities",
      "media",
      "education"
    ]
  },
  {
    id: "finance-coordination",
    label: "Finance and coordination",
    description: "Money rails, incentive systems, and market structure.",
    tags: ["crypto", "defi", "fintech", "trading", "markets", "governance"]
  }
];

export const STARTER_INTEREST_TAGS: InterestTag[] = [
  "devtools",
  "ai",
  "product",
  "growth",
  "security",
  "infra",
  "startups",
  "design",
  "research",
  "marketplaces"
];

const INTEREST_RELATIONSHIPS: Partial<Record<InterestTag, InterestTag[]>> = {
  ai: ["agents", "llms", "ml", "automation", "research"],
  agents: ["ai", "automation", "llms", "apis", "devtools"],
  crypto: ["defi", "fintech", "markets", "governance", "security"],
  devtools: ["apis", "backend", "frontend", "fullstack", "oss"],
  research: ["ai", "ml", "data", "bio", "security"],
  oss: ["devtools", "infra", "security", "fullstack", "research"],
  security: ["privacy", "infra", "cloud", "backend", "enterprise"],
  design: ["ux", "product", "frontend", "creator_tools", "growth"],
  startups: ["saas", "growth", "sales", "product", "marketplaces"],
  markets: ["trading", "fintech", "growth", "analytics", "ecommerce"],
  governance: ["crypto", "communities", "privacy", "enterprise", "defi"],
  infra: ["cloud", "backend", "security", "observability", "devtools"],
  llms: ["ai", "agents", "ml", "research", "product"],
  ml: ["ai", "llms", "data", "analytics", "research"],
  data: ["analytics", "ml", "databases", "research", "ai"],
  analytics: ["data", "growth", "ads", "product", "markets"],
  automation: ["agents", "apis", "devtools", "growth", "backend"],
  robotics: ["ai", "ml", "infra", "research", "product"],
  bio: ["research", "ai", "data", "analytics", "education"],
  apis: ["backend", "devtools", "automation", "fullstack", "cloud"],
  backend: ["apis", "databases", "cloud", "infra", "security"],
  frontend: ["design", "ux", "product", "fullstack", "mobile"],
  fullstack: ["frontend", "backend", "devtools", "apis", "cloud"],
  mobile: ["product", "design", "frontend", "growth", "gaming"],
  cloud: ["infra", "backend", "databases", "observability", "security"],
  databases: ["backend", "cloud", "data", "analytics", "infra"],
  observability: ["infra", "cloud", "security", "backend", "devtools"],
  privacy: ["security", "governance", "fintech", "communities", "enterprise"],
  ux: ["design", "product", "frontend", "mobile", "communities"],
  product: ["design", "ux", "growth", "saas", "startups"],
  creator_tools: ["design", "media", "communities", "product", "growth"],
  saas: ["startups", "product", "growth", "enterprise", "sales"],
  enterprise: ["saas", "security", "governance", "sales", "cloud"],
  growth: ["ads", "seo", "sales", "startups", "analytics"],
  ads: ["growth", "analytics", "marketplaces", "ecommerce", "media"],
  seo: ["growth", "media", "education", "ecommerce", "product"],
  sales: ["growth", "enterprise", "saas", "fintech", "marketplaces"],
  marketplaces: ["ecommerce", "growth", "startups", "ads", "sales"],
  ecommerce: ["marketplaces", "growth", "ads", "fintech", "media"],
  communities: ["creator_tools", "media", "education", "governance", "product"],
  media: ["creator_tools", "communities", "growth", "ads", "education"],
  education: ["research", "communities", "media", "product", "bio"],
  fintech: ["markets", "trading", "crypto", "enterprise", "defi"],
  defi: ["crypto", "fintech", "trading", "governance", "security"],
  trading: ["markets", "fintech", "crypto", "analytics", "data"],
  gaming: ["design", "creator_tools", "communities", "mobile", "product"]
};

const GROUP_BY_TAG = new Map(
  INTEREST_GROUPS.flatMap((group) => group.tags.map((tag) => [tag, group] as const))
);

function addScore(scores: Map<InterestTag, number>, tag: InterestTag, score: number) {
  scores.set(tag, (scores.get(tag) ?? 0) + score);
}

export function getInterestTagLabel(tag: InterestTag): string {
  return INTEREST_TAG_LABELS[tag];
}

export function getRelatedInterestTags(
  selectedTags: readonly InterestTag[],
  limit = 8
): InterestTag[] {
  const uniqueSelectedTags = [...new Set(selectedTags)];
  if (uniqueSelectedTags.length === 0) {
    return STARTER_INTEREST_TAGS.slice(0, limit);
  }

  const scores = new Map<InterestTag, number>();

  for (const selectedTag of uniqueSelectedTags) {
    for (const relatedTag of INTEREST_RELATIONSHIPS[selectedTag] ?? []) {
      addScore(scores, relatedTag, 4);
    }

    const group = GROUP_BY_TAG.get(selectedTag);
    if (group) {
      for (const groupTag of group.tags) {
        if (groupTag !== selectedTag) {
          addScore(scores, groupTag, 1);
        }
      }
    }
  }

  return [...scores.entries()]
    .filter(([tag]) => !uniqueSelectedTags.includes(tag))
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return getInterestTagLabel(a[0]).localeCompare(getInterestTagLabel(b[0]));
    })
    .slice(0, limit)
    .map(([tag]) => tag);
}

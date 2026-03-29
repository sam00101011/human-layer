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
  gaming: "Gaming",
  climate: "Climate",
  energy: "Energy",
  health: "Health",
  fitness: "Fitness",
  food: "Food",
  travel: "Travel",
  fashion: "Fashion",
  beauty: "Beauty",
  sports: "Sports",
  music: "Music",
  film: "Film",
  books: "Books",
  art: "Art",
  photography: "Photography",
  parenting: "Parenting",
  lifestyle: "Lifestyle",
  politics: "Politics",
  economics: "Economics",
  history: "History",
  law: "Law",
  psychology: "Psychology"
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
  },
  {
    id: "culture-lifestyle",
    label: "Culture and lifestyle",
    description: "Creative work, taste, leisure, and the things people choose to spend time on.",
    tags: [
      "art",
      "music",
      "film",
      "books",
      "photography",
      "fashion",
      "beauty",
      "food",
      "travel",
      "lifestyle",
      "creator_tools",
      "media"
    ]
  },
  {
    id: "wellness-family",
    label: "Health and daily life",
    description: "Wellbeing, family, mental models, and life decisions beyond work.",
    tags: ["health", "fitness", "psychology", "parenting", "education", "sports"]
  },
  {
    id: "public-life",
    label: "Society and public life",
    description: "How people coordinate around institutions, policy, history, and the physical world.",
    tags: ["climate", "energy", "politics", "economics", "history", "law", "governance", "communities"]
  }
];

export const STARTER_INTEREST_TAGS: InterestTag[] = [
  "devtools",
  "ai",
  "product",
  "growth",
  "design",
  "research",
  "marketplaces",
  "health",
  "music",
  "travel",
  "sports",
  "politics"
];

export const FEATURED_TOPIC_TAGS: InterestTag[] = [
  "ai",
  "devtools",
  "growth",
  "security",
  "design",
  "infra"
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
  gaming: ["design", "creator_tools", "communities", "mobile", "product"],
  climate: ["energy", "politics", "economics", "research", "communities"],
  energy: ["climate", "infra", "markets", "politics", "economics"],
  health: ["fitness", "psychology", "bio", "education", "food"],
  fitness: ["health", "sports", "lifestyle", "food", "psychology"],
  food: ["health", "travel", "lifestyle", "media", "communities"],
  travel: ["food", "media", "lifestyle", "photography", "communities"],
  fashion: ["beauty", "art", "creator_tools", "media", "lifestyle"],
  beauty: ["fashion", "lifestyle", "creator_tools", "media", "health"],
  sports: ["fitness", "media", "communities", "health", "gaming"],
  music: ["art", "media", "creator_tools", "communities", "film"],
  film: ["music", "media", "art", "books", "creator_tools"],
  books: ["film", "art", "education", "history", "psychology"],
  art: ["music", "film", "design", "photography", "fashion"],
  photography: ["art", "travel", "creator_tools", "media", "design"],
  parenting: ["health", "psychology", "education", "lifestyle", "communities"],
  lifestyle: ["travel", "food", "beauty", "fashion", "fitness"],
  politics: ["economics", "history", "law", "governance", "climate"],
  economics: ["politics", "markets", "fintech", "history", "law"],
  history: ["politics", "books", "education", "law", "economics"],
  law: ["politics", "economics", "privacy", "governance", "history"],
  psychology: ["health", "parenting", "education", "product", "fitness"]
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

export function getInterestGroupForTag(tag: InterestTag): InterestGroupDefinition | null {
  return GROUP_BY_TAG.get(tag) ?? null;
}

export function getInterestTagDescription(tag: InterestTag): string {
  const group = getInterestGroupForTag(tag);
  const related = getRelatedInterestTags([tag], 3).map((relatedTag) => getInterestTagLabel(relatedTag));

  if (!group) {
    return `Verified-human pages, people, and takes around ${getInterestTagLabel(tag)}.`;
  }

  const relatedText =
    related.length > 0 ? ` Nearby interests include ${related.join(", ")}.` : "";

  return `Part of ${group.label.toLowerCase()}, with pages, contributors, and takes clustered around ${getInterestTagLabel(tag)}.${relatedText}`;
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

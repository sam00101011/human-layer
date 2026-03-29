export type IntegrationRequestStatus = "requested" | "reviewing" | "building" | "live";

export type IntegrationRequest = {
  name: string;
  type: string;
  status: IntegrationRequestStatus;
  note: string;
  value: string;
};

export const integrationRequestStatusCopy: Record<
  IntegrationRequestStatus,
  { label: string; description: string }
> = {
  requested: {
    label: "Requested",
    description: "Publicly requested and waiting for product review."
  },
  reviewing: {
    label: "Reviewing",
    description: "We are checking URL shape, value-add, and extension fit."
  },
  building: {
    label: "Building",
    description: "Actively being implemented or polished for rollout."
  },
  live: {
    label: "Live",
    description: "Already supported in Human Layer."
  }
};

export const integrationRequests: IntegrationRequest[] = [
  {
    name: "VS Code Marketplace",
    type: "Plugin marketplace",
    status: "live",
    note: "Workflow-signal framing is already live for extension pages.",
    value: "Worth installing, compatibility notes, and daily-use trust."
  },
  {
    name: "YouTube",
    type: "Media pages",
    status: "live",
    note: "Time-worth signal and timestamped takes are already wired in.",
    value: "Save people time before they commit to a 20-minute watch."
  },
  {
    name: "Spotify podcasts",
    type: "Media pages",
    status: "building",
    note: "Core support is in; packaging and field feedback still matter.",
    value: "Episode-level highlights, best segments, and taste graph overlap."
  },
  {
    name: "Raycast Extensions",
    type: "Plugin marketplace",
    status: "reviewing",
    note: "A strong fit for install trust, maintenance signal, and daily-use proof.",
    value: "Help people separate daily-driver extensions from novelty."
  },
  {
    name: "Stripe Docs",
    type: "Docs surface",
    status: "reviewing",
    note: "Good candidate for stale-warning and implementation-note overlays.",
    value: "Point people to the page that actually matters."
  },
  {
    name: "JetBrains Plugins",
    type: "Plugin marketplace",
    status: "requested",
    note: "Good marketplace fit with install trust and maintenance-risk context.",
    value: "Surface which plugins are worth paying attention to in real teams."
  },
  {
    name: "Terraform Registry",
    type: "Infra registry",
    status: "requested",
    note: "Would benefit from deployment gotchas and safe-to-use human context.",
    value: "Add operational reality to modules and providers."
  },
  {
    name: "Papers with Code",
    type: "Research surface",
    status: "requested",
    note: "Strong fit for practical-value and benchmark-skepticism takes.",
    value: "Translate research pages into deployment or reading decisions."
  }
];

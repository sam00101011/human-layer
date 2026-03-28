import type { ContributorReputation, ContributorReputationMetrics } from "./types";

function buildEvidence(metrics: ContributorReputationMetrics) {
  const evidence: string[] = [];

  if (metrics.helpfulVoteCount > 0) {
    evidence.push("Helpful feedback is landing on public takes.");
  }

  if (metrics.distinctPageCount >= 2) {
    evidence.push("Signal spans more than one page instead of a single hit.");
  }

  if (metrics.verdictCount >= 2) {
    evidence.push("This profile also leaves repeated verdict signal.");
  }

  if (metrics.followerCount > 0) {
    evidence.push("Other people have decided this profile is worth following.");
  }

  if (evidence.length === 0) {
    evidence.push("Public signal is still early, so read the contribution history directly.");
  }

  return evidence;
}

export function summarizeContributorReputation(
  metrics: ContributorReputationMetrics
): ContributorReputation {
  const evidence = buildEvidence(metrics);

  if (metrics.publicTakeCount >= 4 && metrics.helpfulVoteCount >= 3) {
    return {
      level: "consistently_useful",
      label: "Consistently useful",
      description: "Helpful feedback keeps showing up across this contributor's public takes.",
      evidence
    };
  }

  if (
    metrics.publicTakeCount >= 2 &&
    (metrics.distinctPageCount >= 2 || metrics.verdictCount >= 2 || metrics.helpfulVoteCount >= 1)
  ) {
    return {
      level: "steady_contributor",
      label: "Steady contributor",
      description: "This profile shows up repeatedly with public signal, not just a one-off appearance.",
      evidence
    };
  }

  if (metrics.helpfulVoteCount >= 1 || metrics.followerCount >= 1) {
    return {
      level: "emerging_signal",
      label: "Emerging signal",
      description: "Early public feedback suggests this contributor is worth paying attention to.",
      evidence
    };
  }

  return {
    level: "new_voice",
    label: "New voice",
    description: "Signal is still early, so the best way to evaluate this contributor is by reading their visible history.",
    evidence
  };
}

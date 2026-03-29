import type { ContributorReputation, TopHumanTake } from "./types";

function getReputationWeight(level: ContributorReputation["level"] | undefined) {
  if (level === "consistently_useful") return 8;
  if (level === "steady_contributor") return 5;
  if (level === "emerging_signal") return 2;
  return 0;
}

function getFreshnessWeight(createdAt: string) {
  const ageHours = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60));

  if (ageHours <= 24) return 4;
  if (ageHours <= 72) return 2;
  if (ageHours <= 7 * 24) return 1;
  return 0;
}

export function rankHumanTake(comment: NonNullable<TopHumanTake>): number {
  return (
    comment.helpfulCount * 10 +
    getReputationWeight(comment.reputation?.level) +
    getFreshnessWeight(comment.createdAt)
  );
}

export function sortHumanTakes<T extends NonNullable<TopHumanTake>>(comments: T[]): T[] {
  return [...comments].sort((left, right) => {
    const scoreDelta = rankHumanTake(right) - rankHumanTake(left);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    if (right.helpfulCount !== left.helpfulCount) {
      return right.helpfulCount - left.helpfulCount;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export function explainHumanTakeRecommendation(
  comment: NonNullable<TopHumanTake>,
  comments: Array<NonNullable<TopHumanTake>>
): string[] {
  const reasons: string[] = [];
  const maxHelpfulCount = comments.reduce(
    (max, current) => Math.max(max, current.helpfulCount),
    0
  );

  if (comment.helpfulCount > 0 && comment.helpfulCount === maxHelpfulCount) {
    reasons.push("Most helpful so far");
  } else if (comment.helpfulCount > 0) {
    reasons.push(`Helpful ${comment.helpfulCount}`);
  }

  if (comment.reputation?.level === "consistently_useful") {
    reasons.push("Consistently useful contributor");
  } else if (comment.reputation?.level === "steady_contributor") {
    reasons.push("Steady contributor");
  } else if (comment.reputation?.level === "emerging_signal") {
    reasons.push("Emerging signal");
  }

  if (getFreshnessWeight(comment.createdAt) >= 2) {
    reasons.push("Fresh verified signal");
  }

  if (reasons.length === 0 && comments.length <= 2) {
    reasons.push("Early verified signal");
  }

  if (reasons.length === 0) {
    reasons.push("Recent verified take");
  }

  return [...new Set(reasons)].slice(0, 3);
}

export function pickTopHumanTake(
  comments: Array<NonNullable<TopHumanTake>>
): TopHumanTake {
  if (comments.length === 0) return null;

  return sortHumanTakes(comments)[0];
}

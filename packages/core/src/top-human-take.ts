import type { TopHumanTake } from "./types";

export function pickTopHumanTake(
  comments: Array<NonNullable<TopHumanTake>>
): TopHumanTake {
  if (comments.length === 0) return null;

  return [...comments].sort((left, right) => {
    if (right.helpfulCount !== left.helpfulCount) {
      return right.helpfulCount - left.helpfulCount;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  })[0];
}

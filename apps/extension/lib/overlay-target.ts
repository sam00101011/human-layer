import { isPhase0EnabledPageKind, normalizeUrl } from "@human-layer/core";

export function getOverlayTarget(rawUrl: string) {
  const candidate = normalizeUrl(rawUrl);
  if (!candidate) return null;
  if (candidate.requiresExistingPage) return null;
  if (!isPhase0EnabledPageKind(candidate.pageKind)) return null;
  return candidate;
}

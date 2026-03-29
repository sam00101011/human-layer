import type { PageKind, PageSummary } from "./types";

export const SPOTIFY_PAGE_KINDS = [
  "spotify_track",
  "spotify_album",
  "spotify_playlist",
  "spotify_episode",
  "spotify_show"
] as const satisfies readonly PageKind[];

export function isSpotifyPageKind(pageKind: PageKind): boolean {
  return SPOTIFY_PAGE_KINDS.includes(pageKind as (typeof SPOTIFY_PAGE_KINDS)[number]);
}

export function supportsMomentTakes(pageKind: PageKind): boolean {
  return pageKind === "youtube_video" || pageKind === "spotify_episode";
}

export function formatMediaTimestamp(totalSeconds: number): string {
  const normalized = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  const seconds = normalized % 60;

  if (hours > 0) {
    return [hours, minutes.toString().padStart(2, "0"), seconds.toString().padStart(2, "0")].join(":");
  }

  return [minutes, seconds.toString().padStart(2, "0")].join(":");
}

export function parseMediaTimestampInput(rawValue: string): number | null {
  const value = rawValue.trim();
  if (!value) return null;

  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  const parts = value.split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) {
    return null;
  }

  const numbers = parts.map((part) => Number(part));
  if (numbers.some((part) => Number.isNaN(part))) {
    return null;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = numbers;
    if (seconds >= 60) return null;
    return minutes * 60 + seconds;
  }

  const [hours, minutes, seconds] = numbers;
  if (minutes >= 60 || seconds >= 60) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

export function buildMediaMomentUrl(
  page: Pick<PageSummary, "pageKind" | "canonicalUrl">,
  mediaTimestampSeconds: number | null | undefined
): string | null {
  if (mediaTimestampSeconds == null || mediaTimestampSeconds < 0) return null;

  if (page.pageKind === "youtube_video") {
    const separator = page.canonicalUrl.includes("?") ? "&" : "?";
    return `${page.canonicalUrl}${separator}t=${Math.floor(mediaTimestampSeconds)}s`;
  }

  if (page.pageKind === "spotify_episode") {
    const separator = page.canonicalUrl.includes("?") ? "&" : "?";
    return `${page.canonicalUrl}${separator}t=${Math.floor(mediaTimestampSeconds)}`;
  }

  return null;
}

import type { ExtensionDashboardResponse } from "@human-layer/core";
import {
  getBookmarkedPagesForProfile,
  getFollowedTopicsForProfile,
  getNotificationPreferencesForProfile,
  getUnreadNotificationCount,
  hasMutedPageForProfile
} from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest } from "../../../lib/auth";

export async function GET(request: NextRequest) {
  const viewer = await getAuthenticatedProfileFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const pageId = request.nextUrl.searchParams.get("pageId")?.trim() ?? "";

  const [bookmarks, followedTopics, notificationPreferences, unreadNotificationCount, mutedCurrentPage] =
    await Promise.all([
      getBookmarkedPagesForProfile(viewer.id, 5),
      getFollowedTopicsForProfile(viewer.id),
      getNotificationPreferencesForProfile(viewer.id),
      getUnreadNotificationCount(viewer.id),
      pageId
        ? hasMutedPageForProfile({
            pageId,
            profileId: viewer.id
          })
        : Promise.resolve(false)
    ]);

  const payload: ExtensionDashboardResponse = {
    bookmarks: bookmarks.map((bookmark) => ({
      id: bookmark.id,
      pageKind: bookmark.pageKind,
      canonicalUrl: bookmark.canonicalUrl,
      canonicalKey: bookmark.canonicalKey,
      host: bookmark.host,
      title: bookmark.title,
      savedAt: bookmark.savedAt
    })),
    followedTopics,
    notificationPreferences,
    unreadNotificationCount,
    mutedCurrentPage
  };

  return NextResponse.json(payload);
}

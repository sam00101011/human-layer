import { getProfileSnapshotByHandle } from "@human-layer/db";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ handle: string }> }
) {
  const { handle } = await context.params;
  const profile = await getProfileSnapshotByHandle(handle);

  if (!profile) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

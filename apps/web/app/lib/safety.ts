import { getProfileModerationState } from "@human-layer/db";

export async function assertProfileCanParticipate(profileId: string): Promise<string | null> {
  const state = await getProfileModerationState(profileId);
  if (!state.blocked) {
    return null;
  }

  return "account restricted";
}

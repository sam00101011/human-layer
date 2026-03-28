import type { IDKitResult } from "@worldcoin/idkit";

export type LegacyWorldIdProofPayload = {
  proof: string;
  merkleRoot: string;
  nullifierHash: string;
  signalHash?: string;
};

export function extractLegacyProofPayload(
  result: IDKitResult
): LegacyWorldIdProofPayload {
  if (result.protocol_version !== "3.0") {
    throw new Error("Only legacy World ID proofs are supported in this flow right now.");
  }

  const response = result.responses[0];
  if (!response) {
    throw new Error("World ID did not return a proof response.");
  }

  return {
    proof: response.proof,
    merkleRoot: response.merkle_root,
    nullifierHash: response.nullifier,
    signalHash: response.signal_hash
  };
}

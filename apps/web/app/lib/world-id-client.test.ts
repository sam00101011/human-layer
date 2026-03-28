import { describe, expect, it } from "vitest";

import { extractLegacyProofPayload } from "./world-id-client";

describe("extractLegacyProofPayload", () => {
  it("maps a legacy v3 result into the backend proof payload", () => {
    expect(
      extractLegacyProofPayload({
        protocol_version: "3.0",
        nonce: "nonce-1",
        action: "human-layer-v1",
        responses: [
          {
            identifier: "proof_of_human",
            proof: "proof-1",
            merkle_root: "merkle-root-1",
            nullifier: "nullifier-1",
            signal_hash: "signal-hash-1"
          }
        ],
        environment: "staging"
      })
    ).toEqual({
      proof: "proof-1",
      merkleRoot: "merkle-root-1",
      nullifierHash: "nullifier-1",
      signalHash: "signal-hash-1"
    });
  });

  it("rejects non-legacy result formats for now", () => {
    expect(() =>
      extractLegacyProofPayload({
        protocol_version: "4.0",
        nonce: "nonce-1",
        action: "human-layer-v1",
        responses: [
          {
            identifier: "proof_of_human",
            proof: ["proof"],
            nullifier: "nullifier-1",
            issuer_schema_id: 1,
            expires_at_min: 1
          }
        ],
        environment: "staging"
      })
    ).toThrow("Only legacy World ID proofs are supported in this flow right now.");
  });
});

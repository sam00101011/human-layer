const defaultBaseUrl = "https://human-layer-web.vercel.app";

function normalizeBaseUrl(value) {
  return (value || defaultBaseUrl).replace(/\/$/, "");
}

async function assertOk(url, label) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "human-layer-guardrail/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`${label} returned ${response.status}`);
  }

  return response;
}

async function main() {
  const baseUrl = normalizeBaseUrl(process.env.HL_UPTIME_BASE_URL || process.argv[2]);
  const lookupUrl =
    baseUrl +
    "/api/pages/lookup?url=" +
    encodeURIComponent("https://github.com/vercel/next.js");

  console.log(`Checking Human Layer uptime against ${baseUrl}`);

  await assertOk(baseUrl + "/verify", "verify page");
  const lookupResponse = await assertOk(lookupUrl, "lookup route");
  const lookupPayload = await lookupResponse.json();

  if (!lookupPayload || lookupPayload.supported !== true) {
    throw new Error("lookup route did not return a supported page payload");
  }

  console.log("Guardrail checks passed.");
}

main().catch((error) => {
  console.error(
    "Guardrail check failed:",
    error instanceof Error ? error.message : String(error)
  );
  process.exitCode = 1;
});

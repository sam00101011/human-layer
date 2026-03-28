import { getWorldIdClientConfig } from "../lib/world-id";
import { WorldIdVerifyForm } from "../../components/world-id-verify-form";

export default async function VerifyPage(props: {
  searchParams: Promise<{ handoff?: string; returnUrl?: string }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <main className="page-shell stack">
      <span className="pill">Verification</span>
      <WorldIdVerifyForm
        handoff={searchParams.handoff === "1"}
        returnUrl={searchParams.returnUrl ?? ""}
        worldIdConfig={getWorldIdClientConfig()}
      />
    </main>
  );
}

import { HandoffClient } from "../../../components/handoff-client";

export default async function ExtensionHandoffPage(props: {
  searchParams: Promise<{ returnUrl?: string }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <main className="page-shell">
      <HandoffClient returnUrl={searchParams.returnUrl ?? null} />
    </main>
  );
}

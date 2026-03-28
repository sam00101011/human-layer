import { Suspense } from "react";

import { DevLoginForm } from "../../components/dev-login-form";

export default function DevLoginPage() {
  return (
    <main className="page-shell">
      <Suspense fallback={null}>
        <DevLoginForm />
      </Suspense>
    </main>
  );
}

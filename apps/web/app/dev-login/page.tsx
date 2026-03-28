import { Suspense } from "react";

import { DevLoginForm } from "../../components/dev-login-form";

export default function DevLoginPage() {
  return (
    <div className="page-shell">
      <Suspense fallback={null}>
        <DevLoginForm />
      </Suspense>
    </div>
  );
}

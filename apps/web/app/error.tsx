'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page-shell stack">
      <div className="card stack">
        <h1>Something went wrong</h1>
        <p className="error-message">{error.message || 'An unexpected error occurred.'}</p>
        <button className="button" onClick={reset} type="button">
          Try again
        </button>
      </div>
    </main>
  );
}

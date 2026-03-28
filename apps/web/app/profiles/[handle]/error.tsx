'use client';

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-shell stack">
      <div className="card stack">
        <h1>Could not load this profile</h1>
        <p className="error-message">{error.message || 'Could not load this profile.'}</p>
        <button className="button" onClick={reset} type="button">
          Try again
        </button>
      </div>
    </div>
  );
}

export default function PageLoading() {
  return (
    <main className="page-shell stack">
      <div className="card hero-card stack">
        <div className="skeleton-row">
          <div className="skeleton" style={{ width: '160px', height: '14px' }} />
        </div>
        <div className="skeleton" style={{ width: '280px', height: '32px' }} />
        <div className="skeleton" style={{ width: '400px', height: '16px' }} />
        <div className="metric-grid">
          {[1, 2, 3].map(i => (
            <div className="stat-card" key={i}>
              <div className="skeleton" style={{ width: '40px', height: '24px' }} />
              <div className="skeleton" style={{ width: '80px', height: '14px' }} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

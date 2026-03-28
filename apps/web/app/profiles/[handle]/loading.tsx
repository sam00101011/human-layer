export default function ProfileLoading() {
  return (
    <div className="page-shell stack">
      <div className="card hero-card stack">
        <div className="skeleton-row">
          <div className="skeleton" style={{ width: '120px', height: '14px' }} />
        </div>
        <div className="skeleton" style={{ width: '200px', height: '32px' }} />
        <div className="skeleton" style={{ width: '300px', height: '16px' }} />
        <div className="metric-grid">
          {[1, 2, 3, 4].map(i => (
            <div className="stat-card" key={i}>
              <div className="skeleton" style={{ width: '40px', height: '24px' }} />
              <div className="skeleton" style={{ width: '60px', height: '14px' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

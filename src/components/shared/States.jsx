export function Spinner({ label = 'Loading…' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-dim)', padding: '40px 0', justifyContent: 'center' }}>
      <span style={spinnerDot} />
      <span className="mono" style={{ fontSize: 13 }}>{label}</span>
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-dim)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-faint)', marginBottom: 10 }}>
        NO_SIGNAL
      </div>
      <h3 style={{ fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>{title}</h3>
      {message && <p style={{ maxWidth: 420, margin: '0 auto 20px' }}>{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <p style={{ color: 'var(--led-red)', marginBottom: 16 }}>{message}</p>
      {onRetry && <button className="btn" onClick={onRetry}>Retry</button>}
    </div>
  );
}

const spinnerDot = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: 'var(--signal)',
  boxShadow: '0 0 10px 2px var(--signal-dim)',
  animation: 'pulse 1s ease-in-out infinite',
};

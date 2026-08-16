export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  danger = true,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div style={overlay} onClick={onCancel}>
      <div className="panel" style={box} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>{title}</h3>
        <p style={{ marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
          <button className={danger ? 'btn btn--danger' : 'btn btn--primary'} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(5, 8, 14, 0.7)',
  display: 'grid', placeItems: 'center', zIndex: 1500, padding: 20,
};
const box = { width: '100%', maxWidth: 420, padding: 24 };
